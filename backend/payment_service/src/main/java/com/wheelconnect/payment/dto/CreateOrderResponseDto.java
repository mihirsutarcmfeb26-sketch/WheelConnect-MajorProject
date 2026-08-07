package com.wheelconnect.payment.dto;

import java.math.BigDecimal;

public class CreateOrderResponseDto {

    private String orderId;
    private BigDecimal amount;
    private String currency;
    private String key;
    private Long bookingId;
    private Long paymentId;

    public CreateOrderResponseDto() {}

    public CreateOrderResponseDto(String orderId, BigDecimal amount, String currency, String key, Long bookingId, Long paymentId) {
        this.orderId = orderId;
        this.amount = amount;
        this.currency = currency;
        this.key = key;
        this.bookingId = bookingId;
        this.paymentId = paymentId;
    }

    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getKey() { return key; }
    public void setKey(String key) { this.key = key; }

    public Long getBookingId() { return bookingId; }
    public void setBookingId(Long bookingId) { this.bookingId = bookingId; }

    public Long getPaymentId() { return paymentId; }
    public void setPaymentId(Long paymentId) { this.paymentId = paymentId; }
}
