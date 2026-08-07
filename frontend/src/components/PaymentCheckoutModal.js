import React, { useState, useEffect } from 'react';
import api from '../services/api';
import PackageCard from './PackageCard';
import { matchSelectedPackages } from '../utils/packageDisplay';

const PaymentCheckoutModal = ({ booking, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);
  // 'loading' | 'ready' | 'error' - tracks whether the real Razorpay Checkout script has
  // actually finished loading. Payment can only be initiated once it's genuinely ready;
  // there is no simulated/fake-success fallback if it isn't.
  const [sdkStatus, setSdkStatus] = useState(window.Razorpay ? 'ready' : 'loading');

  // The order (and the amount actually payable) is never known to this component ahead of
  // time and is never computed here - it comes back from POST /api/payments/create-order,
  // which derives it server-side from the booking's own Service Package(s). This is fetched
  // as soon as the modal opens (see the effect below) so the total shown on screen, before
  // the customer even clicks "Pay", is always the real backend-calculated figure.
  const [order, setOrder] = useState(null); // { orderId, amount, currency, key, paymentId }
  const [pricingStatus, setPricingStatus] = useState('loading'); // 'loading' | 'ready' | 'error'

  // Service Package details for display only - which package(s) this booking's selected
  // services match, at this service center. Fetched independently of the pricing/order
  // effect below and fails silently on error; it never affects the amount charged, which
  // is always computed server-side in create-order regardless of what loads here.
  const [matchedPackages, setMatchedPackages] = useState([]);
  useEffect(() => {
    if (!booking?.serviceCenterId) return;
    let cancelled = false;
    (async () => {
      try {
        const resp = await api.get(`/api/packages/service-center/${booking.serviceCenterId}`);
        if (cancelled) return;
        setMatchedPackages(matchSelectedPackages(resp.data, booking.selectedServices));
      } catch (err) {
        console.error('Failed to load package details for this booking:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [booking?.serviceCenterId, booking?.selectedServices]);

  // Fetch the real order (and its backend-calculated amount) as soon as we know which
  // booking this is for.
  useEffect(() => {
    if (!booking?.id) return;
    let cancelled = false;

    const initOrder = async () => {
      setPricingStatus('loading');
      setError('');
      try {
        // The amount below is a fixed placeholder only - it exists purely to satisfy this
        // endpoint's existing request validation (amount must be a positive number). The
        // backend ignores it completely and always computes the real charge itself from
        // this booking's selected Service Package(s).
        const PLACEHOLDER_AMOUNT_IGNORED_BY_BACKEND = 1;
        const orderResp = await api.post('/api/payments/create-order', {
          bookingId: booking.id,
          amount: PLACEHOLDER_AMOUNT_IGNORED_BY_BACKEND,
        });
        if (cancelled) return;

        const { orderId, amount, currency, key, paymentId } = orderResp.data;
        if (!orderId || !key || amount == null) {
          setError('Could not initiate payment. Please try again.');
          setPricingStatus('error');
          return;
        }
        setOrder({ orderId, amount, currency: currency || 'INR', key, paymentId });
        setPricingStatus('ready');
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to initiate payment order:', err);
        setError(err.response?.data?.message || 'Failed to calculate the payment amount for this booking. Please try again.');
        setPricingStatus('error');
      }
    };

    initOrder();
    return () => {
      cancelled = true;
    };
  }, [booking?.id]);

  // Dynamically load the real Razorpay Checkout SDK
  useEffect(() => {
    if (window.Razorpay) {
      setSdkStatus('ready');
      return;
    }

    const scriptId = 'razorpay-sdk-js';
    let script = document.getElementById(scriptId);

    const handleLoad = () => setSdkStatus('ready');
    const handleError = () => setSdkStatus('error');

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = handleLoad;
      script.onerror = handleError;
      document.body.appendChild(script);
    } else {
      script.addEventListener('load', handleLoad);
      script.addEventListener('error', handleError);
    }

    return () => {
      if (script) {
        script.removeEventListener('load', handleLoad);
        script.removeEventListener('error', handleError);
      }
    };
  }, []);

  const handleInitiateRazorpay = () => {
    if (sdkStatus !== 'ready' || !window.Razorpay) {
      setError('The secure payment gateway is still loading. Please wait a moment and try again.');
      return;
    }
    if (pricingStatus !== 'ready' || !order) {
      setError('Still calculating the payment amount for this booking. Please wait a moment and try again.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // The order (and its amount) was already created server-side when this modal opened -
      // see the effect above. Razorpay Checkout is simply pointed at that existing order;
      // no amount is computed or re-sent from here.
      const { orderId, key, currency, amount } = order;

      // Configure Razorpay Options
      const options = {
        key,
        amount: Math.round(Number(amount) * 100), // amount in paise
        currency: currency || 'INR',
        name: 'WheelConnect Auto Services',
        description: `Payment for Service Booking #${booking.id} (${booking.serviceType || 'General Service'})`,
        image: 'https://cdn-icons-png.flaticon.com/512/3202/3202926.png',
        order_id: orderId,
        handler: async function (response) {
          // A genuine successful Razorpay payment always includes these three fields.
          if (!response.razorpay_order_id || !response.razorpay_payment_id || !response.razorpay_signature) {
            setError('Payment response was incomplete. If an amount was deducted, please contact support with your booking reference.');
            setLoading(false);
            return;
          }

          try {
            setLoading(true);
            // Verify the real Razorpay signature server-side
            const verifyResp = await api.post('/api/payments/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              bookingId: booking.id,
            });

            setPaymentSuccessData(verifyResp.data);
            if (onSuccess) onSuccess(verifyResp.data);
          } catch (vErr) {
            console.error('Payment verification failed:', vErr);
            setError(vErr.response?.data?.message || 'Payment signature verification failed.');
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: 'WheelConnect Customer',
          email: 'customer@wheelconnect.com',
          contact: '9876543210',
        },
        theme: {
          color: '#6f42c1',
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      };

      // 3. Open the real Razorpay Checkout modal. sdkStatus === 'ready' has already been
      // verified above, so window.Razorpay is guaranteed to exist here - no simulated
      // success fallback.
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        setError(resp.error?.description || 'Payment failed. Please try again.');
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      console.error('Failed to initiate payment order:', err);
      setError(err.response?.data?.message || 'Failed to create payment order. Please try again.');
      setLoading(false);
    }
  };

  const handleDownloadInvoicePdf = async (paymentId) => {
    try {
      const response = await api.get(`/api/payments/${paymentId}/invoice/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `WheelConnect_Invoice_${paymentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to download invoice PDF:', err);
      alert('Could not download invoice PDF. Please try again.');
    }
  };

  return (
    <div className="modal d-block bg-dark bg-opacity-75" tabIndex="-1" style={{ zIndex: 1055 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content bg-dark text-white border border-secondary shadow-lg">
          <div className="modal-header border-secondary">
            <h5 className="modal-title fw-bold text-primary">
              <i className="bi bi-credit-card-2-front-fill me-2"></i>
              Razorpay Secure Checkout
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          <div className="modal-body p-4">
            {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}

            {paymentSuccessData ? (
              <div className="text-center py-3">
                <div className="text-success display-1 mb-2">
                  <i className="bi bi-check-circle-fill"></i>
                </div>
                <h4 className="fw-bold text-white mb-2">Payment Successful!</h4>
                <p className="text-muted small mb-3">
                  Your booking status has been updated to <strong className="text-success">CONFIRMED</strong>.
                </p>

                <div className="bg-secondary bg-opacity-25 p-3 rounded text-start mb-4 small">
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Payment ID:</span>
                    <strong className="text-white">{paymentSuccessData.id || paymentSuccessData.razorpayPaymentId}</strong>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Booking ID:</span>
                    <strong className="text-white">#{booking.id}</strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Amount Paid:</span>
                    <strong className="text-success">₹ {paymentSuccessData.amount ?? order?.amount} INR</strong>
                  </div>
                </div>

                {matchedPackages.length > 0 && (
                  <div className="text-start mb-4">
                    <h6 className="fw-bold text-white small mb-2">What's Included</h6>
                    <div className="row g-2">
                      {matchedPackages.map((pkg) => (
                        <div key={pkg.id} className="col-md-6">
                          <PackageCard pkg={pkg} selected compact />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="d-flex gap-2 justify-content-center">
                  <button
                    type="button"
                    className="btn btn-outline-info btn-sm"
                    onClick={() => handleDownloadInvoicePdf(paymentSuccessData.id)}
                  >
                    <i className="bi bi-file-earmark-pdf me-1"></i> Download Invoice PDF
                  </button>
                  <button type="button" className="btn btn-success btn-sm px-4" onClick={onClose}>
                    Done
                  </button>
                </div>
              </div>
            ) : pricingStatus === 'loading' ? (
              <div className="text-center py-5">
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                <span className="text-muted">Calculating the payment amount for this booking...</span>
              </div>
            ) : pricingStatus === 'error' ? (
              <div className="text-center py-4">
                <p className="text-muted small mb-3">
                  We couldn't calculate the payment amount for this booking. Please close this and try again.
                </p>
                <button type="button" className="btn btn-outline-light btn-sm px-4" onClick={onClose}>
                  Close
                </button>
              </div>
            ) : (
              <div>
                <div className="card bg-secondary bg-opacity-25 border border-secondary p-3 mb-4">
                  <h6 className="fw-bold text-white mb-2">Booking Summary</h6>
                  <div className="d-flex justify-content-between small text-muted mb-1">
                    <span>Booking Reference:</span>
                    <strong className="text-white">#{booking.id}</strong>
                  </div>
                  {matchedPackages.length === 0 && (
                    <div className="d-flex justify-content-between small text-muted mb-1">
                      <span>Service Package:</span>
                      <strong className="text-white">{booking.serviceType || 'General Inspection'}</strong>
                    </div>
                  )}
                  <div className="d-flex justify-content-between small text-muted mb-1">
                    <span>Vehicle:</span>
                    <strong className="text-white">{booking.vehicleNumber || 'Registered Vehicle'}</strong>
                  </div>
                  <hr className="my-2 border-secondary" />
                  <div className="d-flex justify-content-between fs-5 fw-bold text-white">
                    <span>Total Charge:</span>
                    <span className="text-success">₹ {order.amount} INR</span>
                  </div>
                </div>

                {matchedPackages.length > 0 && (
                  <div className="mb-4">
                    <h6 className="fw-bold text-white small mb-2">What's Included</h6>
                    <div className="row g-2">
                      {matchedPackages.map((pkg) => (
                        <div key={pkg.id} className="col-md-6">
                          <PackageCard pkg={pkg} selected compact />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-center mb-3">
                  <span className="badge bg-purple px-3 py-2">
                    <i className="bi bi-shield-lock-fill me-1"></i> 256-Bit Encrypted via Razorpay
                  </span>
                </div>

                {sdkStatus === 'error' && (
                  <div className="alert alert-danger py-2 small mb-3">
                    Couldn't load the secure payment gateway. Please check your internet connection and refresh the page.
                  </div>
                )}

                <button
                  type="button"
                  className="gradient-btn w-100 py-3 fs-5"
                  onClick={handleInitiateRazorpay}
                  disabled={loading || sdkStatus !== 'ready'}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Processing Payment...
                    </>
                  ) : sdkStatus === 'loading' ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Loading Secure Checkout...
                    </>
                  ) : sdkStatus === 'error' ? (
                    'Payment Gateway Unavailable'
                  ) : (
                    <>
                      <i className="bi bi-lightning-charge-fill me-2"></i>
                      Pay ₹{order.amount} Now with Razorpay
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentCheckoutModal;
