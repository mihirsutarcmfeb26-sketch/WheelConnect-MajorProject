package com.wheelconnect.payment.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class InvoiceDto {

    private Long paymentId;
    private Long bookingId;
    private LocalDateTime transactionDate;
    private BigDecimal amount;
    private String currency;
    private String status;
    private String razorpayPaymentId;

    private String customerName;
    private String customerEmail;
    private String vehicleNumber;
    private String vehicleModel;
    private String serviceCenterName;
    private String serviceCenterAddress;
    private String serviceType;

    public InvoiceDto() {}

    public Long getPaymentId() { return paymentId; }
    public void setPaymentId(Long paymentId) { this.paymentId = paymentId; }

    public Long getBookingId() { return bookingId; }
    public void setBookingId(Long bookingId) { this.bookingId = bookingId; }

    public LocalDateTime getTransactionDate() { return transactionDate; }
    public void setTransactionDate(LocalDateTime transactionDate) { this.transactionDate = transactionDate; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getRazorpayPaymentId() { return razorpayPaymentId; }
    public void setRazorpayPaymentId(String razorpayPaymentId) { this.razorpayPaymentId = razorpayPaymentId; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getCustomerEmail() { return customerEmail; }
    public void setCustomerEmail(String customerEmail) { this.customerEmail = customerEmail; }

    public String getVehicleNumber() { return vehicleNumber; }
    public void setVehicleNumber(String vehicleNumber) { this.vehicleNumber = vehicleNumber; }

    public String getVehicleModel() { return vehicleModel; }
    public void setVehicleModel(String vehicleModel) { this.vehicleModel = vehicleModel; }

    public String getServiceCenterName() { return serviceCenterName; }
    public void setServiceCenterName(String serviceCenterName) { this.serviceCenterName = serviceCenterName; }

    public String getServiceCenterAddress() { return serviceCenterAddress; }
    public void setServiceCenterAddress(String serviceCenterAddress) { this.serviceCenterAddress = serviceCenterAddress; }

    public String getServiceType() { return serviceType; }
    public void setServiceType(String serviceType) { this.serviceType = serviceType; }
}
