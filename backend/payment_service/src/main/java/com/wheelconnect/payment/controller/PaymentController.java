package com.wheelconnect.payment.controller;

import com.wheelconnect.payment.dto.*;
import com.wheelconnect.payment.exception.ResourceNotFoundException;
import com.wheelconnect.payment.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getCredentials() == null) {
            throw new ResourceNotFoundException("Not authenticated");
        }
        return (Long) auth.getCredentials();
    }

    @PostMapping("/create-order")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<CreateOrderResponseDto> createOrder(
            @Valid @RequestBody CreateOrderRequestDto dto,
            HttpServletRequest request) {
        Long customerId = getCurrentUserId();
        String token = request.getHeader("Authorization");
        CreateOrderResponseDto response = paymentService.createOrder(dto, customerId, token);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/verify")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<PaymentResponseDto> verifyPayment(
            @Valid @RequestBody VerifyPaymentRequestDto dto,
            HttpServletRequest request) {
        Long customerId = getCurrentUserId();
        String token = request.getHeader("Authorization");
        PaymentResponseDto response = paymentService.verifyPayment(dto, customerId, token);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/booking/{bookingId}")
    public ResponseEntity<PaymentResponseDto> getPaymentByBookingId(@PathVariable Long bookingId) {
        PaymentResponseDto payment = paymentService.getPaymentByBookingId(bookingId);
        return ResponseEntity.ok(payment);
    }

    @GetMapping("/{bookingId}")
    public ResponseEntity<PaymentResponseDto> getPaymentByIdOrBooking(@PathVariable Long bookingId) {
        return getPaymentByBookingId(bookingId);
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<List<PaymentResponseDto>> getMyPayments() {
        Long customerId = getCurrentUserId();
        List<PaymentResponseDto> payments = paymentService.getCustomerPayments(customerId);
        return ResponseEntity.ok(payments);
    }

    @GetMapping("/history")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<List<PaymentResponseDto>> getPaymentHistory() {
        return getMyPayments();
    }

    @GetMapping("/{id}/invoice")
    public ResponseEntity<InvoiceDto> getInvoice(@PathVariable Long id, HttpServletRequest request) {
        InvoiceDto invoice = paymentService.getInvoiceByPaymentId(id, request.getHeader("Authorization"));
        return ResponseEntity.ok(invoice);
    }

    @GetMapping("/{id}/invoice/pdf")
    public ResponseEntity<byte[]> downloadInvoicePdf(@PathVariable Long id, HttpServletRequest request) {
        byte[] pdfBytes = paymentService.generateInvoicePdf(id, request.getHeader("Authorization"));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "WheelConnect_Invoice_" + id + ".pdf");
        headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

        return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
    }
}
