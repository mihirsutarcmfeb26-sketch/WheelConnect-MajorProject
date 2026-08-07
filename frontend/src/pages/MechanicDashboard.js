import React, { useState, useEffect } from 'react';
import api from '../services/api';
import ChatWindow from '../components/ChatWindow';

const MechanicDashboard = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeChatBookingId, setActiveChatBookingId] = useState(null);

  // Propose charge modal state
  const [chargeBookingId, setChargeBookingId] = useState(null);
  const [chargeDesc, setChargeDesc] = useState('');
  const [chargeAmount, setChargeAmount] = useState('');

  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const loadJobs = async () => {
    setLoading(true);
    try {
      const resp = await api.get('/api/bookings/mechanic/jobs');
      setJobs(resp.data);
    } catch (err) {
      console.error('Failed to load mechanic jobs:', err);
      setError('Could not load assigned jobs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const handleUpdateStatus = async (jobId, newStatus) => {
    setMsg('');
    setError('');
    try {
      await api.put(`/api/bookings/${jobId}/status`, {
        status: newStatus,
        notes: `Status updated to ${newStatus.replace(/_/g, ' ')}`,
      });
      setMsg(`Job #${jobId} status updated to ${newStatus.replace(/_/g, ' ')}!`);
      loadJobs();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update job status.');
    }
  };

  const handleProposeChargeSubmit = async (e) => {
    e.preventDefault();
    if (!chargeAmount || Number(chargeAmount) <= 0) {
      return setError('Charge amount must be positive.');
    }
    if (!chargeDesc.trim()) {
      return setError('Description is required.');
    }

    try {
      await api.post('/api/charges/propose', {
        bookingId: chargeBookingId,
        description: chargeDesc.trim(),
        amount: Number(chargeAmount),
      });
      setMsg(`Additional charge proposal submitted for Booking #${chargeBookingId}! Customer notification sent.`);
      setChargeBookingId(null);
      setChargeDesc('');
      setChargeAmount('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit charge proposal.');
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold text-white mb-1">Mechanic Repair Workbench</h2>
          <p className="text-muted small mb-0">View assigned vehicle jobs, update repair status, and communicate with customers</p>
        </div>
      </div>

      {msg && <div className="alert alert-success py-2 small mb-3">{msg}</div>}
      {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}

      <div className="glass-panel p-4">
        <h4 className="fw-bold text-white mb-3">Assigned Vehicle Repair Jobs ({jobs.length})</h4>

        {loading ? (
          <div className="text-center py-4 text-muted">Loading assigned jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-tools display-4 d-block mb-3"></i>
            No active repair jobs assigned to you at the moment.
          </div>
        ) : (
          <div className="d-flex flex-column gap-4">
            {jobs.map((job) => (
              <div key={job.id} className="card bg-dark text-white border border-secondary p-3">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-2 mb-3">
                  <div>
                    <h5 className="fw-bold text-primary mb-1">
                      Job #{job.id} – {job.serviceType}
                    </h5>
                    <span className="text-muted small">
                      Vehicle: <strong className="text-white">{job.vehicleNumber || 'Vehicle #' + job.vehicleId}</strong> ({job.vehicleModel})
                    </span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className={`status-badge status-${job.status}`}>
                      {job.status.replace(/_/g, ' ')}
                    </span>
                    {/* <button
                      className="btn btn-outline-warning btn-sm"
                      onClick={() => setChargeBookingId(job.id)}
                    >
                      <i className="bi bi-currency-rupee me-1"></i> Propose Extra Charge
                    </button> */}
                    <button
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => setActiveChatBookingId(job.id)}
                    >
                      <i className="bi bi-chat-dots me-1"></i> Chat Customer
                    </button>
                  </div>
                </div>

                <div className="bg-secondary bg-opacity-25 p-3 rounded mb-3">
                  <div className="fw-semibold text-white small mb-1">Status Workflow Controls:</div>
                  <div className="d-flex flex-wrap gap-2">
                    {['MECHANIC_ASSIGNED', 'IN_PROGRESS', 'INSPECTION_COMPLETED', 'REPAIR_STARTED', 'QUALITY_CHECK', 'VEHICLE_WASHED', 'READY_FOR_DELIVERY', 'COMPLETED'].map(
                      (st) => (
                        <button
                          key={st}
                          type="button"
                          className={`btn btn-sm ${
                            job.status === st ? 'btn-success' : 'btn-outline-secondary text-white'
                          }`}
                          onClick={() => handleUpdateStatus(job.id, st)}
                        >
                          {st.replace(/_/g, ' ')}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="small text-muted">
                  <i className="bi bi-info-circle me-1"></i> Problem Notes: {job.description || 'General repair request.'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for Proposing Additional Charge */}
      {chargeBookingId && (
        <div className="modal d-block bg-black bg-opacity-75" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark text-white border border-secondary">
              <div className="modal-header border-secondary">
                <h5 className="modal-title text-warning">
                  Propose Additional Charge for Booking #{chargeBookingId}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setChargeBookingId(null)}
                ></button>
              </div>
              <form onSubmit={handleProposeChargeSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Charge Description / Work Reason</label>
                    <input
                      type="text"
                      className="form-control bg-secondary bg-opacity-25 text-white border-secondary"
                      placeholder="e.g. Brake pad replacement required after inspection"
                      value={chargeDesc}
                      onChange={(e) => setChargeDesc(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Amount (₹)</label>
                    <input
                      type="number"
                      className="form-control bg-secondary bg-opacity-25 text-white border-secondary"
                      placeholder="e.g. 1500"
                      value={chargeAmount}
                      onChange={(e) => setChargeAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className="alert alert-info py-2 extra-small">
                    Customer approval will be required before this charge is added to the final bill.
                  </div>
                </div>
                <div className="modal-footer border-secondary">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setChargeBookingId(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="gradient-btn">
                    Submit Proposal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Live Chat Drawer */}
      {activeChatBookingId && (
        <div className="position-fixed bottom-0 end-0 m-4 z-3" style={{ width: '380px' }}>
          <ChatWindow
            bookingId={activeChatBookingId}
            onClose={() => setActiveChatBookingId(null)}
          />
        </div>
      )}
    </div>
  );
};

export default MechanicDashboard;
