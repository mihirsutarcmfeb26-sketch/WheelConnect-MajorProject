import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import PasswordInput from '../components/PasswordInput';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';
import OtpInputGroup from '../components/OtpInputGroup';
import { validateEmail, validatePassword, validateConfirmPassword } from '../validators';

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState('EMAIL'); // 'EMAIL' or 'RESET'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setEmailError('');

    const emailVal = validateEmail(email);
    if (!emailVal.valid) {
      setEmailError(emailVal.message);
      return;
    }

    setLoading(true);
    try {
      const resp = await api.post('/api/auth/forgot-password', {
        email: emailVal.normalized,
      });
      setSuccess(resp.data.message || 'OTP code sent to your email.');
      setStep('RESET');
    } catch (err) {
      console.error('Forgot password error:', err);
      setError(err.response?.data?.message || 'Failed to send OTP. Please verify your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setPasswordError('');
    setConfirmError('');

    if (!otp || otp.length !== 6) {
      setError('Please enter the complete 6-digit OTP code.');
      return;
    }

    const passVal = validatePassword(newPassword);
    if (!passVal.valid) {
      setPasswordError(passVal.message);
      return;
    }

    const confirmVal = validateConfirmPassword(newPassword, confirmPassword);
    if (!confirmVal.valid) {
      setConfirmError(confirmVal.message);
      return;
    }

    setLoading(true);
    try {
      const resp = await api.post('/api/auth/reset-password', {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        newPassword: newPassword,
      });

      setSuccess(resp.data.message || 'Password reset successful!');
      setTimeout(() => {
        navigate('/login', { state: { message: 'Password reset successful! Please sign in with your new password.' } });
      }, 1500);
    } catch (err) {
      console.error('Reset password error:', err);
      setError(err.response?.data?.message || 'Invalid OTP code or reset failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setSuccess('');
    try {
      const resp = await api.post('/api/auth/forgot-password', {
        email: email.trim().toLowerCase(),
      });
      setSuccess(resp.data.message || 'A new OTP has been sent to your email.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP.');
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="glass-panel p-4 p-md-5">
            <div className="text-center mb-4">
              <i className="bi bi-key-fill text-warning display-4 mb-2 d-inline-block"></i>
              <h3 className="fw-bold text-white mb-1">
                {step === 'EMAIL' ? 'Forgot Password' : 'Reset Password'}
              </h3>
              <p className="text-muted small">
                {step === 'EMAIL'
                  ? 'Enter your registered email address to receive a 6-digit OTP'
                  : 'Enter the 6-digit OTP and set your new account password'}
              </p>
            </div>

            {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}
            {success && <div className="alert alert-success py-2 small mb-3">{success}</div>}

            {step === 'EMAIL' ? (
              <form onSubmit={handleEmailSubmit}>
                <div className="mb-4">
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

                <button type="submit" className="gradient-btn w-100 py-2 mb-3" disabled={loading}>
                  {loading ? (
                    <span>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Sending OTP...
                    </span>
                  ) : (
                    'Send Reset OTP'
                  )}
                </button>

                <div className="text-center small text-muted">
                  Remembered your password?{' '}
                  <Link to="/login" className="text-primary text-decoration-none fw-semibold">
                    Back to Login
                  </Link>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetSubmit}>
                <OtpInputGroup
                  otp={otp}
                  onChange={setOtp}
                  onResend={handleResendOtp}
                  disabled={loading}
                  initialTimer={30}
                />

                <hr className="border-secondary my-4" />

                <PasswordInput
                  id="new-password"
                  name="newPassword"
                  label="New Password"
                  placeholder="Min 8 chars, uppercase, number, symbol"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  error={passwordError}
                  required
                />

                <PasswordStrengthMeter password={newPassword} />

                <PasswordInput
                  id="confirm-password"
                  name="confirmPassword"
                  label="Confirm New Password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (confirmError) setConfirmError('');
                  }}
                  error={confirmError}
                  required
                />

                {confirmPassword && newPassword && confirmPassword !== newPassword && (
                  <div className="text-danger extra-small mb-3">
                    <i className="bi bi-x-circle me-1"></i> Passwords do not match
                  </div>
                )}
                {confirmPassword && newPassword && confirmPassword === newPassword && (
                  <div className="text-success extra-small mb-3">
                    <i className="bi bi-check-circle me-1"></i> Passwords match
                  </div>
                )}

                <button type="submit" className="gradient-btn w-100 py-2 mb-3" disabled={loading}>
                  {loading ? (
                    <span>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Resetting Password...
                    </span>
                  ) : (
                    'Reset Password'
                  )}
                </button>

                <div className="d-flex justify-content-between align-items-center small mt-3">
                  <button
                    type="button"
                    className="btn btn-link text-muted p-0 text-decoration-none"
                    onClick={() => {
                      setStep('EMAIL');
                      setError('');
                      setSuccess('');
                    }}
                  >
                    <i className="bi bi-arrow-left me-1"></i> Change Email
                  </button>
                  <Link to="/login" className="text-primary text-decoration-none fw-semibold">
                    Sign In
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
