import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import PasswordInput from '../components/PasswordInput';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';
import OtpInputGroup from '../components/OtpInputGroup';
import {
  validateName,
  validateEmail,
  validatePhone,
  validatePassword,
  validateConfirmPassword,
} from '../validators';

const Register = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState('FORM'); // 'FORM' or 'OTP'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Field inline error states
  const [errors, setErrors] = useState({});

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const newErrors = {};

    const nameVal = validateName(name);
    if (!nameVal.valid) newErrors.name = nameVal.message;

    const emailVal = validateEmail(email);
    if (!emailVal.valid) newErrors.email = emailVal.message;

    const phoneVal = validatePhone(phone, countryCode);
    if (!phoneVal.valid) newErrors.phone = phoneVal.message;

    const passVal = validatePassword(password);
    if (!passVal.valid) newErrors.password = passVal.message;

    const confirmVal = validateConfirmPassword(password, confirmPassword);
    if (!confirmVal.valid) newErrors.confirmPassword = confirmVal.message;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      const resp = await api.post('/api/auth/register', {
        name: nameVal.normalized,
        email: emailVal.normalized,
        phone: phoneVal.normalized,
        password: password,
        role: 'CUSTOMER',
      });

      if (resp.data.requiresOtp) {
        setStep('OTP');
        setSuccess(resp.data.message || 'OTP verification code sent to your email.');
      } else {
        navigate('/login', {
          state: { message: 'Registration successful! Please sign in with your credentials.' },
        });
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.message || 'Registration failed. Email may already be registered.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!otp || otp.length !== 6) {
      setError('Please enter the complete 6-digit OTP code.');
      return;
    }

    setLoading(true);
    try {
      const resp = await api.post('/api/auth/verify-otp', {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });

      setSuccess(resp.data.message || 'Registration completed successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login', {
          state: { message: 'Account activated successfully! Please sign in with your credentials.' },
        });
      }, 1500);
    } catch (err) {
      console.error('Registration OTP verification error:', err);
      setError(err.response?.data?.message || 'Invalid or expired OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setSuccess('');
    try {
      const resp = await api.post('/api/auth/resend-otp', {
        email: email.trim().toLowerCase(),
      });
      setSuccess(resp.data.message || 'A new OTP code has been sent to your email.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP.');
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-7 col-lg-6">
          <div className="glass-panel p-4 p-md-5">
            <div className="text-center mb-4">
              <i className="bi bi-person-plus-fill text-purple display-4 mb-2 d-inline-block"></i>
              <h3 className="fw-bold text-white mb-1">
                {step === 'FORM' ? 'Create Customer Account' : 'Verify Registration OTP'}
              </h3>
              <p className="text-muted small">
                {step === 'FORM'
                  ? 'Register to book vehicle services and track repairs'
                  : 'Enter the 6-digit OTP code sent to your email to activate your account'}
              </p>
            </div>

            {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}
            {success && <div className="alert alert-success py-2 small mb-3">{success}</div>}

            {step === 'FORM' ? (
              <form onSubmit={handleFormSubmit}>
                <div className="mb-3">
                  <label className="form-label text-light small fw-semibold">Full Name</label>
                  <input
                    type="text"
                    className={`form-control bg-dark text-white border-secondary ${errors.name ? 'is-invalid' : ''}`}
                    placeholder="e.g. Rahul Sharma"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors({ ...errors, name: '' });
                    }}
                    required
                  />
                  {errors.name && <div className="invalid-feedback d-block small mt-1">{errors.name}</div>}
                </div>

                <div className="mb-3">
                  <label className="form-label text-light small fw-semibold">Email Address</label>
                  <input
                    type="email"
                    className={`form-control bg-dark text-white border-secondary ${errors.email ? 'is-invalid' : ''}`}
                    placeholder="rahul@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors({ ...errors, email: '' });
                    }}
                    required
                  />
                  {errors.email && <div className="invalid-feedback d-block small mt-1">{errors.email}</div>}
                </div>

                <div className="mb-3">
                  <label className="form-label text-light small fw-semibold">Phone Number</label>
                  <div className="input-group">
                    <select
                      className="form-select bg-dark text-white border-secondary"
                      style={{ maxWidth: '110px' }}
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                    >
                      <option value="+91">🇮🇳 +91</option>
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+44">🇬🇧 +44</option>
                      <option value="+971">🇦🇪 +971</option>
                    </select>
                    <input
                      type="text"
                      className={`form-control bg-dark text-white border-secondary ${errors.phone ? 'is-invalid' : ''}`}
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (errors.phone) setErrors({ ...errors, phone: '' });
                      }}
                      required
                    />
                  </div>
                  {errors.phone && <div className="text-danger extra-small mt-1">{errors.phone}</div>}
                </div>

                <PasswordInput
                  id="register-password"
                  name="password"
                  label="Password"
                  placeholder="Min 8 chars, 1 uppercase, 1 special"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors({ ...errors, password: '' });
                  }}
                  error={errors.password}
                  required
                />

                <PasswordStrengthMeter password={password} />

                <PasswordInput
                  id="register-confirm-password"
                  name="confirmPassword"
                  label="Confirm Password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                  }}
                  error={errors.confirmPassword}
                  required
                />

                {confirmPassword && password && confirmPassword !== password && (
                  <div className="text-danger extra-small mb-3">
                    <i className="bi bi-x-circle me-1"></i> Passwords do not match
                  </div>
                )}
                {confirmPassword && password && confirmPassword === password && (
                  <div className="text-success extra-small mb-3">
                    <i className="bi bi-check-circle me-1"></i> Passwords match
                  </div>
                )}

                <button type="submit" className="gradient-btn w-100 py-2 mb-3" disabled={loading}>
                  {loading ? (
                    <span>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Registering Account...
                    </span>
                  ) : (
                    'Register Account'
                  )}
                </button>

                <div className="text-center small text-muted">
                  Already have an account?{' '}
                  <Link to="/login" className="text-primary text-decoration-none fw-semibold">
                    Sign In
                  </Link>
                </div>
              </form>
            ) : (
              <form onSubmit={handleOtpSubmit}>
                <OtpInputGroup
                  otp={otp}
                  onChange={setOtp}
                  onResend={handleResendOtp}
                  disabled={loading}
                  initialTimer={30}
                />

                <button type="submit" className="gradient-btn w-100 py-2 mb-3 mt-4" disabled={loading}>
                  {loading ? (
                    <span>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Activating Account...
                    </span>
                  ) : (
                    'Verify OTP & Complete Registration'
                  )}
                </button>

                <div className="d-flex justify-content-start align-items-center small mt-3">
                  <button
                    type="button"
                    className="btn btn-link text-muted p-0 text-decoration-none"
                    onClick={() => {
                      setStep('FORM');
                      setError('');
                      setSuccess('');
                    }}
                  >
                    <i className="bi bi-arrow-left me-1"></i> Back to Registration Form
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
