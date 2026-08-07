import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { validateName, validateEmail, validatePhone, validatePassword } from '../validators';
import LocationPickerModal from '../components/LocationPickerModal';
import ServiceCenterApplicationModal from '../components/ServiceCenterApplicationModal';
import ServiceSelector from '../components/ServiceSelector';

const ServiceCenterDashboard = () => {
  const { user } = useAuth();

  const [myCenters, setMyCenters] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState(null);

  const [mechanics, setMechanics] = useState([]);
  const [packages, setPackages] = useState([]);
  const [bookings, setBookings] = useState([]);
  // Real payment status per booking - { [bookingId]: 'PAID' | 'PENDING' } - fetched from
  // payment-service so this is never derived from (and never affected by) booking status.
  const [paymentsByBooking, setPaymentsByBooking] = useState({});
  const [activeTab, setActiveTab] = useState('bookings'); // 'bookings', 'mechanics', 'packages', 'centers'

  // Modals & forms state
  const [showAddCenterModal, setShowAddCenterModal] = useState(false);
  const [showEditCenterModal, setShowEditCenterModal] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Edit center form state
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editLat, setEditLat] = useState(null);
  const [editLng, setEditLng] = useState(null);
  const [editServicesOffered, setEditServicesOffered] = useState([]);

  // Mechanic form
  const [mName, setMName] = useState('');
  const [mEmail, setMEmail] = useState('');
  const [mPhone, setMPhone] = useState('');
  const [mPassword, setMPassword] = useState('');

  // Package form
  const [pName, setPName] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pPrice, setPPrice] = useState('');

  const [loadingCenters, setLoadingCenters] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // 1. Fetch all Service Centers owned by logged-in user
  const fetchMyCenters = async () => {
    setLoadingCenters(true);
    try {
      const resp = await api.get(`/api/service-centers/user/${user.id}`).catch(() => ({ data: [] }));
      let list = Array.isArray(resp.data) ? resp.data : (resp.data ? [resp.data] : []);
      
      // Fallback: If list empty, fetch all and filter by user_id
      if (list.length === 0) {
        const allResp = await api.get('/api/service-centers').catch(() => ({ data: [] }));
        if (Array.isArray(allResp.data)) {
          list = allResp.data.filter((sc) => sc.userId === user.id);
        }
      }

      setMyCenters(list);
      if (list.length > 0) {
        // Retain current selected center if present in new list, else pick first
        setSelectedCenter((prev) => {
          if (!prev) return list[0];
          const found = list.find((c) => c.id === prev.id);
          return found || list[0];
        });
      } else {
        setSelectedCenter(null);
      }
    } catch (err) {
      console.error('Failed to fetch service centers:', err);
    } finally {
      setLoadingCenters(false);
    }
  };

  useEffect(() => {
    fetchMyCenters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Fetch bookings, mechanics, packages when selectedCenter changes
  const loadCenterData = async () => {
    if (!selectedCenter) {
      setMechanics([]);
      setPackages([]);
      setBookings([]);
      return;
    }

    setLoadingBookings(true);
    try {
      const centerId = selectedCenter.id;
      const [mResp, pResp, bResp] = await Promise.all([
        api.get(`/api/users/internal/mechanics/${centerId}`).catch(() => ({ data: [] })),
        api.get(`/api/packages/service-center/${centerId}`).catch(() => ({ data: [] })),
        api.get(`/api/bookings/service-center/${centerId}`).catch(() => ({ data: [] })),
      ]);
      setMechanics(Array.isArray(mResp.data) ? mResp.data : []);
      setPackages(Array.isArray(pResp.data) ? pResp.data : []);
      setBookings(Array.isArray(bResp.data) ? bResp.data : []);
    } catch (err) {
      console.error('Failed to load center data:', err);
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    loadCenterData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCenter]);

  // Best-effort, cached fetch of a single booking's real payment status.
  const ensurePaymentStatusLoaded = async (bookingId) => {
    if (paymentsByBooking[bookingId]) return;
    try {
      const resp = await api.get(`/api/payments/booking/${bookingId}`);
      const paid = resp.data?.status === 'SUCCESS';
      setPaymentsByBooking((prev) => ({ ...prev, [bookingId]: paid ? 'PAID' : 'PENDING' }));
    } catch (err) {
      // No payment record yet (404) or a transient error - either way, not paid.
      setPaymentsByBooking((prev) => ({ ...prev, [bookingId]: 'PENDING' }));
    }
  };

  useEffect(() => {
    bookings.forEach((b) => ensurePaymentStatusLoaded(b.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings]);

  // Handle Edit Service Center submit
  const handleOpenEditCenter = () => {
    if (!selectedCenter) return;
    setEditName(selectedCenter.name || '');
    setEditAddress(selectedCenter.address || '');
    setEditPhone(selectedCenter.phone || '');
    setEditEmail(selectedCenter.email || '');
    setEditLat(selectedCenter.latitude || 19.0760);
    setEditLng(selectedCenter.longitude || 72.8777);
    setEditServicesOffered(Array.isArray(selectedCenter.servicesOffered) ? selectedCenter.servicesOffered : []);
    setShowEditCenterModal(true);
  };

  const handleUpdateCenter = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');

    if (!editName.trim()) return setError('Service Center name is required.');
    if (!selectedCenter) return;

    try {
      await api.put(`/api/service-centers/${selectedCenter.id}`, {
        name: editName.trim(),
        address: editAddress.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        latitude: editLat,
        longitude: editLng,
        isActive: selectedCenter.isActive,
        servicesOffered: editServicesOffered,
      });
      setMsg('Service Center details updated successfully!');
      setShowEditCenterModal(false);
      fetchMyCenters();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update Service Center.');
    }
  };

  // Toggle Service Center active state
  const handleToggleCenterActive = async () => {
    if (!selectedCenter) return;
    try {
      await api.post(`/api/service-centers/${selectedCenter.id}/toggle`);
      setMsg(`Service Center ${selectedCenter.isActive ? 'deactivated' : 'activated'} successfully!`);
      fetchMyCenters();
    } catch (err) {
      setError('Failed to toggle Service Center status.');
    }
  };

  // Create Mechanic
  const handleCreateMechanic = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    if (!selectedCenter) return setError('Please select a Service Center first.');

    const nVal = validateName(mName);
    if (!nVal.valid) return setError(nVal.message);
    const eVal = validateEmail(mEmail);
    if (!eVal.valid) return setError(eVal.message);
    const pVal = validatePhone(mPhone);
    if (!pVal.valid) return setError(pVal.message);
    const passVal = validatePassword(mPassword);
    if (!passVal.valid) return setError(passVal.message);

    try {
      await api.post('/api/users', {
        name: nVal.normalized,
        email: eVal.normalized,
        phone: pVal.normalized,
        password: mPassword,
        role: 'MECHANIC',
        serviceCenterId: selectedCenter.id,
        isActive: true,
      });
      setMsg(`Mechanic account created for ${selectedCenter.name}!`);
      setMName('');
      setMEmail('');
      setMPhone('');
      setMPassword('');
      loadCenterData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create mechanic.');
    }
  };

  // A mechanic is "mid-repair" if they're assigned to a booking that has moved past
  // PENDING/ACCEPTED but hasn't reached a terminal state yet - deactivating them then
  // could interrupt a repair in progress. Uses the same status set the Mechanic
  // Dashboard already owns, so this stays in sync with the actual repair workflow.
  const MECHANIC_ACTIVE_STAGES = [
    'MECHANIC_ASSIGNED', 'IN_PROGRESS', 'INSPECTION_COMPLETED', 'REPAIR_STARTED',
    'QUALITY_CHECK', 'VEHICLE_WASHED', 'READY_FOR_DELIVERY',
  ];
  const mechanicHasBookingInProgress = (mechanicId) =>
    bookings.some((b) => b.mechanicId === mechanicId && MECHANIC_ACTIVE_STAGES.includes(b.status));

  // Activate / Deactivate a mechanic. Reuses the existing generic user-status toggle
  // endpoint (already used by Admin's own User Management) - no new backend endpoint.
  const handleToggleMechanic = async (mechanic) => {
    setError('');
    setMsg('');
    if (mechanic.isActive && mechanicHasBookingInProgress(mechanic.id)) {
      setError(`${mechanic.name} is currently handling a booking in progress and cannot be deactivated until it's completed.`);
      return;
    }
    try {
      await api.post(`/api/users/${mechanic.id}/toggle`);
      setMsg(`${mechanic.name} has been ${mechanic.isActive ? 'deactivated' : 'activated'}.`);
      loadCenterData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update mechanic status.');
    }
  };

  // Create Package
  const handleCreatePackage = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    if (!selectedCenter) return setError('Please select a Service Center first.');

    if (!pName.trim()) return setError('Package name is required.');
    if (!pPrice || Number(pPrice) <= 0) return setError('Price must be greater than 0.');

    try {
      await api.post(`/api/packages/service-center/${selectedCenter.id}`, {
        name: pName.trim(),
        description: pDesc.trim(),
        price: Number(pPrice),
        durationInMinutes: 60,
      });
      setMsg(`Service package created for ${selectedCenter.name}!`);
      setPName('');
      setPDesc('');
      setPPrice('');
      loadCenterData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create package.');
    }
  };

  // Assign Mechanic to Booking
  const handleAssignMechanic = async (bookingId, mechanicId) => {
    if (!mechanicId) return;
    try {
      await api.post(`/api/bookings/${bookingId}/assign-mechanic`, {
        mechanicId: Number(mechanicId),
      });
      setMsg('Mechanic assigned successfully!');
      loadCenterData();
    } catch (err) {
      setError('Failed to assign mechanic.');
    }
  };

  // Update Booking Status
  const handleUpdateBookingStatus = async (bookingId, newStatus) => {
    try {
      await api.put(`/api/bookings/${bookingId}/status`, {
        status: newStatus,
        notes: `Updated status to ${newStatus} by Service Center manager`,
      });
      setMsg(`Booking #${bookingId} status updated to ${newStatus}!`);
      loadCenterData();
    } catch (err) {
      setError('Failed to update booking status.');
    }
  };

  // Compute Dashboard Stats
  const totalBookings = bookings.length;
  const pendingBookings = bookings.filter((b) => b.status === 'PENDING').length;
  const inProgressBookings = bookings.filter(
    (b) => b.status !== 'PENDING' && b.status !== 'CANCELLED' && b.status !== 'COMPLETED'
  ).length;
  const completedBookings = bookings.filter((b) => b.status === 'COMPLETED').length;

  return (
    <div className="container py-4">
      {/* TOP CONTROLS & CENTER SELECTOR */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold text-white mb-1">Service Center Management</h2>
          <p className="text-muted small mb-0">Manage multiple service centers, mechanics, packages, and bookings</p>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2">
          {/* Service Center Selector Dropdown */}
          {myCenters.length > 0 && (
            <div className="input-group input-group-sm" style={{ maxWidth: '280px' }}>
              <span className="input-group-text bg-dark border-secondary text-info fw-bold">Center:</span>
              <select
                className="form-select bg-dark text-white border-secondary fw-semibold"
                value={selectedCenter?.id || ''}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  const found = myCenters.find((c) => c.id === id);
                  if (found) setSelectedCenter(found);
                }}
              >
                {myCenters.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name} ({sc.isActive ? 'Active' : 'Inactive'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Action Buttons
          <button
            type="button"
            className="btn btn-sm btn-outline-info"
            onClick={() => setShowAddCenterModal(true)}
          >
            <i className="bi bi-plus-circle me-1"></i>Add Service Center
          </button> */}

          {selectedCenter && (
            <>
              <button type="button" className="btn btn-sm btn-outline-light" onClick={handleOpenEditCenter}>
                <i className="bi bi-pencil me-1"></i>Edit Center
              </button>
              <button
                type="button"
                className={`btn btn-sm ${selectedCenter.isActive ? 'btn-outline-warning' : 'btn-outline-success'}`}
                onClick={handleToggleCenterActive}
              >
                {selectedCenter.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </>
          )}
        </div>
      </div>

      {msg && <div className="alert alert-success py-2 small mb-3">{msg}</div>}
      {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}

      {/* CENTER OVERVIEW BANNER */}
      {selectedCenter ? (
        <div className="glass-panel p-3 mb-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center border border-secondary">
          <div>
            <span className={`badge ${selectedCenter.isActive ? 'bg-success' : 'bg-danger'} mb-1`}>
              {selectedCenter.isActive ? 'Active Center' : 'Inactive Center'}
            </span>
            <h4 className="fw-bold text-white mb-0">{selectedCenter.name}</h4>
            <span className="text-muted small d-block">
              <i className="bi bi-geo-alt me-1 text-danger"></i>
              {selectedCenter.address || 'Address not configured'}
            </span>
          </div>

          <div className="d-flex gap-3 text-muted small mt-2 mt-md-0">
            <div>
              <i className="bi bi-telephone text-info me-1"></i>
              {selectedCenter.phone || 'N/A'}
            </div>
            <div>
              <i className="bi bi-envelope text-info me-1"></i>
              {selectedCenter.email || 'N/A'}
            </div>
          </div>
        </div>
      ) : (
        <div className="alert alert-warning p-4 mb-4 text-center">
          <h5>No Service Center Found</h5>
          <p className="mb-3">You do not have any registered service centers yet.</p>
          <button className="gradient-btn px-4" onClick={() => setShowAddCenterModal(true)}>
            + Add Your First Service Center
          </button>
        </div>
      )}

      {/* DASHBOARD STATS CARDS */}
      <div className="row g-3 mb-4">
        <div className="col-md-3 col-6">
          <div className="card bg-dark text-white border border-secondary p-3 text-center">
            <div className="text-muted small uppercase">Total Bookings</div>
            <div className="fs-2 fw-bold text-primary">{totalBookings}</div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="card bg-dark text-white border border-secondary p-3 text-center">
            <div className="text-muted small uppercase">Pending Bookings</div>
            <div className="fs-2 fw-bold text-warning">{pendingBookings}</div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="card bg-dark text-white border border-secondary p-3 text-center">
            <div className="text-muted small uppercase">In Progress</div>
            <div className="fs-2 fw-bold text-info">{inProgressBookings}</div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="card bg-dark text-white border border-secondary p-3 text-center">
            <div className="text-muted small uppercase">Completed</div>
            <div className="fs-2 fw-bold text-success">{completedBookings}</div>
          </div>
        </div>
      </div>

      {/* DASHBOARD TABS NAVIGATION */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex gap-2">
          <button
            className={`btn ${activeTab === 'bookings' ? 'gradient-btn' : 'btn-outline-light'}`}
            onClick={() => setActiveTab('bookings')}
          >
            Bookings ({bookings.length})
          </button>
          <button
            className={`btn ${activeTab === 'mechanics' ? 'gradient-btn' : 'btn-outline-light'}`}
            onClick={() => setActiveTab('mechanics')}
          >
            Mechanics ({mechanics.length})
          </button>
          <button
            className={`btn ${activeTab === 'packages' ? 'gradient-btn' : 'btn-outline-light'}`}
            onClick={() => setActiveTab('packages')}
          >
            Packages ({packages.length})
          </button>
          <button
            className={`btn ${activeTab === 'centers' ? 'gradient-btn' : 'btn-outline-light'}`}
            onClick={() => setActiveTab('centers')}
          >
            My Service Centers ({myCenters.length})
          </button>
        </div>
      </div>

      {/* TAB 1: BOOKINGS */}
      {activeTab === 'bookings' && (
        <div className="glass-panel p-4">
          <h4 className="fw-bold text-white mb-3">Assigned Service Bookings</h4>
          {loadingBookings ? (
            <div className="text-center py-4 text-muted">
              <div className="spinner-border spinner-border-sm text-info me-2"></div>
              Loading bookings for {selectedCenter?.name || 'center'}...
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <i className="bi bi-calendar-x display-6 d-block mb-2"></i>
              No bookings assigned to this center yet.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-dark table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Customer Name</th>
                    <th>Vehicle</th>
                    <th>Service Package</th>
                    <th>Booking Date</th>
                    <th>Booking Status</th>
                    <th>Mechanic Progress (Read Only)</th>
                    <th>Payment</th>
                    <th>Action / Mechanic</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => {
                    // Repair-progress values only the Mechanic sets (matches the backend's
                    // own whitelist in BookingController - kept in sync deliberately).
                    const MECHANIC_STAGES = [
                      'MECHANIC_ASSIGNED', 'IN_PROGRESS', 'INSPECTION_COMPLETED', 'REPAIR_STARTED',
                      'QUALITY_CHECK', 'VEHICLE_WASHED', 'READY_FOR_DELIVERY', 'COMPLETED',
                    ];
                    // The Service Center only ever sees a simplified business status - any
                    // of the mechanic's in-between repair stages just reads as "ACCEPTED"
                    // here. This is a display-only projection of the same status field;
                    // it never overwrites what the mechanic actually set.
                    const businessStatus =
                      b.status === 'PENDING' || b.status === 'CANCELLED' || b.status === 'COMPLETED'
                        ? b.status
                        : 'ACCEPTED';
                    const paymentStatus = paymentsByBooking[b.id] || 'PENDING';
                    return (
                      <tr key={b.id}>
                        <td className="fw-bold text-white">#{b.id}</td>
                        <td>
                          <div className="fw-semibold text-info">{b.customerName || `Customer #${b.customerId}`}</div>
                          {b.customerEmail && <div className="text-muted extra-small">{b.customerEmail}</div>}
                        </td>
                        <td>
                          <div className="fw-bold text-white">{b.vehicleModel || 'Vehicle'}</div>
                          <div className="text-muted extra-small">{b.vehicleNumber || `ID: ${b.vehicleId}`}</div>
                        </td>
                        <td>
                          {Array.isArray(b.selectedServices) && b.selectedServices.length > 0 ? (
                            <div className="d-flex flex-wrap gap-1" style={{ maxWidth: '220px' }}>
                              {b.selectedServices.map((s, idx) => (
                                <span key={idx} className="badge bg-secondary text-light extra-small fw-normal">
                                  {s}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="badge bg-secondary text-light">{b.serviceType || b.packageName || 'General Service'}</span>
                          )}
                        </td>
                        <td>{b.bookingDate}</td>
                        <td>
                          <span
                            className={`badge d-block mb-1 ${
                              businessStatus === 'COMPLETED'
                                ? 'bg-success'
                                : businessStatus === 'CANCELLED'
                                ? 'bg-danger'
                                : businessStatus === 'PENDING'
                                ? 'bg-warning text-dark'
                                : 'bg-info text-dark'
                            }`}
                          >
                            {businessStatus}
                          </span>
                          {businessStatus === 'PENDING' && (
                            <div className="d-flex gap-1">
                              <button
                                type="button"
                                className="btn btn-success btn-sm"
                                onClick={() => handleUpdateBookingStatus(b.id, 'ACCEPTED')}
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => handleUpdateBookingStatus(b.id, 'CANCELLED')}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                          {businessStatus === 'ACCEPTED' && (
                            <button
                              type="button"
                              className="btn btn-outline-success btn-sm"
                              onClick={() => handleUpdateBookingStatus(b.id, 'COMPLETED')}
                            >
                              Mark Completed
                            </button>
                          )}
                        </td>
                        <td>
                          {/* Mechanic Progress - read only, the Service Center can view but never edit this */}
                          {MECHANIC_STAGES.includes(b.status) ? (
                            <span className="badge bg-secondary text-light">{b.status.replace(/_/g, ' ')}</span>
                          ) : (
                            <span className="text-muted extra-small">Not started</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${paymentStatus === 'PAID' ? 'bg-success' : 'bg-warning text-dark'}`}>
                            {paymentStatus}
                          </span>
                        </td>
                        <td>
                          {/* Assign Mechanic Dropdown - only active mechanics are offered for
                              a NEW assignment; if this booking's already-assigned mechanic
                              has since been deactivated, they still show here (labeled) so
                              the existing assignment keeps displaying correctly. */}
                          <select
                            className="form-select form-select-sm bg-dark text-white border-secondary"
                            value={b.mechanicId || ''}
                            onChange={(e) => handleAssignMechanic(b.id, e.target.value)}
                          >
                            <option value="">-- Assign Mechanic --</option>
                            {mechanics
                              .filter((m) => m.isActive || m.id === b.mechanicId)
                              .map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name}
                                  {!m.isActive ? ' (Inactive)' : ''}
                                </option>
                              ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MECHANICS */}
      {activeTab === 'mechanics' && (
        <div className="row g-4">
          <div className="col-lg-5">
            <div className="glass-panel p-4">
              <h4 className="fw-bold text-white mb-3">Create Mechanic Account</h4>
              <p className="text-muted small">Creates a mechanic assigned specifically to <strong>{selectedCenter?.name}</strong>.</p>
              <form onSubmit={handleCreateMechanic}>
                <div className="mb-3">
                  <label className="form-label text-light small fw-semibold">Mechanic Name</label>
                  <input
                    type="text"
                    className="form-control bg-dark text-white border-secondary"
                    placeholder="e.g. Vikram Singh"
                    value={mName}
                    onChange={(e) => setMName(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label text-light small fw-semibold">Email</label>
                  <input
                    type="email"
                    className="form-control bg-dark text-white border-secondary"
                    placeholder="vikram@wheelconnect.com"
                    value={mEmail}
                    onChange={(e) => setMEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label text-light small fw-semibold">Phone (+91)</label>
                  <input
                    type="text"
                    className="form-control bg-dark text-white border-secondary"
                    placeholder="9876543210"
                    value={mPhone}
                    onChange={(e) => setMPhone(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="form-label text-light small fw-semibold">Password</label>
                  <input
                    type="password"
                    className="form-control bg-dark text-white border-secondary"
                    placeholder="Password (Min 8 chars)"
                    value={mPassword}
                    onChange={(e) => setMPassword(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="gradient-btn w-100 py-2">
                  Create Mechanic Account
                </button>
              </form>
            </div>
          </div>

          <div className="col-lg-7">
            <div className="glass-panel p-4">
              <h4 className="fw-bold text-white mb-3">Mechanics ({selectedCenter?.name})</h4>
              {mechanics.length === 0 ? (
                <p className="text-muted">No mechanics assigned to this center yet.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-dark table-hover align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mechanics.map((m) => {
                        const blockedByActiveJob = m.isActive && mechanicHasBookingInProgress(m.id);
                        return (
                          <tr key={m.id}>
                            <td className="fw-bold text-white">{m.name}</td>
                            <td>{m.email}</td>
                            <td>{m.phone}</td>
                            <td>
                              <span className={`badge ${m.isActive ? 'bg-success' : 'bg-danger'}`}>
                                {m.isActive ? '🟢 Active' : '🔴 Inactive'}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className={`btn btn-sm ${m.isActive ? 'btn-outline-danger' : 'btn-outline-success'}`}
                                onClick={() => handleToggleMechanic(m)}
                                disabled={blockedByActiveJob}
                                title={blockedByActiveJob ? `${m.name} has a booking in progress and cannot be deactivated right now.` : ''}
                              >
                                {m.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                              {blockedByActiveJob && (
                                <div className="text-warning extra-small mt-1">
                                  <i className="bi bi-exclamation-triangle-fill me-1"></i>
                                  Has a booking in progress
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PACKAGES */}
      {activeTab === 'packages' && (
        <div className="row g-4">
          <div className="col-lg-5">
            <div className="glass-panel p-4">
              <h4 className="fw-bold text-white mb-3">Add Service Package</h4>
              <p className="text-muted small">Add package to catalog for <strong>{selectedCenter?.name}</strong>.</p>
              <form onSubmit={handleCreatePackage}>
                <div className="mb-3">
                  <label className="form-label text-light small fw-semibold">Package Name</label>
                  <input
                    type="text"
                    className="form-control bg-dark text-white border-secondary"
                    placeholder="e.g. Premium Engine Wash & Tune-Up"
                    value={pName}
                    onChange={(e) => setPName(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label text-light small fw-semibold">Description</label>
                  <textarea
                    className="form-control bg-dark text-white border-secondary"
                    rows="3"
                    placeholder="Includes full synthetic oil, filter replacement, spark plug tune..."
                    value={pDesc}
                    onChange={(e) => setPDesc(e.target.value)}
                  ></textarea>
                </div>
                <div className="mb-4">
                  <label className="form-label text-light small fw-semibold">Price (₹)</label>
                  <input
                    type="number"
                    className="form-control bg-dark text-white border-secondary"
                    placeholder="2999"
                    value={pPrice}
                    onChange={(e) => setPPrice(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="gradient-btn w-100 py-2">
                  Create Package
                </button>
              </form>
            </div>
          </div>

          <div className="col-lg-7">
            <div className="glass-panel p-4">
              <h4 className="fw-bold text-white mb-3">Package Catalog ({selectedCenter?.name})</h4>
              {packages.length === 0 ? (
                <p className="text-muted">No service packages added yet.</p>
              ) : (
                <div className="row g-3">
                  {packages.map((pkg) => (
                    <div key={pkg.id} className="col-md-6">
                      <div className="card bg-dark text-white border border-secondary p-3">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <h5 className="fw-bold text-primary mb-0">{pkg.name}</h5>
                          <span className="badge bg-success fs-6">₹{pkg.price}</span>
                        </div>
                        <p className="text-muted small mb-0">{pkg.description || 'No description'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MY SERVICE CENTERS */}
      {activeTab === 'centers' && (
        <div className="glass-panel p-4">
          {/* <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="fw-bold text-white mb-0">My Service Centers</h4>
            <button className="btn btn-sm btn-info fw-bold" onClick={() => setShowAddCenterModal(true)}>
              + Register Another Service Center
            </button>
          </div> */}

          {myCenters.length === 0 ? (
            <div className="text-center py-4 text-muted">No Service Centers registered yet.</div>
          ) : (
            <div className="row g-3">
              {myCenters.map((sc) => (
                <div key={sc.id} className="col-md-6 col-lg-4">
                  <div
                    className={`card text-white p-3 border ${
                      selectedCenter?.id === sc.id ? 'border-info bg-dark bg-opacity-75' : 'border-secondary bg-dark'
                    }`}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h5 className="fw-bold text-white mb-0">{sc.name}</h5>
                      <span className={`badge ${sc.isActive ? 'bg-success' : 'bg-danger'}`}>
                        {sc.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-muted small mb-2">{sc.address}</p>
                    <div className="text-muted extra-small mb-2">
                      <div>Phone: {sc.phone || 'N/A'}</div>
                      <div>Email: {sc.email || 'N/A'}</div>
                      <div>Coords: ({sc.latitude || 19.076}, {sc.longitude || 72.877})</div>
                    </div>
                    {Array.isArray(sc.servicesOffered) && sc.servicesOffered.length > 0 && (
                      <div className="d-flex flex-wrap gap-1 mb-3">
                        {sc.servicesOffered.slice(0, 4).map((s, idx) => (
                          <span key={idx} className="badge bg-secondary extra-small fw-normal">
                            {s}
                          </span>
                        ))}
                        {sc.servicesOffered.length > 4 && (
                          <span className="badge bg-secondary extra-small fw-normal">
                            +{sc.servicesOffered.length - 4} more
                          </span>
                        )}
                      </div>
                    )}

                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-sm btn-outline-info flex-grow-1"
                        onClick={() => {
                          setSelectedCenter(sc);
                          setActiveTab('bookings');
                        }}
                      >
                        Manage Center
                      </button>
                      <button
                        className="btn btn-sm btn-outline-light"
                        onClick={() => {
                          setSelectedCenter(sc);
                          handleOpenEditCenter();
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* EDIT SERVICE CENTER MODAL */}
      {showEditCenterModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content bg-dark text-white border border-secondary shadow-lg">
              <div className="modal-header border-secondary">
                <h5 className="modal-title fw-bold text-info">Edit Service Center Details</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowEditCenterModal(false)}></button>
              </div>

              <form onSubmit={handleUpdateCenter}>
                <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                  <div className="mb-3">
                    <label className="form-label text-light small fw-semibold">Service Center Name</label>
                    <input
                      type="text"
                      className="form-control bg-secondary text-white border-0"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-light small fw-semibold">Address</label>
                    <textarea
                      className="form-control bg-secondary text-white border-0"
                      rows="2"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                    ></textarea>
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label text-light small fw-semibold">Phone</label>
                      <input
                        type="text"
                        className="form-control bg-secondary text-white border-0"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-light small fw-semibold">Email</label>
                      <input
                        type="email"
                        className="form-control bg-secondary text-white border-0"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Location Picker launcher */}
                  <div className="p-2 bg-secondary bg-opacity-25 rounded mb-3 border border-secondary d-flex justify-content-between align-items-center">
                    <div className="extra-small text-muted">
                      Coordinates: ({editLat ? editLat.toFixed(4) : 'N/A'}, {editLng ? editLng.toFixed(4) : 'N/A'})
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline-info btn-xs"
                      onClick={() => setShowLocationPicker(true)}
                    >
                      🗺 Pick on Map
                    </button>
                  </div>

                  {/* Services Offered - predefined checkboxes + unlimited custom services */}
                  <h6 className="fw-bold text-light mb-2 border-bottom border-secondary pb-2">Services Offered</h6>
                  <div className="p-3 bg-secondary bg-opacity-10 border border-secondary rounded">
                    <ServiceSelector selectedServices={editServicesOffered} onChange={setEditServicesOffered} />
                  </div>
                </div>

                <div className="modal-footer border-secondary">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowEditCenterModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success fw-bold">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ADD SERVICE CENTER MODAL */}
      {showAddCenterModal && (
        <ServiceCenterApplicationModal
          onClose={() => setShowAddCenterModal(false)}
          onSuccess={() => {
            setShowAddCenterModal(false);
            setMsg('Service Center application submitted!');
            fetchMyCenters();
          }}
        />
      )}

      {/* LOCATION PICKER MODAL FOR EDIT */}
      {showLocationPicker && (
        <LocationPickerModal
          onClose={() => setShowLocationPicker(false)}
          onConfirm={(loc) => {
            if (loc.latitude) setEditLat(loc.latitude);
            if (loc.longitude) setEditLng(loc.longitude);
            if (loc.address) setEditAddress(loc.address);
          }}
          initialLat={editLat || 19.0760}
          initialLng={editLng || 72.8777}
        />
      )}
    </div>
  );
};

export default ServiceCenterDashboard;