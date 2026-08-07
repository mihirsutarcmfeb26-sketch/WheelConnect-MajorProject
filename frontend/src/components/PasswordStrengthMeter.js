import React from 'react';
import { getPasswordStrength } from '../validators';

const PasswordStrengthMeter = ({ password }) => {
  if (!password) return null;

  const strength = getPasswordStrength(password);

  const getBadgeClass = () => {
    switch (strength.color) {
      case 'danger':
        return 'bg-danger';
      case 'warning':
        return 'bg-warning text-dark';
      case 'success':
        return 'bg-success';
      default:
        return 'bg-secondary';
    }
  };

  const getProgressClass = () => {
    switch (strength.color) {
      case 'danger':
        return 'bg-danger';
      case 'warning':
        return 'bg-warning';
      case 'success':
        return 'bg-success';
      default:
        return 'bg-secondary';
    }
  };

  return (
    <div className="mt-2 mb-3">
      <div className="d-flex justify-content-between align-items-center mb-1">
        <span className="small text-muted">Password Strength</span>
        <span className={`badge ${getBadgeClass()} fw-bold px-2 py-1`}>
          {strength.label}
        </span>
      </div>

      <div className="progress bg-secondary" style={{ height: '6px' }}>
        <div
          className={`progress-bar ${getProgressClass()} transition-all`}
          role="progressbar"
          style={{ width: `${strength.percent}%` }}
          aria-valuenow={strength.percent}
          aria-valuemin="0"
          aria-valuemax="100"
        ></div>
      </div>

      <div className="row g-1 mt-2 extra-small text-muted">
        <div className={`col-6 ${strength.checks.length ? 'text-success fw-semibold' : ''}`}>
          <i className={`bi ${strength.checks.length ? 'bi-check-circle-fill me-1' : 'bi-circle me-1'}`}></i>
          Min 8 characters
        </div>
        <div className={`col-6 ${strength.checks.uppercase ? 'text-success fw-semibold' : ''}`}>
          <i className={`bi ${strength.checks.uppercase ? 'bi-check-circle-fill me-1' : 'bi-circle me-1'}`}></i>
          1 Uppercase (A-Z)
        </div>
        <div className={`col-6 ${strength.checks.lowercase ? 'text-success fw-semibold' : ''}`}>
          <i className={`bi ${strength.checks.lowercase ? 'bi-check-circle-fill me-1' : 'bi-circle me-1'}`}></i>
          1 Lowercase (a-z)
        </div>
        <div className={`col-6 ${strength.checks.number ? 'text-success fw-semibold' : ''}`}>
          <i className={`bi ${strength.checks.number ? 'bi-check-circle-fill me-1' : 'bi-circle me-1'}`}></i>
          1 Number (0-9)
        </div>
        <div className="col-12 mt-1">
          <span className={strength.checks.special ? 'text-success fw-semibold' : ''}>
            <i className={`bi ${strength.checks.special ? 'bi-check-circle-fill me-1' : 'bi-circle me-1'}`}></i>
            1 Special Character (@$!%*?&#)
          </span>
        </div>
      </div>
    </div>
  );
};

export default PasswordStrengthMeter;
