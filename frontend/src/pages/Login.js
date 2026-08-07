import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';
import OtpInputGroup from '../components/OtpInputGroup';
import { validateEmail } from '../validators';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // 2FA OTP state
  const [step, setStep] = useState('CREDENTIALS'); // 'CREDENTIALS' or 'OTP'
  const [otp, setOtp] = useState('');
  const [otpInfoMessage, setOtpInfoMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Load remembered email if present
  useEffect(() => {
    const savedEmail = localStorage.getItem('wc_remember_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }

    if (location.state?.message) {
      setSuccess(location.state.message);
    }
  }, [location]);

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setEmailError('');
    setPasswordError('');

    const emailVal = validateEmail(email);
    if (!emailVal.valid) {
      setEmailError(emailVal.message);
      return;
    }
    if (!password) {
      setPasswordError('Password is required.');
      return;
    }

    setLoading(true);
    try {
      // Remember me handling
      if (rememberMe) {
        localStorage.setItem('wc_remember_email', emailVal.normalized);
      } else {
        localStorage.removeItem('wc_remember_email');
      }

      const resp = await api.post('/api/auth/login', {
        email: emailVal.normalized,
        password: password,
      });

      if (resp.data.requiresOtp) {
        setStep('OTP');
        setOtpInfoMessage(resp.data.message || 'OTP code sent to your email.');
      } else {
        // Direct login without OTP (Customer, Mechanic, Service Centre)
        handleAuthSuccess(resp.data);
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err.response?.data?.requiresOtp) {
        // Account unverified or requires OTP
        setStep('OTP');
        setOtpInfoMessage(err.response.data.message);
      } else {
        setError(err.response?.data?.message || 'Invalid email or password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!otp || otp.length !== 6) {
      setError('OTP must be exactly 6 digits.');
      return;
    }

    setLoading(true);
    try {
      const resp = await api.post('/api/auth/verify-otp', {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });

      handleAuthSuccess(resp.data);
    } catch (err) {
      console.error('OTP Verification Error:', err);
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

  const handleAuthSuccess = (data) => {
    // Store in tab-isolated window.sessionStorage via AuthContext
    setAuth(data.token, {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
    });

    navigate('/dashboard');
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="glass-panel p-4 p-md-5">
            <div className="text-center mb-4">
              <i className="bi bi-shield-lock-fill text-primary display-4 mb-2 d-inline-block"></i>
              <h3 className="fw-bold text-white mb-1">
                {step === 'CREDENTIALS' ? 'WheelConnect Login' : 'OTP Verification'}
              </h3>
              <p className="text-muted small">
                {step === 'CREDENTIALS'
                  ? 'Sign in to access your role-based dashboard'
                  : 'Enter the 6-digit verification code sent to your email'}
              </p>
            </div>

            {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}
            {success && <div className="alert alert-success py-2 small mb-3">{success}</div>}

            {step === 'CREDENTIALS' ? (
              <form onSubmit={handleCredentialsSubmit}>
                <div className="mb-3">
                  <label className="form-label text-light small fw-semibold">Email Address</label>
                  <input
                    type="email"
                    className={`form-control bg-dark text-white border-secondary ${emailError ? 'is-invalid' : ''}`}
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError('');
                    }}
                    required
                    autoFocus
                  />
                  {emailError && <div className="invalid-feedback d-block small mt-1">{emailError}</div>}
                </div>

                <PasswordInput
                  id="login-password"
                  name="password"
                  label="Password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  error={passwordError}
                  required
                />

                <div className="d-flex justify-content-between align-items-center mb-4 small">
                  <div className="form-check">
                    <input
                      className="form-check-input bg-dark border-secondary"
                      type="checkbox"
                      id="rememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <label className="form-check-label text-muted" htmlFor="rememberMe">
                      Remember Me
                    </label>
                  </div>
                  <Link to="/forgot-password" className="text-warning text-decoration-none fw-semibold">
                    Forgot Password?
                  </Link>
                </div>

                <button type="submit" className="gradient-btn w-100 py-2 mb-3" disabled={loading}>
                  {loading ? (
                    <span>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Authenticating...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </button>

                <div className="text-center small text-muted">
                  Don't have an account?{' '}
                  <Link to="/register" className="text-primary text-decoration-none fw-semibold">
                    Register Customer Account
                  </Link>
                </div>
              </form>
            ) : (
              <form onSubmit={handleOtpSubmit}>
                {otpInfoMessage && (
                  <div className="alert alert-info py-2 small mb-3">
                    <i className="bi bi-envelope-check me-2"></i>
                    {otpInfoMessage}
                  </div>
                )}

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
                      Verifying OTP...
                    </span>
                  ) : (
                    'Verify OTP & Complete Login'
                  )}
                </button>

                <div className="d-flex justify-content-start align-items-center small mt-3">
                  <button
                    type="button"
                    className="btn btn-link text-muted p-0 text-decoration-none"
                    onClick={() => {
                      setStep('CREDENTIALS');
                      setError('');
                      setSuccess('');
                    }}
                  >
                    <i className="bi bi-arrow-left me-1"></i> Back to Credentials
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

export default Login;
