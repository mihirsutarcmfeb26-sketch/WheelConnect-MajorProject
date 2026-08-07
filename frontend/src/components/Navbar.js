import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, isAuthenticated, clearAuth, getRole } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    // Tab-isolated logout clearing ONLY current tab's sessionStorage
    clearAuth();
    navigate('/login');
  };

  const role = getRole();

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark border-bottom border-secondary py-3">
      <div className="container">
        <Link className="navbar-brand d-flex align-items-center gap-2 fw-bold text-primary fs-4" to="/">
          <i className="bi bi-shield-check text-purple"></i>
          WheelConnect
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarContent"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarContent">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0 ms-lg-4">
            {isAuthenticated() && (
              <>
                <li className="nav-item">
                  <Link className="nav-link text-light" to="/dashboard">
                    Dashboard
                  </Link>
                </li>
                {role === 'CUSTOMER' && (
                  <>
                    <li className="nav-item">
                      <Link className="nav-link text-light" to="/vehicles">
                        My Vehicles
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link text-light" to="/book-service">
                        Book Service & Maps
                      </Link>
                    </li>
                  </>
                )}
                {role === 'SERVICE_CENTER' && (
                  <>
                    <li className="nav-item">
                      <Link className="nav-link text-light" to="/mechanics">
                        Mechanics
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link text-light" to="/packages">
                        Packages
                      </Link>
                    </li>
                  </>
                )}
              </>
            )}
          </ul>

          <div className="d-flex align-items-center gap-3">
            {isAuthenticated() ? (
              <>
                <div className="text-end me-2">
                  <span className="d-block fw-semibold text-white">{user?.name || user?.email}</span>
                  <span className="tab-badge">{role}</span>
                </div>
                <button onClick={handleLogout} className="btn btn-outline-danger btn-sm rounded-pill px-3">
                  Logout (This Tab)
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-outline-light rounded-pill px-4">
                  Login
                </Link>
                <Link to="/register" className="gradient-btn text-decoration-none">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
