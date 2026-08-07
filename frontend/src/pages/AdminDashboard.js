import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { validateName, validateEmail, validatePhone, validatePassword } from '../validators';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'centers', 'users', 'applications'

  const [centers, setCenters] = useState([]);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [applications, setApplications] = useState([]);

  // Application view/action modal state
  const [selectedApp, setSelectedApp] = useState(null);
  const [actionRemarks, setActionRemarks] = useState('');

  // Create Center form
  const [cName, setCName] = useState('');
  const [cAddress, setCAddress] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPassword, setCPassword] = useState('');
  const [cLat, setCLat] = useState('');
  const [cLng, setCLng] = useState('');

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [cResp, uResp, bResp, appResp] = await Promise.all([
        api.get('/api/service-centers'),
        api.get('/api/users'),
        api.get('/api/bookings'),
        api.get('/api/service-centers/applications').catch(() => ({ data: [] })),
      ]);
      setCenters(cResp.data);
      setUsers(uResp.data);
      setBookings(bResp.data);
      setApplications(appResp.data);
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
      setError('Could not load system administration data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateCenter = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');

    const nVal = validateName(cName);
    if (!nVal.valid) return setError(nVal.message);
    const eVal = validateEmail(cEmail);
    if (!eVal.valid) return setError(eVal.message);
    const pVal = validatePhone(cPhone);
    if (!pVal.valid) return setError(pVal.message);
    const passVal = validatePassword(cPassword);
    if (!passVal.valid) return setError(passVal.message);

    try {
      // 1. Create auth user for service center
      const userResp = await api.post('/api/users', {
        name: nVal.normalized,
        email: eVal.normalized,
        phone: pVal.normalized,
        password: cPassword,
        role: 'SERVICE_CENTER',
        isActive: true,
      });

      // 2. Create service center profile
      await api.post('/api/service-centers', {
        name: nVal.normalized,
        address: cAddress.trim(),
        phone: pVal.normalized,
        email: eVal.normalized,
        // Leave coordinates unset if the admin didn't type them in - the backend will
        // resolve real coordinates from the address via geocoding instead of defaulting
        // to a fixed fallback location.
        latitude: cLat ? Number(cLat) : null,
        longitude: cLng ? Number(cLng) : null,
        userId: userResp.data.id,
      });

      setMsg('Service Center created successfully!');
      setCName('');
      setCAddress('');
      setCPhone('');
      setCEmail('');
      setCPassword('');
      setCLat('');
      setCLng('');
      loadAdminData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create service center.');
    }
  };

  const handleToggleUser = async (id) => {
    try {
      await api.post(`/api/users/${id}/toggle`);
      setMsg('User status updated.');
      loadAdminData();
    } catch (err) {
      setError('Failed to toggle user status.');
    }
  };

  const handleToggleCenter = async (id) => {
    try {
      await api.post(`/api/service-centers/${id}/toggle`);
      setMsg('Service center status updated.');
      loadAdminData();
    } catch (err) {
      setError('Failed to toggle service center status.');
    }
  };

  const handleApproveApp = async (id, remarks) => {
    setError('');
    setMsg('');
    try {
      await api.put(`/api/service-centers/applications/${id}/approve`, { remarks: remarks || actionRemarks });
      setMsg('Service Centre Application approved successfully! User account upgraded to SERVICE_CENTER.');
      setActionRemarks('');
      setSelectedApp(null);
      loadAdminData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve application.');
    }
  };

  const handleRejectApp = async (id, remarks) => {
    setError('');
    setMsg('');
    try {
      await api.put(`/api/service-centers/applications/${id}/reject`, { remarks: remarks || actionRemarks });
      setMsg('Service Centre Application rejected.');
      setActionRemarks('');
      setSelectedApp(null);
      loadAdminData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject application.');
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold text-white mb-1">System Administration Portal</h2>
          <p className="text-muted small mb-0">Overview metrics, service centers, user management, applications, and reports</p>
        </div>
        <div className="d-flex gap-2">
          <button
            className={`btn ${activeTab === 'overview' ? 'gradient-btn' : 'btn-outline-light'}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview & Stats
          </button>
          <button
            className={`btn ${activeTab === 'applications' ? 'gradient-btn' : 'btn-outline-primary'}`}
            onClick={() => setActiveTab('applications')}
          >
            Service Centre Applications ({applications.filter((a) => a.status === 'PENDING').length})
          </button>
          <button
            className={`btn ${activeTab === 'centers' ? 'gradient-btn' : 'btn-outline-light'}`}
            onClick={() => setActiveTab('centers')}
          >
            Service Centers ({centers.length})
          </button>
          <button
            className={`btn ${activeTab === 'users' ? 'gradient-btn' : 'btn-outline-light'}`}
            onClick={() => setActiveTab('users')}
          >
            User Management ({users.length})
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-2 text-muted small mb-2">
          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
          Loading administration data...
        </div>
      )}
      {msg && <div className="alert alert-success py-2 small mb-3">{msg}</div>}
      {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}

      {activeTab === 'overview' && (
        <div className="row g-4 mb-4">
          <div className="col-md-3">
            <div className="glass-panel p-4 text-center">
              <i className="bi bi-buildings text-primary display-5 mb-2 d-block"></i>
              <h3 className="fw-bold text-white mb-0">{centers.length}</h3>
              <span className="text-muted small">Total Service Centers</span>
            </div>
          </div>
          <div className="col-md-3">
            <div className="glass-panel p-4 text-center">
              <i className="bi bi-people text-purple display-5 mb-2 d-block"></i>
              <h3 className="fw-bold text-white mb-0">{users.length}</h3>
              <span className="text-muted small">Registered Users</span>
            </div>
          </div>
          <div className="col-md-3">
            <div className="glass-panel p-4 text-center">
              <i className="bi bi-tools text-warning display-5 mb-2 d-block"></i>
              <h3 className="fw-bold text-white mb-0">{bookings.length}</h3>
              <span className="text-muted small">Total Bookings</span>
            </div>
          </div>
          <div className="col-md-3">
            <div className="glass-panel p-4 text-center">
              <i className="bi bi-check-circle text-success display-5 mb-2 d-block"></i>
              <h3 className="fw-bold text-white mb-0">
                {bookings.filter((b) => b.status === 'COMPLETED').length}
              </h3>
              <span className="text-muted small">Completed Repairs</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'centers' && (
        <div className="row g-4">
          <div className="col-lg-5">
            <div className="glass-panel p-4">
              <h4 className="fw-bold text-white mb-3">Add Service Center</h4>
              <form onSubmit={handleCreateCenter}>
                <div className="mb-3">
                  <label className="form-label text-light small fw-semibold">Center Name</label>
                  <input
                    type="text"
                    className="form-control bg-dark text-white border-secondary"
                    placeholder="e.g. Apex Auto Care - Bandra"
                    value={cName}
                    onChange={(e) => setCName(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label text-light small fw-semibold">Address</label>
                  <input
                    type="text"
                    className="form-control bg-dark text-white border-secondary"
                    placeholder="Bandra West, Mumbai"
                    value={cAddress}
                    onChange={(e) => setCAddress(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label text-light small fw-semibold">Phone (+91)</label>
                  <input
                    type="text"
                    className="form-control bg-dark text-white border-secondary"
                    placeholder="9876543210"
                    value={cPhone}
                    onChange={(e) => setCPhone(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label text-light small fw-semibold">Email</label>
                  <input
                    type="email"
                    className="form-control bg-dark text-white border-secondary"
                    placeholder="apex@wheelconnect.com"
                    value={cEmail}
                    onChange={(e) => setCEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label text-light small fw-semibold">Account Password</label>
                  <input
                    type="password"
                    className="form-control bg-dark text-white border-secondary"
                    placeholder="Password (Min 8 chars)"
                    value={cPassword}
                    onChange={(e) => setCPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="row g-2 mb-4">
                  <div className="col-6">
                    <label className="form-label text-light small fw-semibold">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      className="form-control bg-dark text-white border-secondary"
                      placeholder="19.0760"
                      value={cLat}
                      onChange={(e) => setCLat(e.target.value)}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label text-light small fw-semibold">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      className="form-control bg-dark text-white border-secondary"
                      placeholder="72.8777"
                      value={cLng}
                      onChange={(e) => setCLng(e.target.value)}
                    />
                  </div>
                </div>
                <button type="submit" className="gradient-btn w-100 py-2">
                  Create Service Center
                </button>
              </form>
            </div>
          </div>

          <div className="col-lg-7">
            <div className="glass-panel p-4">
              <h4 className="fw-bold text-white mb-3">Service Centers Registry</h4>
              {centers.length === 0 ? (
                <p className="text-muted">No service centers found.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-dark table-hover align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Address</th>
                        <th>Phone</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {centers.map((c) => (
                        <tr key={c.id}>
                          <td className="fw-bold text-white">{c.name}</td>
                          <td>{c.address}</td>
                          <td>{c.phone}</td>
                          <td>
                            <span className={`badge ${c.isActive ? 'bg-success' : 'bg-danger'}`}>
                              {c.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-outline-warning btn-sm"
                              onClick={() => handleToggleCenter(c.id)}
                            >
                              Toggle Status
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="glass-panel p-4">
          <h4 className="fw-bold text-white mb-3">User Account Management</h4>
          {users.length === 0 ? (
            <p className="text-muted">No users found.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-dark table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>#{u.id}</td>
                      <td className="fw-bold text-white">{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.phone || 'N/A'}</td>
                      <td>
                        <span className="tab-badge">{u.role}</span>
                      </td>
                      <td>
                        <span className={`badge ${u.isActive ? 'bg-success' : 'bg-danger'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-outline-warning btn-sm"
                          onClick={() => handleToggleUser(u.id)}
                        >
                          Toggle Active
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'applications' && (
        <div className="glass-panel p-4">
          <h4 className="fw-bold text-white mb-3">Service Centre Applications</h4>
          {applications.length === 0 ? (
            <p className="text-muted">No service centre applications received yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-dark table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Service Centre Name</th>
                    <th>Applicant Name</th>
                    <th>Contact Email</th>
                    <th>City / State</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => (
                    <tr key={app.id}>
                      <td>#{app.id}</td>
                      <td className="fw-bold text-primary">{app.serviceCenterName}</td>
                      <td>{app.userName}</td>
                      <td>{app.userEmail}</td>
                      <td>{app.city}, {app.state}</td>
                      <td>
                        <span
                          className={`badge ${
                            app.status === 'APPROVED'
                              ? 'bg-success'
                              : app.status === 'REJECTED'
                              ? 'bg-danger'
                              : 'bg-warning text-dark'
                          }`}
                        >
                          {app.status}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-outline-info btn-sm"
                            onClick={() => {
                              setSelectedApp(app);
                              setActionRemarks(app.remarks || '');
                            }}
                          >
                            <i className="bi bi-eye me-1"></i>View
                          </button>
                          {app.status === 'PENDING' && (
                            <>
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => handleApproveApp(app.id, '')}
                              >
                                Approve
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleRejectApp(app.id, '')}
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Application Details & Action Modal */}
      {selectedApp && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content bg-dark text-white border border-secondary shadow-lg">
              <div className="modal-header border-secondary">
                <h5 className="modal-title fw-bold text-primary">
                  Application #{selectedApp.id} - {selectedApp.serviceCenterName}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setSelectedApp(null)}
                ></button>
              </div>

              <div className="modal-body p-4" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <span className="text-muted small">Application Status: </span>
                    <span
                      className={`badge ms-2 ${
                        selectedApp.status === 'APPROVED'
                          ? 'bg-success'
                          : selectedApp.status === 'REJECTED'
                          ? 'bg-danger'
                          : 'bg-warning text-dark'
                      }`}
                    >
                      {selectedApp.status}
                    </span>
                  </div>
                  <span className="text-muted small">
                    Submitted: {new Date(selectedApp.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="row g-3 mb-4">
                  <div className="col-md-4">
                    <div className="p-3 rounded bg-secondary bg-opacity-25 border border-secondary">
                      <div className="text-muted extra-small">Applicant Name</div>
                      <div className="fw-bold">{selectedApp.userName}</div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="p-3 rounded bg-secondary bg-opacity-25 border border-secondary">
                      <div className="text-muted extra-small">Applicant Email</div>
                      <div className="fw-bold">{selectedApp.userEmail}</div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="p-3 rounded bg-secondary bg-opacity-25 border border-secondary">
                      <div className="text-muted extra-small">Applicant Phone</div>
                      <div className="fw-bold">{selectedApp.userPhone || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                <h6 className="fw-bold text-light mb-2 border-bottom border-secondary pb-1">
                  Service Centre Details
                </h6>
                <p className="mb-1">
                  <strong>Address:</strong> {selectedApp.address}, {selectedApp.city}, {selectedApp.state} - {selectedApp.pincode}
                </p>
                <p className="mb-1">
                  <strong>Working Hours:</strong> {selectedApp.workingHours}
                </p>
                <p className="mb-3">
                  <strong>Services Offered:</strong> {selectedApp.servicesOffered}
                </p>

                <h6 className="fw-bold text-light mb-2 border-bottom border-secondary pb-1 pt-2">
                  Documents & Licensing
                </h6>
                <div className="row g-2 small text-muted mb-3">
                  <div className="col-md-6">GST Number: <strong className="text-white">{selectedApp.gstNumber || 'Not provided'}</strong></div>
                  <div className="col-md-6">Business License: <strong className="text-white">{selectedApp.businessLicense || 'Not provided'}</strong></div>
                  <div className="col-md-6">Reg. Certificate: <strong className="text-white">{selectedApp.registrationCertificate || 'Not provided'}</strong></div>
                  <div className="col-md-6">Garage Photos: <strong className="text-white">{selectedApp.garagePhotos || 'Not provided'}</strong></div>
                </div>

                <div className="mb-3">
                  <label className="form-label text-light small fw-semibold">Admin Remarks</label>
                  <textarea
                    className="form-control bg-dark text-white border-secondary"
                    rows="2"
                    placeholder="Enter review comments or remarks..."
                    value={actionRemarks}
                    onChange={(e) => setActionRemarks(e.target.value)}
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer border-secondary">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setSelectedApp(null)}
                >
                  Close
                </button>
                {selectedApp.status === 'PENDING' && (
                  <>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => handleRejectApp(selectedApp.id, actionRemarks)}
                    >
                      Reject Application
                    </button>
                    <button
                      type="button"
                      className="btn btn-success fw-bold px-4"
                      onClick={() => handleApproveApp(selectedApp.id, actionRemarks)}
                    >
                      Approve & Activate Service Centre
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
