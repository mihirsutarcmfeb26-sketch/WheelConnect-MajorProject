import React, { useState } from 'react';

const PasswordInput = ({
  value,
  onChange,
  placeholder = 'Enter password',
  id = 'password-input',
  name = 'password',
  required = false,
  className = '',
  error = '',
  label,
  autoFocus = false,
  disabled = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="mb-3">
      {label && (
        <label htmlFor={id} className="form-label text-light small fw-semibold">
          {label}
        </label>
      )}
      <div className="input-group">
        <input
          id={id}
          name={name}
          type={showPassword ? 'text' : 'password'}
          className={`form-control bg-dark text-white border-secondary ${error ? 'is-invalid' : ''} ${className}`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          autoFocus={autoFocus}
          disabled={disabled}
        />
        <button
          type="button"
          className="btn btn-outline-secondary text-light px-3"
          onClick={() => setShowPassword(!showPassword)}
          tabIndex="-1"
          title={showPassword ? 'Hide password' : 'Show password'}
        >
          <i className={`bi ${showPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`}></i>
        </button>
      </div>
      {error && <div className="invalid-feedback d-block small mt-1">{error}</div>}
    </div>
  );
};

export default PasswordInput;
