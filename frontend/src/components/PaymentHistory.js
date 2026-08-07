import React, { useState, useEffect } from 'react';
import api from '../services/api';
import InvoiceView from './InvoiceView';

const PaymentHistory = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedInvoicePaymentId, setSelectedInvoicePaymentId] = useState(null);

  const fetchPayments = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await api.get('/api/payments/my');
      setPayments(resp.data);
    } catch (err) {
      console.error('Failed to fetch payment history:', err);
      setError('Could not load payment history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleDownloadPdf = async (paymentId) => {
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
      alert('Could not download invoice PDF.');
    }
  };

  return (
    <div className="glass-panel p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold text-white mb-1">
            <i className="bi bi-credit-card-fill text-purple me-2"></i>
            Payment History & Invoices
          </h4>
          <p className="text-muted small mb-0">View transaction history, payment statuses, and download official tax invoices.</p>
        </div>
        <button type="button" className="btn btn-outline-light btn-sm" onClick={fetchPayments}>
          <i className="bi bi-arrow-clockwise me-1"></i> Refresh
        </button>
      </div>

      {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}

      {loading ? (
        <div className="text-center py-5 text-muted">Loading transaction records...</div>
      ) : payments.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-receipt display-4 d-block mb-3"></i>
          No transaction history found. Completed service payments will appear here.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-dark table-hover align-middle border-secondary small">
            <thead className="table-secondary">
              <tr>
                <th>Payment Ref</th>
                <th>Booking ID</th>
                <th>Transaction Date</th>
                <th>Amount</th>
                <th>Razorpay Order / Payment ID</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="fw-bold text-white">#PAY-{p.id}</td>
                  <td>
                    <span className="badge bg-secondary">Booking #{p.bookingId}</span>
                  </td>
                  <td className="text-muted">
                    {p.paymentDate ? new Date(p.paymentDate).toLocaleString() : new Date(p.createdAt).toLocaleString()}
                  </td>
                  <td className="fw-bold text-success">
                    ₹ {p.amount} {p.currency}
                  </td>
                  <td className="extra-small text-truncate" style={{ maxWidth: '160px' }}>
                    {p.razorpayPaymentId || p.razorpayOrderId}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        p.status === 'SUCCESS'
                          ? 'bg-success'
                          : p.status === 'FAILED'
                          ? 'bg-danger'
                          : 'bg-warning text-dark'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="text-end">
                    <div className="d-flex justify-content-end gap-1">
                      <button
                        type="button"
                        className="btn btn-outline-info btn-xs py-1 px-2"
                        onClick={() => setSelectedInvoicePaymentId(p.id)}
                      >
                        <i className="bi bi-eye me-1"></i> Invoice
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-success btn-xs py-1 px-2"
                        onClick={() => handleDownloadPdf(p.id)}
                      >
                        <i className="bi bi-file-earmark-pdf"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invoice Modal */}
      {selectedInvoicePaymentId && (
        <InvoiceView
          paymentId={selectedInvoicePaymentId}
          onClose={() => setSelectedInvoicePaymentId(null)}
        />
      )}
    </div>
  );
};

export default PaymentHistory;
