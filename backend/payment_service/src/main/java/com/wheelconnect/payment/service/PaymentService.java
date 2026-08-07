package com.wheelconnect.payment.service;

import com.wheelconnect.payment.dto.*;

import java.util.List;

public interface PaymentService {

    CreateOrderResponseDto createOrder(CreateOrderRequestDto dto, Long customerId, String authToken);

    PaymentResponseDto verifyPayment(VerifyPaymentRequestDto dto, Long customerId, String authToken);

    PaymentResponseDto getPaymentByBookingId(Long bookingId);

    List<PaymentResponseDto> getCustomerPayments(Long customerId);

    InvoiceDto getInvoiceByPaymentId(Long paymentId, String authToken);

    byte[] generateInvoicePdf(Long paymentId, String authToken);
}
