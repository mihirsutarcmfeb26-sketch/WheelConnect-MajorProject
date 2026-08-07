package com.wheelconnect.payment.repository;

import com.wheelconnect.payment.entity.Payment;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    /**
     * Deliberately NOT Optional<Payment>/findByBookingId(Long) - a single-result derived
     * query throws "Query did not return a unique result" the moment more than one row
     * exists for the same booking_id, which is exactly the historical bug this fixes.
     * Use PaymentServiceImpl.resolveCanonicalPayment(...) on the result to pick the right
     * one deterministically, whether there's zero, one, or several rows.
     */
    List<Payment> findAllByBookingId(Long bookingId);

    List<Payment> findAllByBookingIdAndStatus(Long bookingId, String status);

    /**
     * Same query as findAllByBookingId, but takes a row lock on every matching payment for
     * the duration of the transaction. Used only where a new payment might be inserted
     * (createOrder's reuse-or-create decision) so a second, near-simultaneous request for
     * the same booking has to wait for the first to finish and commit - closing the window
     * where both requests see "no existing payment" and both insert one.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Payment p WHERE p.bookingId = :bookingId ORDER BY p.id ASC")
    List<Payment> findAllByBookingIdForUpdate(@Param("bookingId") Long bookingId);

    Optional<Payment> findByRazorpayOrderId(String razorpayOrderId);

    List<Payment> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
}
