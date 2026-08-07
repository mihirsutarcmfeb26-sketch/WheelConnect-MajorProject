package com.wheelconnect.payment.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wheelconnect.payment.dto.*;
import com.wheelconnect.payment.entity.Payment;
import com.wheelconnect.payment.exception.ResourceNotFoundException;
import com.wheelconnect.payment.repository.PaymentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class PaymentServiceImpl implements PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentServiceImpl.class);
    private static final String RAZORPAY_ORDERS_URL = "https://api.razorpay.com/v1/orders";

    private final PaymentRepository paymentRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${razorpay.key.id:rzp_test_WheelConnect2026Key}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret:WheelConnectRazorpaySecret2026}")
    private String razorpaySecret;

    @Value("${services.booking-service.url:http://localhost:8082}")
    private String bookingServiceUrl;

    @Value("${services.service-center-service.url:http://localhost:8083}")
    private String serviceCenterServiceUrl;

    public PaymentServiceImpl(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
        this.restTemplate = new RestTemplate();
    }

    @Override
    @Transactional
    public CreateOrderResponseDto createOrder(CreateOrderRequestDto dto, Long customerId, String authToken) {
        if (dto.getAmount() == null || dto.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Payment amount must be greater than 0");
        }

        // Check if booking is already paid. findAllByBookingIdAndStatus never throws even
        // if duplicate SUCCESS rows exist historically - it just returns however many there are.
        List<Payment> existingPaid = paymentRepository.findAllByBookingIdAndStatus(dto.getBookingId(), "SUCCESS");
        if (!existingPaid.isEmpty()) {
            throw new IllegalArgumentException("Booking #" + dto.getBookingId() + " has already been paid successfully.");
        }

        // The amount actually charged is ALWAYS computed here from the booking's own
        // Service Package(s) - dto.getAmount() above is validated for shape only (kept so
        // the request payload/DTO contract doesn't change) and is never used as the charge.
        // See resolveAuthoritativeAmount() for exactly how the amount is derived.
        BigDecimal amount = resolveAuthoritativeAmount(dto.getBookingId(), authToken);

        // Create a genuine order via Razorpay's Orders API. The Razorpay Checkout widget
        // validates the order_id against Razorpay's own servers as soon as it opens/on
        // payment - a fabricated order id (not registered with Razorpay) is exactly what
        // causes the widget to show "Oops! Something went wrong. Payment Failed." after
        // the customer pays, since the order it is trying to complete never existed.
        String razorpayOrderId = createRazorpayOrder(amount, "INR", dto.getBookingId());

        // Reuse the existing PENDING payment record for this booking if one exists.
        // findAllByBookingIdForUpdate row-locks every existing payment for this booking for
        // the rest of this transaction, so a second call for the same booking (e.g. the
        // customer double-clicking Pay Now, or the checkout modal re-firing) has to wait
        // here until this transaction commits - then it sees the row just inserted below
        // and reuses it, instead of racing to insert a second PENDING row of its own.
        // resolveCanonicalPayment never throws even if duplicates already exist from before
        // this fix; it deterministically picks one.
        List<Payment> existingRows = paymentRepository.findAllByBookingIdForUpdate(dto.getBookingId());
        Payment payment = resolveCanonicalPayment(existingRows)
                .orElseGet(() -> new Payment(dto.getBookingId(), customerId, amount, "INR", "PENDING", razorpayOrderId));

        payment.setAmount(amount);
        payment.setCustomerId(customerId);
        payment.setStatus("PENDING");
        payment.setRazorpayOrderId(razorpayOrderId);
        payment.setCreatedAt(LocalDateTime.now());

        Payment saved = paymentRepository.save(payment);

        return new CreateOrderResponseDto(
                razorpayOrderId,
                saved.getAmount(),
                saved.getCurrency(),
                razorpayKeyId,
                saved.getBookingId(),
                saved.getId()
        );
    }

    /**
     * Deterministically picks ONE payment row for a booking out of however many exist -
     * zero, one, or (from the historical duplicate-insert bug) several. Never throws.
     *
     * A SUCCESS row always wins over a PENDING one - a real completed payment must never
     * be hidden behind a stray duplicate PENDING row. Among ties, the oldest row (lowest
     * id) wins, so which row is "the" payment is stable and predictable rather than
     * arbitrary, and every caller (create-order, verify, invoice/history lookups) agrees
     * on the same one.
     */
    private Optional<Payment> resolveCanonicalPayment(List<Payment> candidates) {
        if (candidates == null || candidates.isEmpty()) return Optional.empty();
        return candidates.stream()
                .sorted(Comparator
                        .comparing((Payment p) -> !"SUCCESS".equalsIgnoreCase(p.getStatus()))
                        .thenComparing(Payment::getId))
                .findFirst();
    }

    /**
     * Computes the amount actually charged for a booking, from service_packages.price -
     * never from client input. This is the single place that decides what a customer pays.
     *
     * Booking-service already returns each booking's serviceCenterId, selectedServices, and
     * (if one was chosen) packageId. This method:
     *   1. Looks up the booking's linked package by id, if the booking has one.
     *   2. Also matches the booking's selectedServices (by name, case-insensitively) against
     *      the service center's own priced packages, and sums every match - this is what
     *      covers "if multiple packages/services are selected, total = sum of their prices."
     * A package matched both ways is only counted once.
     *
     * If nothing matches a priced package, this throws rather than falling back to any
     * default number - silently charging an unverified amount is exactly the bug being fixed.
     */
    private BigDecimal resolveAuthoritativeAmount(Long bookingId, String authToken) {
        JsonNode booking = fetchBookingJson(bookingId, authToken);

        Long serviceCenterId = booking.hasNonNull("serviceCenterId") ? booking.get("serviceCenterId").asLong() : null;
        if (serviceCenterId == null) {
            throw new IllegalStateException("Booking #" + bookingId + " has no service center on record; cannot determine the payment amount.");
        }

        Long linkedPackageId = booking.hasNonNull("packageId") ? booking.get("packageId").asLong() : null;

        List<String> selectedServices = new java.util.ArrayList<>();
        if (booking.hasNonNull("selectedServices") && booking.get("selectedServices").isArray()) {
            booking.get("selectedServices").forEach(n -> {
                String s = n.asText("").trim();
                if (!s.isEmpty()) selectedServices.add(s);
            });
        }

        JsonNode packages = fetchActiveServiceCenterPackagesJson(serviceCenterId);

        BigDecimal total = BigDecimal.ZERO;
        java.util.Set<Long> countedPackageIds = new java.util.HashSet<>();
        if (packages != null && packages.isArray()) {
            for (JsonNode pkg : packages) {
                Long pkgId = pkg.hasNonNull("id") ? pkg.get("id").asLong() : null;
                String pkgName = pkg.hasNonNull("name") ? pkg.get("name").asText("") : "";
                BigDecimal pkgPrice = pkg.hasNonNull("price") ? new BigDecimal(pkg.get("price").asText("0")) : BigDecimal.ZERO;

                boolean matchesLinkedPackage = pkgId != null && pkgId.equals(linkedPackageId);
                boolean matchesSelectedService = !pkgName.isBlank()
                        && selectedServices.stream().anyMatch(s -> s.equalsIgnoreCase(pkgName.trim()));

                if ((matchesLinkedPackage || matchesSelectedService) && (pkgId == null || countedPackageIds.add(pkgId))) {
                    total = total.add(pkgPrice);
                }
            }
        }

        if (total.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(
                    "Unable to determine the payment amount for booking #" + bookingId
                            + ": none of the selected services match a priced Service Package at this service center. "
                            + "Please ask the service center to add a matching package, then try again.");
        }
        return total;
    }

    /** Fetches the booking record from booking-service, forwarding the caller's own JWT - the
     *  same forwarding pattern already used by enrichInvoiceFromBooking() below. Unlike that
     *  method, a failure here is NOT swallowed: without the booking we cannot safely price it. */
    private JsonNode fetchBookingJson(Long bookingId, String authToken) {
        try {
            String url = bookingServiceUrl + "/api/bookings/" + bookingId;
            HttpHeaders headers = new HttpHeaders();
            if (authToken != null && !authToken.isBlank()) {
                headers.set("Authorization", authToken.startsWith("Bearer ") ? authToken : "Bearer " + authToken);
            }
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), String.class);
            return objectMapper.readTree(response.getBody());
        } catch (Exception e) {
            log.error("Could not fetch booking {} to determine payment amount", bookingId, e);
            throw new IllegalStateException("Could not load booking #" + bookingId + " to determine the payment amount.", e);
        }
    }

    /** Fetches this service center's active packages (id/name/price) from service-center-service.
     *  GET /api/packages/service-center/{id} is already public (see that service's
     *  SecurityConfig), same as the /location endpoint enrichInvoiceFromServiceCenter() uses. */
    private JsonNode fetchActiveServiceCenterPackagesJson(Long serviceCenterId) {
        try {
            String url = serviceCenterServiceUrl + "/api/packages/service-center/" + serviceCenterId;
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            return objectMapper.readTree(response.getBody());
        } catch (Exception e) {
            log.error("Could not fetch packages for service center {} to determine payment amount", serviceCenterId, e);
            throw new IllegalStateException("Could not load service packages for service center #" + serviceCenterId + ".", e);
        }
    }

    /**
     * Creates a real order via Razorpay's Orders API (POST https://api.razorpay.com/v1/orders),
     * authenticated with HTTP Basic auth using the configured key id/secret. Razorpay
     * Checkout requires the order_id it is given to genuinely exist on Razorpay's servers
     * before it will accept a payment against it - simply generating a random string
     * client-side (as this previously did) is not sufficient.
     */
    private String createRazorpayOrder(BigDecimal amount, String currency, Long bookingId) {
        long amountInPaise = amount.multiply(BigDecimal.valueOf(100))
                .setScale(0, RoundingMode.HALF_UP)
                .longValueExact();

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("amount", amountInPaise);
        requestBody.put("currency", currency);
        requestBody.put("receipt", "wc_booking_" + bookingId + "_" + System.currentTimeMillis());
        requestBody.put("payment_capture", 1);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBasicAuth(razorpayKeyId, razorpaySecret);

        HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(RAZORPAY_ORDERS_URL, requestEntity, String.class);
            JsonNode body = objectMapper.readTree(response.getBody());
            String orderId = body.hasNonNull("id") ? body.get("id").asText() : null;
            if (orderId == null || orderId.isBlank()) {
                throw new IllegalStateException("Razorpay did not return an order id: " + response.getBody());
            }
            return orderId;
        } catch (HttpStatusCodeException e) {
            log.error("Razorpay order creation failed ({}): {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new IllegalStateException("Unable to initiate payment with Razorpay. Please try again shortly.", e);
        } catch (RestClientException e) {
            log.error("Could not reach Razorpay to create an order", e);
            throw new IllegalStateException("Unable to reach the payment gateway. Please check your connection and try again.", e);
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error creating Razorpay order", e);
            throw new IllegalStateException("Unable to initiate payment. Please try again.", e);
        }
    }

    @Override
    @Transactional
    public PaymentResponseDto verifyPayment(VerifyPaymentRequestDto dto, Long customerId, String authToken) {
        Payment payment = paymentRepository.findByRazorpayOrderId(dto.getRazorpayOrderId())
                .or(() -> resolveCanonicalPayment(paymentRepository.findAllByBookingId(dto.getBookingId())))
                .orElseThrow(() -> new ResourceNotFoundException("Payment record not found for Order ID: " + dto.getRazorpayOrderId()));

        if ("SUCCESS".equalsIgnoreCase(payment.getStatus())) {
            return toResponseDto(payment);
        }

        // Verify the Razorpay HMAC signature. There is no bypass here - a genuinely
        // successful payment from Razorpay Checkout always includes a real signature.
        boolean isValid = verifySignature(dto.getRazorpayOrderId(), dto.getRazorpayPaymentId(), dto.getRazorpaySignature());

        if (isValid) {
            payment.setStatus("SUCCESS");
            payment.setRazorpayPaymentId(dto.getRazorpayPaymentId());
            payment.setSignature(dto.getRazorpaySignature());
            payment.setPaymentDate(LocalDateTime.now());
            Payment updated = paymentRepository.save(payment);

            // Notify booking service to confirm booking status
            notifyBookingServiceConfirmed(dto.getBookingId(), authToken);

            return toResponseDto(updated);
        } else {
            payment.setStatus("FAILED");
            paymentRepository.save(payment);
            throw new IllegalArgumentException("Razorpay payment signature verification failed.");
        }
    }

    /**
     * Verifies the Razorpay payment signature per Razorpay's documented scheme:
     * expected signature = HMAC_SHA256(order_id + "|" + payment_id, key_secret), compared
     * (case-insensitively) against the signature Razorpay Checkout returned to the client.
     */
    private boolean verifySignature(String orderId, String paymentId, String signature) {
        if (orderId == null || orderId.isBlank() || paymentId == null || paymentId.isBlank()
                || signature == null || signature.isBlank()) {
            return false;
        }
        try {
            String payload = orderId + "|" + paymentId;
            Mac sha256_HMAC = Mac.getInstance("HmacSHA256");
            SecretKeySpec secret_key = new SecretKeySpec(razorpaySecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            sha256_HMAC.init(secret_key);
            byte[] hash = sha256_HMAC.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString().equalsIgnoreCase(signature);
        } catch (Exception e) {
            log.error("Error while verifying Razorpay signature", e);
            return false;
        }
    }

    private void notifyBookingServiceConfirmed(Long bookingId, String authToken) {
        try {
            String url = bookingServiceUrl + "/api/bookings/" + bookingId + "/status";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            if (authToken != null && !authToken.isBlank()) {
                headers.set("Authorization", authToken.startsWith("Bearer ") ? authToken : "Bearer " + authToken);
            }

            Map<String, String> body = Map.of(
                    "status", "CONFIRMED",
                    "notes", "Payment successfully processed via Razorpay."
            );

            HttpEntity<Map<String, String>> requestEntity = new HttpEntity<>(body, headers);
            restTemplate.exchange(url, HttpMethod.PUT, requestEntity, String.class);
        } catch (Exception e) {
            // The payment itself has genuinely succeeded by this point (signature already
            // verified above), so we don't fail the customer-facing request just because the
            // booking status sync failed - but this is logged loudly since it means the
            // booking is stuck as PENDING despite a successful payment and needs attention.
            log.error("Payment succeeded for booking {} but booking-service status update to CONFIRMED failed: {}",
                    bookingId, e.getMessage(), e);
        }
    }

    @Override
    public PaymentResponseDto getPaymentByBookingId(Long bookingId) {
        Payment payment = resolveCanonicalPayment(paymentRepository.findAllByBookingId(bookingId))
                .orElseThrow(() -> new ResourceNotFoundException("Payment", "bookingId", bookingId));
        return toResponseDto(payment);
    }

    @Override
    public List<PaymentResponseDto> getCustomerPayments(Long customerId) {
        List<Payment> payments = paymentRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);
        return payments.stream().map(this::toResponseDto).collect(Collectors.toList());
    }

    @Override
    public InvoiceDto getInvoiceByPaymentId(Long paymentId, String authToken) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment", "id", paymentId));

        InvoiceDto invoice = new InvoiceDto();
        invoice.setPaymentId(payment.getId());
        invoice.setBookingId(payment.getBookingId());
        invoice.setTransactionDate(payment.getPaymentDate() != null ? payment.getPaymentDate() : payment.getCreatedAt());
        invoice.setAmount(payment.getAmount());
        invoice.setCurrency(payment.getCurrency());
        invoice.setStatus(payment.getStatus());
        invoice.setRazorpayPaymentId(payment.getRazorpayPaymentId());

        enrichInvoiceFromBooking(invoice, payment.getBookingId(), authToken);

        return invoice;
    }

    /**
     * Populates customer/vehicle/service-type details on the invoice from the real booking
     * record in booking-service (and, transitively, the real service center record) instead
     * of filling the invoice with placeholder data. If the booking or service center can't
     * be reached, the corresponding fields are simply left blank rather than fabricated.
     */
    private void enrichInvoiceFromBooking(InvoiceDto invoice, Long bookingId, String authToken) {
        try {
            String url = bookingServiceUrl + "/api/bookings/" + bookingId;
            HttpHeaders headers = new HttpHeaders();
            if (authToken != null && !authToken.isBlank()) {
                headers.set("Authorization", authToken.startsWith("Bearer ") ? authToken : "Bearer " + authToken);
            }
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), String.class);
            JsonNode booking = objectMapper.readTree(response.getBody());

            invoice.setCustomerName(textOrNull(booking, "customerName"));
            invoice.setCustomerEmail(textOrNull(booking, "customerEmail"));
            invoice.setVehicleNumber(textOrNull(booking, "vehicleNumber"));
            invoice.setVehicleModel(textOrNull(booking, "vehicleModel"));
            invoice.setServiceType(textOrNull(booking, "serviceType"));

            Long serviceCenterId = booking.hasNonNull("serviceCenterId") ? booking.get("serviceCenterId").asLong() : null;
            if (serviceCenterId != null) {
                enrichInvoiceFromServiceCenter(invoice, serviceCenterId);
            }
        } catch (Exception e) {
            log.warn("Could not enrich invoice for booking {} with booking details: {}", bookingId, e.getMessage());
        }
    }

    private void enrichInvoiceFromServiceCenter(InvoiceDto invoice, Long serviceCenterId) {
        try {
            // Public endpoint (no auth required) - see service-center-service SecurityConfig.
            String url = serviceCenterServiceUrl + "/api/service-centers/" + serviceCenterId + "/location";
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            JsonNode center = objectMapper.readTree(response.getBody());

            invoice.setServiceCenterName(textOrNull(center, "name"));
            invoice.setServiceCenterAddress(textOrNull(center, "address"));
        } catch (Exception e) {
            log.warn("Could not enrich invoice with service center {} details: {}", serviceCenterId, e.getMessage());
        }
    }

    private String textOrNull(JsonNode node, String field) {
        if (node == null || !node.hasNonNull(field)) return null;
        String value = node.get(field).asText(null);
        return (value == null || value.isBlank()) ? null : value;
    }

    @Override
    public byte[] generateInvoicePdf(Long paymentId, String authToken) {
        InvoiceDto invoice = getInvoiceByPaymentId(paymentId, authToken);
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        String dateStr = invoice.getTransactionDate() != null ? invoice.getTransactionDate().format(formatter) : LocalDateTime.now().format(formatter);

        StringBuilder pdfContent = new StringBuilder();
        pdfContent.append("%PDF-1.4\n")
                .append("%===============================================\n")
                .append("WHEELCONNECT OFFICIAL TAX INVOICE\n")
                .append("===============================================\n")
                .append("Invoice No: INV-").append(invoice.getPaymentId()).append("\n")
                .append("Booking ID: #").append(invoice.getBookingId()).append("\n")
                .append("Transaction Date: ").append(dateStr).append("\n")
                .append("Payment Status: ").append(invoice.getStatus()).append("\n")
                .append("Razorpay Payment ID: ").append(orDefault(invoice.getRazorpayPaymentId(), "N/A")).append("\n")
                .append("-----------------------------------------------\n")
                .append("CUSTOMER DETAILS:\n")
                .append("Customer: ").append(orDefault(invoice.getCustomerName(), "N/A")).append("\n")
                .append("Vehicle: ").append(orDefault(invoice.getVehicleNumber(), "N/A"))
                .append(" (").append(orDefault(invoice.getVehicleModel(), "N/A")).append(")\n")
                .append("-----------------------------------------------\n")
                .append("SERVICE CENTER:\n")
                .append(orDefault(invoice.getServiceCenterName(), "N/A")).append("\n")
                .append(orDefault(invoice.getServiceCenterAddress(), "")).append("\n")
                .append("-----------------------------------------------\n")
                .append("PAYMENT SUMMARY:\n")
                .append("Service: ").append(orDefault(invoice.getServiceType(), "Vehicle Service")).append("\n")
                .append("Total Paid Amount: INR ").append(invoice.getAmount()).append("\n")
                .append("===============================================\n")
                .append("Thank you for choosing WheelConnect Smart Services!\n");

        return pdfContent.toString().getBytes(StandardCharsets.UTF_8);
    }

    private String orDefault(String value, String fallback) {
        return (value == null || value.isBlank()) ? fallback : value;
    }

    private PaymentResponseDto toResponseDto(Payment p) {
        return new PaymentResponseDto(
                p.getId(),
                p.getBookingId(),
                p.getCustomerId(),
                p.getAmount(),
                p.getCurrency(),
                p.getStatus(),
                p.getRazorpayOrderId(),
                p.getRazorpayPaymentId(),
                p.getPaymentDate(),
                p.getCreatedAt()
        );
    }
}
