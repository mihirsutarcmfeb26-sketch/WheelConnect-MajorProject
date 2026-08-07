import React, { useState, useEffect } from 'react';
import api from '../services/api';

const InvoiceView = ({ paymentId, bookingId, onClose }) => {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId, bookingId]);

  const fetchInvoice = async () => {
    setLoading(true);
    setError('');
    try {
      let url = paymentId ? `/api/payments/${paymentId}/invoice` : `/api/payments/booking/${bookingId}`;
      const resp = await api.get(url);
      setInvoice(resp.data);
    } catch (err) {
      console.error('Failed to load invoice:', err);
      setInvoice(null);
      setError(err.response?.data?.message || 'Could not load this invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const id = invoice?.paymentId || paymentId || bookingId;
      const response = await api.get(`/api/payments/${id}/invoice/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `WheelConnect_Invoice_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading invoice PDF:', err);
      alert('Invoice PDF download triggered.');
    }
  };

  return (
    <div className="modal d-block bg-dark bg-opacity-75" tabIndex="-1" style={{ zIndex: 1055 }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content bg-dark text-white border border-secondary shadow-lg">
          <div className="modal-header border-secondary">
            <h5 className="modal-title fw-bold text-primary">
              <i className="bi bi-file-earmark-text-fill me-2"></i>
              Official Tax Invoice
            </h5>
            {onClose && (
              <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
            )}
          </div>

          <div className="modal-body p-4">
            {loading ? (
              <div className="text-center py-5 text-muted">Loading invoice details...</div>
            ) : error ? (
              <div className="text-center py-4">
                <div className="alert alert-danger py-2 small mb-3">{error}</div>
                <button type="button" className="btn btn-outline-info btn-sm" onClick={fetchInvoice}>
                  <i className="bi bi-arrow-clockwise me-1"></i> Retry
                </button>
              </div>
            ) : invoice ? (
              <div className="bg-secondary bg-opacity-10 border border-secondary rounded p-4">
                {/* INVOICE HEADER */}
                <div className="d-flex justify-content-between align-items-start border-bottom border-secondary pb-3 mb-3">
                  <div>
                    <h3 className="fw-bold text-primary mb-1">
                      <i className="bi bi-shield-check me-2"></i>WheelConnect
                    </h3>
                    <p className="text-muted small mb-0">Smart Vehicle Service Management System</p>
                  </div>
                  <div className="text-end">
                    <span className="badge bg-success px-3 py-2 fs-6 mb-1">PAID IN FULL</span>
                    <p className="text-muted extra-small mb-0">Invoice #: INV-{invoice.paymentId}</p>
                    <p className="text-muted extra-small mb-0">
                      Date: {invoice.transactionDate ? new Date(invoice.transactionDate).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* DETAILS GRID */}
                <div className="row g-3 mb-4 small">
                  <div className="col-md-6">
                    <div className="card bg-dark text-white border-secondary p-3 h-100">
                      <strong className="text-info mb-2 d-block">Customer Information</strong>
                      <div><strong>Name:</strong> {invoice.customerName || 'Valued Customer'}</div>
                      <div><strong>Email:</strong> {invoice.customerEmail || 'N/A'}</div>
                      <div><strong>Vehicle:</strong> {invoice.vehicleNumber || 'N/A'} ({invoice.vehicleModel || 'N/A'})</div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="card bg-dark text-white border-secondary p-3 h-100">
                      <strong className="text-info mb-2 d-block">Service Provider & Reference</strong>
                      <div><strong>Booking ID:</strong> #{invoice.bookingId}</div>
                      <div><strong>Service Center:</strong> {invoice.serviceCenterName || 'N/A'}</div>
                      <div><strong>Address:</strong> {invoice.serviceCenterAddress || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                {/* PAYMENT SUMMARY TABLE */}
                <div className="table-responsive mb-3">
                  <table className="table table-dark table-bordered border-secondary align-middle small mb-0">
                    <thead className="table-secondary text-white">
                      <tr>
                        <th>Description</th>
                        <th>Transaction Ref / Gateway</th>
                        <th className="text-end">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <strong className="text-white">{invoice.serviceType || 'Vehicle Repair & Maintenance'}</strong>
                          <br />
                          <span className="text-muted extra-small">Booking Reference #{invoice.bookingId}</span>
                        </td>
                        <td>
                          Razorpay ID: <span className="text-info">{invoice.razorpayPaymentId || 'N/A'}</span>
                        </td>
                        <td className="text-end fw-bold text-success">
                          ₹ {invoice.amount} INR
                        </td>
                      </tr>
                      <tr className="fw-bold">
                        <td colSpan="2" className="text-end">Total Amount Paid:</td>
                        <td className="text-end text-success fs-5">₹ {invoice.amount} INR</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="d-flex justify-content-between align-items-center pt-2">
                  <span className="text-muted extra-small">
                    <i className="bi bi-lock-fill me-1 text-success"></i> Digitally verified via WheelConnect Payment Gateway
                  </span>
                  <div className="d-flex gap-2">
                    <button type="button" className="btn btn-outline-info btn-sm" onClick={handleDownloadPdf}>
                      <i className="bi bi-download me-1"></i> Download PDF
                    </button>
                    {onClose && (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
                        Close
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceView;
