import React, { useState, useEffect } from 'react';
import api from '../services/api';

const AdditionalChargeApproval = ({ bookingId, isCustomer }) => {
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchCharges = async () => {
    try {
      const resp = await api.get(`/api/charges/booking/${bookingId}`);
      setCharges(resp.data);
    } catch (err) {
      console.error('Failed to load additional charges:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCharges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const handleRespond = async (token, status) => {
    setActionLoading(true);
    setMessage('');
    try {
      const resp = await api.post(`/api/charges/approve/${token}`, { status });
      setMessage(resp.data.message);
      fetchCharges();
    } catch (err) {
      console.error('Failed to respond to charge:', err);
      setMessage(err.response?.data?.message || 'Failed to submit decision.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return null;
  if (charges.length === 0) return null;

  return (
    <div className="card bg-dark border border-warning my-3 text-white">
      <div className="card-header bg-warning bg-opacity-10 text-warning d-flex align-items-center gap-2">
        <i className="bi bi-exclamation-triangle-fill fs-5"></i>
        <h6 className="fw-bold mb-0">Additional Repair Charges Request</h6>
      </div>
      <div className="card-body">
        {message && <div className="alert alert-info py-2 small mb-3">{message}</div>}

        <div className="table-responsive">
          <table className="table table-dark table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Description</th>
                <th>Amount</th>
                <th>Status</th>
                {isCustomer && <th>Customer Action</th>}
              </tr>
            </thead>
            <tbody>
              {charges.map((c) => (
                <tr key={c.id}>
                  <td>{c.description}</td>
                  <td className="fw-bold text-success">₹{c.amount}</td>
                  <td>
                    <span
                      className={`badge ${
                        c.status === 'APPROVED'
                          ? 'bg-success'
                          : c.status === 'REJECTED'
                          ? 'bg-danger'
                          : c.status === 'EXPIRED'
                          ? 'bg-secondary'
                          : 'bg-warning text-dark'
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  {isCustomer && (
                    <td>
                      {c.status === 'PENDING' ? (
                        <div className="d-flex gap-2">
                          <button
                            type="button"
                            className="btn btn-success btn-sm px-3"
                            disabled={actionLoading}
                            onClick={() => handleRespond(c.approvalToken, 'APPROVED')}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm px-3"
                            disabled={actionLoading}
                            onClick={() => handleRespond(c.approvalToken, 'REJECTED')}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted small">Decision Recorded</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdditionalChargeApproval;
