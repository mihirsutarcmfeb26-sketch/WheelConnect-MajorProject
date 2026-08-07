import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import GoogleMapPicker from '../components/GoogleMapPicker';
import ServiceCenterMap from '../components/ServiceCenterMap';
import ChatWindow from '../components/ChatWindow';
import AdditionalChargeApproval from '../components/AdditionalChargeApproval';
import PaymentCheckoutModal from '../components/PaymentCheckoutModal';
import PaymentHistory from '../components/PaymentHistory';
import ServiceCenterApplicationModal from '../components/ServiceCenterApplicationModal';
import PackageCard from '../components/PackageCard';
import { matchSelectedPackages, formatPrice } from '../utils/packageDisplay';
import { validateVehicleNumber } from '../validators';

const CustomerDashboard = () => {
  const { user, setAuth, getToken } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);
  // Payment records for the current customer's bookings, fetched independently of booking
  // status. Whether "Pay Now" shows for a booking depends only on this - never on
  // booking.status - see the paidBookingIds lookup used below.
  const [payments, setPayments] = useState([]);
  const [activeTab, setActiveTab] = useState('bookings'); // 'bookings', 'vehicles', 'new-booking', 'find-centers', 'payments'
  const [activePaymentBooking, setActivePaymentBooking] = useState(null);

  // Service Center Application state
  const [application, setApplication] = useState(null);
  const [showAppModal, setShowAppModal] = useState(false);

  // Vehicle form
  const [vehNumber, setVehNumber] = useState('');
  const [vehModel, setVehModel] = useState('');
  const [vehType, setVehType] = useState('Sedan');
  const [lookupMsg, setLookupMsg] = useState('');

  // Booking form
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedCenterId, setSelectedCenterId] = useState('');
  const [selectedCenterObj, setSelectedCenterObj] = useState(null);
  const [bookingSelectedServices, setBookingSelectedServices] = useState([]);
  const [bookingDate, setBookingDate] = useState('');
  const [description, setDescription] = useState('');

  // Service Package details, cached per service center id, purely for display -
  // { [serviceCenterId]: ServicePackage[] }. Populated via the already-public
  // GET /api/packages/service-center/{id} endpoint; never affects booking
  // submission or payment amount, which are computed exactly as before.
  const [packagesByCenter, setPackagesByCenter] = useState({});

  // Chat modal
  const [activeChatBookingId, setActiveChatBookingId] = useState(null);
  // Tracks which bookings currently have their matched package details expanded.
  const [expandedPackageBookingIds, setExpandedPackageBookingIds] = useState(new Set());

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const fetchApplicationStatus = async () => {
    if (!user?.id) return;
    try {
      const resp = await api.get(`/api/service-centers/applications/my?userId=${user.id}`);
      setApplication(resp.data);
    } catch (err) {
      // Application not found yet
      setApplication(null);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [vResp, bResp, pResp] = await Promise.all([
        api.get('/api/vehicles/my'),
        api.get('/api/bookings/my'),
        // Powers Pay Now visibility below - kept separate from booking status entirely.
        // Falls back to an empty list on failure rather than hiding Pay Now everywhere.
        api.get('/api/payments/my').catch(() => ({ data: [] })),
      ]);
      setVehicles(vResp.data);
      setBookings(bResp.data);
      setPayments(pResp.data);
      await fetchApplicationStatus();
    } catch (err) {
      console.error('Failed to load customer dashboard data:', err);
      setError('Could not load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const handleManageServiceCenter = async () => {
    try {
      const meResp = await api.get('/api/users/me');
      setAuth(getToken(), meResp.data);
      window.location.href = '/dashboard';
    } catch {
      window.location.href = '/dashboard';
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Best-effort: as bookings load, also fetch package details for whichever
  // service centers they reference, so "My Bookings" can show what's included.
  useEffect(() => {
    const uniqueCenterIds = [...new Set(bookings.map((b) => b.serviceCenterId).filter(Boolean))];
    uniqueCenterIds.forEach((id) => ensurePackagesLoaded(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings]);

  const handleVehicleLookup = async () => {
    if (!vehNumber.trim()) return;
    setLookupMsg('Searching vehicle registry...');
    try {
      const resp = await api.get(`/api/vehicles/lookup?vehicleNumber=${encodeURIComponent(vehNumber.trim())}`);
      if (resp.data.found) {
        setVehModel(resp.data.vehicleModel || '');
        setVehType(resp.data.vehicleType || 'Sedan');
        setLookupMsg(`Auto-filled model & type from ${resp.data.source}!`);
      } else {
        setLookupMsg(resp.data.source || 'Vehicle not found. Please enter details manually.');
      }
    } catch {
      setLookupMsg('Lookup unavailable. Please enter details manually.');
    }
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');

    const vVal = validateVehicleNumber(vehNumber);
    if (!vVal.valid) {
      setError(vVal.message);
      return;
    }
    if (!vehModel.trim()) {
      setError('Vehicle model is required.');
      return;
    }

    try {
      await api.post('/api/vehicles', {
        vehicleNumber: vVal.normalized,
        vehicleModel: vehModel.trim(),
        vehicleType: vehType,
      });
      setMsg('Vehicle registered successfully!');
      setVehNumber('');
      setVehModel('');
      setLookupMsg('');
      loadData();
      setActiveTab('vehicles');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add vehicle.');
    }
  };

  // Fetches and caches a service center's active packages (for display only - see
  // packagesByCenter above). Best-effort: a failure here never blocks booking or
  // payment, it just means package details won't show for that center.
  const ensurePackagesLoaded = async (serviceCenterId) => {
    if (!serviceCenterId || packagesByCenter[serviceCenterId]) return;
    try {
      const resp = await api.get(`/api/packages/service-center/${serviceCenterId}`);
      setPackagesByCenter((prev) => ({ ...prev, [serviceCenterId]: resp.data || [] }));
    } catch (err) {
      console.error('Failed to load package details for service center', serviceCenterId, err);
    }
  };

  // Shared handler for picking a service center from either the map or the list -
  // keeps the full center object (not just the id) so we know its available services.
  const handleSelectCenter = (id, center) => {
    setSelectedCenterId(id);
    if (center) {
      setSelectedCenterObj(center);
      setBookingSelectedServices([]); // start fresh whenever the center changes
      ensurePackagesLoaded(id);
    }
  };

  const handleToggleBookingService = (service) => {
    setBookingSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  };

  const togglePackageDetails = (bookingId) => {
    setExpandedPackageBookingIds((prev) => {
      const next = new Set(prev);
      if (next.has(bookingId)) next.delete(bookingId);
      else next.add(bookingId);
      return next;
    });
  };

  const handleBookService = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');

    if (!selectedVehicleId) {
      setError('Please select a vehicle.');
      return;
    }
    if (!selectedCenterId) {
      setError('Please select a service center from the map or list.');
      return;
    }
    if (!bookingDate) {
      setError('Please select a booking date.');
      return;
    }
    if (bookingSelectedServices.length === 0) {
      setError('Please select at least one service you need.');
      return;
    }

    try {
      await api.post('/api/bookings', {
        vehicleId: Number(selectedVehicleId),
        serviceCenterId: Number(selectedCenterId),
        bookingDate: bookingDate,
        selectedServices: bookingSelectedServices,
        description: description,
      });
      setMsg('Service booked successfully!');
      setDescription('');
      setBookingSelectedServices([]);
      loadData();
      setActiveTab('bookings');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to book service.');
    }
  };

  const handleCancelBooking = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this pending booking?')) return;
    try {
      await api.delete(`/api/bookings/${id}/cancel`);
      setMsg('Booking cancelled successfully.');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel booking.');
    }
  };

  // A booking is "paid" only if payment-service has a SUCCESS record for it - booking
  // status (PENDING, ACCEPTED, IN_PROGRESS, COMPLETED, ...) never factors into this.
  const paidBookingIds = new Set(
    payments.filter((p) => p.status === 'SUCCESS').map((p) => p.bookingId)
  );

  // Packages for the service center currently selected in the booking form (display only).
  const currentCenterPackages = packagesByCenter[selectedCenterId] || [];
  const findPackageByServiceName = (packages, serviceName) =>
    (packages || []).find((p) => (p.name || '').trim().toLowerCase() === (serviceName || '').trim().toLowerCase());
  const selectedPackagesPreview = bookingSelectedServices
    .map((s) => findPackageByServiceName(currentCenterPackages, s))
    .filter(Boolean);
  const selectedPackagesTotal = selectedPackagesPreview.reduce((sum, p) => sum + Number(p.price || 0), 0);

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold text-white mb-1">Customer Service Portal</h2>
          <p className="text-muted small mb-0">Manage your vehicles, book services, and track real-time repairs</p>
        </div>
        <div className="d-flex gap-2">
          <button
            className={`btn ${activeTab === 'find-centers' ? 'gradient-btn' : 'btn-outline-info'}`}
            onClick={() => setActiveTab('find-centers')}
          >
            <i className="bi bi-geo-alt me-2"></i>Find Service Centres
          </button>
          <button
            className={`btn ${activeTab === 'bookings' ? 'gradient-btn' : 'btn-outline-light'}`}
            onClick={() => setActiveTab('bookings')}
          >
            <i className="bi bi-calendar-check me-2"></i>My Bookings ({bookings.length})
          </button>
          <button
            className={`btn ${activeTab === 'payments' ? 'gradient-btn' : 'btn-outline-warning'}`}
            onClick={() => setActiveTab('payments')}
          >
            <i className="bi bi-credit-card me-2"></i>My Payments
          </button>
          <button
            className={`btn ${activeTab === 'vehicles' ? 'gradient-btn' : 'btn-outline-light'}`}
            onClick={() => setActiveTab('vehicles')}
          >
            <i className="bi bi-car-front me-2"></i>My Vehicles ({vehicles.length})
          </button>
          <button
            className={`btn ${activeTab === 'new-booking' ? 'gradient-btn' : 'btn-outline-success'}`}
            onClick={() => setActiveTab('new-booking')}
          >
            <i className="bi bi-plus-circle me-2"></i>Book New Service
          </button>

          {/* Become a Service Centre / Application Status Option */}
          {application?.status === 'APPROVED' ? (
            <button className="btn btn-success fw-semibold" onClick={handleManageServiceCenter}>
              <i className="bi bi-speedometer2 me-2"></i>Manage Service Centre
            </button>
          ) : application?.status === 'PENDING' ? (
            <button className="btn btn-warning text-dark fw-bold opacity-100" disabled>
              <i className="bi bi-clock-history me-2"></i>Application Pending
            </button>
          ) : application?.status === 'REJECTED' ? (
            <div className="d-flex align-items-center gap-1">
              <span className="badge bg-danger py-2 px-2 small">Application Rejected</span>
              <button className="btn btn-outline-primary" onClick={() => setShowAppModal(true)}>
                <i className="bi bi-arrow-clockwise me-1"></i>Apply Again
              </button>
            </div>
          ) : (
            <button className="btn btn-outline-primary" onClick={() => setShowAppModal(true)}>
              <i className="bi bi-building me-2"></i>Become a Service Centre
            </button>
          )}
        </div>
      </div>

      {msg && <div className="alert alert-success py-2 small mb-3">{msg}</div>}
      {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}

      {/* TABS */}
      {activeTab === 'payments' && <PaymentHistory />}

      {activeTab === 'find-centers' && (
        <ServiceCenterMap
          onSelectCenter={(id, center) => {
            handleSelectCenter(id, center);
            setActiveTab('new-booking');
          }}
        />
      )}

      {activeTab === 'bookings' && (
        <div className="glass-panel p-4">
          <h4 className="fw-bold text-white mb-3">Service Bookings & Live Tracking</h4>
          {loading ? (
            <div className="text-center py-4 text-muted">Loading bookings...</div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-calendar-x display-4 d-block mb-3"></i>
              No active or past bookings. Click "Book New Service" to schedule a repair.
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {bookings.map((b) => (
                <div key={b.id} className="card bg-dark text-white border border-secondary p-3">
                  <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-2 mb-2">
                    <div>
                      <h5 className="fw-bold text-primary mb-1">
                        Booking #{b.id} – {b.serviceType}
                      </h5>
                      <span className="text-muted small">
                        Vehicle: <strong className="text-white">{b.vehicleNumber || 'Vehicle #' + b.vehicleId}</strong> ({b.vehicleModel})
                      </span>
                      {Array.isArray(b.selectedServices) && b.selectedServices.length > 0 && (
                        <div className="d-flex flex-wrap gap-1 mt-2">
                          {b.selectedServices.map((s, idx) => (
                            <span key={idx} className="badge bg-secondary extra-small fw-normal">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                      {(() => {
                        const matchedPkgs = matchSelectedPackages(packagesByCenter[b.serviceCenterId], b.selectedServices);
                        if (matchedPkgs.length === 0) return null;
                        const isExpanded = expandedPackageBookingIds.has(b.id);
                        return (
                          <div className="mt-2">
                            <button
                              type="button"
                              className="btn btn-link btn-sm text-info p-0"
                              onClick={() => togglePackageDetails(b.id)}
                            >
                              <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'} me-1`}></i>
                              {isExpanded ? 'Hide' : 'View'} Package Details
                            </button>
                            {isExpanded && (
                              <div className="row g-4 mt-1">
                                {matchedPkgs.map((pkg) => (
                                  <div key={pkg.id} className="col-12">
                                          <PackageCard pkg={pkg} selected compact />
                                      </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <span className={`status-badge status-${b.status}`}>
                        {b.status.replace(/_/g, ' ')}
                      </span>
                      {!paidBookingIds.has(b.id) && (
                        <button
                          className="btn btn-warning btn-sm fw-bold px-3"
                          onClick={() => setActivePaymentBooking(b)}
                        >
                          <i className="bi bi-credit-card-fill me-1"></i> Pay Now
                        </button>
                      )}
                      {(b.status === 'PENDING' || b.status === 'PENDING_PAYMENT') && (
                        <button
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => handleCancelBooking(b.id)}
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => setActiveChatBookingId(b.id)}
                      >
                        <i className="bi bi-chat-dots me-1"></i> Live Chat
                      </button>
                    </div>
                  </div>

                  <div className="row g-2 small text-muted my-1">
                    <div className="col-6 col-md-3">
                      <i className="bi bi-calendar-event me-1"></i> Date: <strong className="text-white">{b.bookingDate}</strong>
                    </div>
                    <div className="col-6 col-md-3">
                      <i className="bi bi-clock me-1"></i> Requested: {new Date(b.createdAt).toLocaleDateString()}
                    </div>
                    <div className="col-12 col-md-6">
                      <i className="bi bi-card-text me-1"></i> Notes: {b.notes || 'No mechanic notes yet.'}
                    </div>
                  </div>

                  {/* Customer Additional Charge Approval Section */}
                  <AdditionalChargeApproval bookingId={b.id} isCustomer={true} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'vehicles' && (
        <div className="row g-4">
          <div className="col-lg-5">
            <div className="glass-panel p-4">
              <h4 className="fw-bold text-white mb-3">Add / Register Vehicle</h4>
              <form onSubmit={handleAddVehicle}>
                <div className="mb-3">
                  <label className="form-label text-light small fw-semibold">
                    Registration Number & Auto-Lookup
                  </label>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control bg-dark text-white border-secondary"
                      placeholder="e.g. MH12AB1234"
                      value={vehNumber}
                      onChange={(e) => setVehNumber(e.target.value.toUpperCase())}
                      required
                    />
                    <button
                      type="button"
                      className="btn btn-outline-info"
                      onClick={handleVehicleLookup}
                    >
                      Lookup
                    </button>
                  </div>
                  {lookupMsg && <div className="form-text text-info extra-small mt-1">{lookupMsg}</div>}
                </div>

                <div className="mb-3">
                  <label className="form-label text-light small fw-semibold">Vehicle Model</label>
                  <input
                    type="text"
                    className="form-control bg-dark text-white border-secondary"
                    placeholder="e.g. Honda City"
                    value={vehModel}
                    onChange={(e) => setVehModel(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label text-light small fw-semibold">Vehicle Type</label>
                  <select
                    className="form-select bg-dark text-white border-secondary"
                    value={vehType}
                    onChange={(e) => setVehType(e.target.value)}
                  >
                    <option value="Sedan">Sedan</option>
                    <option value="Hatchback">Hatchback</option>
                    <option value="SUV">SUV</option>
                    <option value="Compact SUV">Compact SUV</option>
                    <option value="Off-Roader">Off-Roader</option>
                    <option value="Bike/Two-Wheeler">Bike / Two-Wheeler</option>
                  </select>
                </div>

                <button type="submit" className="gradient-btn w-100 py-2">
                  Register Vehicle
                </button>
              </form>
            </div>
          </div>

          <div className="col-lg-7">
            <div className="glass-panel p-4">
              <h4 className="fw-bold text-white mb-3">Registered Vehicles</h4>
              {vehicles.length === 0 ? (
                <p className="text-muted">No vehicles registered yet. Register your vehicle on the left.</p>
              ) : (
                <div className="row g-3">
                  {vehicles.map((v) => (
                    <div key={v.id} className="col-md-6">
                      <div className="card bg-dark text-white border border-secondary p-3">
                        <h5 className="fw-bold text-primary mb-1">{v.vehicleNumber}</h5>
                        <p className="mb-1">{v.vehicleModel}</p>
                        <span className="badge bg-secondary style-badge">{v.vehicleType}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'new-booking' && (
        <div className="row g-4">
          <div className="col-lg-12">
            {/* Interactive map for discovering & selecting a nearby service center */}
            <GoogleMapPicker
              onSelectCenter={handleSelectCenter}
              selectedCenterId={selectedCenterId}
            />

            <div className="glass-panel p-4">
              <h4 className="fw-bold text-white mb-3">Complete Booking Form</h4>
              <form onSubmit={handleBookService}>
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label text-light small fw-semibold">Select Your Vehicle</label>
                    <select
                      className="form-select bg-dark text-white border-secondary"
                      value={selectedVehicleId}
                      onChange={(e) => setSelectedVehicleId(e.target.value)}
                      required
                    >
                      <option value="">-- Choose Registered Vehicle --</option>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.vehicleNumber} ({v.vehicleModel})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-light small fw-semibold">Service Date</label>
                    <input
                      type="date"
                      className="form-control bg-dark text-white border-secondary"
                      min={new Date().toISOString().split('T')[0]}
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label text-light small fw-semibold d-block mb-2">
                    Available Services {selectedCenterObj?.name ? `at ${selectedCenterObj.name}` : ''}
                  </label>
                  {!selectedCenterObj ? (
                    <div className="alert alert-secondary py-2 small mb-0">
                      Select a service center above to see the services it offers.
                    </div>
                  ) : !Array.isArray(selectedCenterObj.availableServices) || selectedCenterObj.availableServices.length === 0 ? (
                    <div className="alert alert-secondary py-2 small mb-0">
                      This center hasn't listed its services yet. Please describe what you need below.
                    </div>
                  ) : (
                    (() => {
                      // Split into services backed by a real priced package (shown as
                      // rich cards with what's included) vs. plain ad hoc services
                      // (shown exactly as before, as simple checkboxes).
                      const packageServices = selectedCenterObj.availableServices.filter((s) =>
                        findPackageByServiceName(currentCenterPackages, s)
                      );
                      const otherServices = selectedCenterObj.availableServices.filter(
                        (s) => !findPackageByServiceName(currentCenterPackages, s)
                      );
                      return (
                        <>
                          {packageServices.length > 0 && (
                            <div className="mb-3">
                              <p className="text-muted small mb-2">
                                <i className="bi bi-info-circle me-1"></i>
                                Choose a package to see exactly what's included before booking.
                              </p>
                              <div className="row g-3">
                                {packageServices.map((service) => {
                                  const pkg = findPackageByServiceName(currentCenterPackages, service);
                                  const checked = bookingSelectedServices.includes(service);
                                  return (
                                    <div key={service} className="col-md-6 col-lg-4">
                                      <PackageCard
                                        pkg={pkg}
                                        selected={checked}
                                        onSelect={() => handleToggleBookingService(service)}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {otherServices.length > 0 && (
                            <div className="p-3 bg-dark bg-opacity-75 border border-secondary rounded">
                              {packageServices.length > 0 && (
                                <p className="text-muted extra-small mb-2 text-uppercase fw-semibold">Other Services</p>
                              )}
                              <div className="row g-2">
                                {otherServices.map((service) => {
                                  const inputId = `booking-svc-${service}`;
                                  const checked = bookingSelectedServices.includes(service);
                                  return (
                                    <div key={service} className="col-md-4 col-6">
                                      {/* <div className="form-check">
                                        <input
                                          className="form-check-input"
                                          type="checkbox"
                                          id={inputId}
                                          checked={checked}
                                          onChange={() => handleToggleBookingService(service)}
                                        />
                                        <label className="form-check-label small text-light" htmlFor={inputId}>
                                          {service}
                                        </label>
                                      </div> */}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()
                  )}
                </div>

                {selectedPackagesPreview.length > 0 && (
                  <div className="mb-4">
                    <div className="card bg-secondary bg-opacity-25 border border-secondary p-3">
                      <h6 className="fw-bold text-white mb-2">
                        <i className="bi bi-clipboard-check me-1"></i>Booking Summary
                      </h6>
                      {selectedPackagesPreview.map((p) => (
                        <div key={p.id} className="d-flex justify-content-between small text-muted mb-1">
                          <span>{p.name}</span>
                          <span className="text-white">₹{formatPrice(p.price)}</span>
                        </div>
                      ))}
                      <hr className="my-2 border-secondary" />
                      <div className="d-flex justify-content-between fw-bold text-white">
                        <span>Estimated Total:</span>
                        <span className="text-success">₹{formatPrice(selectedPackagesTotal)}</span>
                      </div>
                      <p className="text-muted extra-small mb-0 mt-1">
                        Final amount is confirmed at checkout.
                      </p>
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <label className="form-label text-light small fw-semibold">Problem Notes / Special Instructions</label>
                  <textarea
                    className="form-control bg-dark text-white border-secondary"
                    rows="3"
                    placeholder="Describe any issues or noise with your vehicle..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  ></textarea>
                </div>

                <button type="submit" className="gradient-btn w-100 py-3 fs-5">
                  Confirm & Schedule Service Booking
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {activeChatBookingId && (
        <div className="position-fixed bottom-0 end-0 m-4 z-3" style={{ width: '380px' }}>
          <ChatWindow
            bookingId={activeChatBookingId}
            onClose={() => setActiveChatBookingId(null)}
          />
        </div>
      )}

      {/* Razorpay Payment Modal */}
      {activePaymentBooking && (
        <PaymentCheckoutModal
          booking={activePaymentBooking}
          onClose={() => setActivePaymentBooking(null)}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {/* Service Center Application Form Modal */}
      {showAppModal && (
        <ServiceCenterApplicationModal
          onClose={() => setShowAppModal(false)}
          onSuccess={() => {
            setMsg('Service Centre Application submitted successfully! Status is currently PENDING review.');
            loadData();
          }}
        />
      )}
    </div>
  );
};

export default CustomerDashboard;
