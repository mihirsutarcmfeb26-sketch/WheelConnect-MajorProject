import React, { useState, useEffect, useRef } from 'react';

const OtpInputGroup = ({
  otp = '',
  onChange,
  onResend,
  disabled = false,
  initialTimer = 30,
}) => {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(initialTimer);
  const inputRefs = useRef([]);

  // Sync internal digits state when external otp prop changes or is cleared
  useEffect(() => {
    const arr = otp.split('');
    const newDigits = [0, 1, 2, 3, 4, 5].map((i) => arr[i] || '');
    setDigits(newDigits);
  }, [otp]);

  // Auto focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Countdown timer effect
  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer]);

  const handleChange = (index, value) => {
    // Only accept numeric digits
    const lastChar = value.slice(-1);
    if (value !== '' && !/^\d$/.test(lastChar)) {
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = lastChar;
    setDigits(newDigits);

    const combined = newDigits.join('');
    if (onChange) onChange(combined);

    // Auto next
    if (lastChar !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Move to previous input and clear it
        inputRefs.current[index - 1]?.focus();
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        if (onChange) onChange(newDigits.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    const cleanDigits = pasteData.replaceAll(/\D/g, '').slice(0, 6);

    if (cleanDigits.length > 0) {
      const newDigits = ['', '', '', '', '', ''];
      for (let i = 0; i < cleanDigits.length; i++) {
        newDigits[i] = cleanDigits[i];
      }
      setDigits(newDigits);
      const combined = newDigits.join('');
      if (onChange) onChange(combined);

      // Focus last filled digit or final box
      const targetIndex = Math.min(cleanDigits.length, 5);
      inputRefs.current[targetIndex]?.focus();
    }
  };

  const handleResendClick = () => {
    if (timer === 0 && onResend) {
      setTimer(initialTimer);
      onResend();
    }
  };

  return (
    <div className="w-100">
      <label className="form-label text-light small fw-semibold d-block mb-3 text-center">
        Enter 6-Digit Security Code
      </label>

      <div className="d-flex justify-content-center gap-2 mb-4">
        {digits.map((digit, idx) => (
          <input
            key={idx}
            ref={(el) => (inputRefs.current[idx] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            onPaste={handlePaste}
            disabled={disabled}
            className="form-control text-center bg-dark text-white border-secondary fw-bold fs-4 rounded shadow-sm"
            style={{
              width: '45px',
              height: '52px',
              borderColor: digit ? '#0d6efd' : '#6c757d',
            }}
          />
        ))}
      </div>

      <div className="d-flex justify-content-between align-items-center small mt-2">
        <span className="text-muted">
          {timer > 0 ? (
            <span>
              <i className="bi bi-clock me-1"></i> Resend code in{' '}
              <strong className="text-info">{timer}s</strong>
            </span>
          ) : (
            <span className="text-warning">
              <i className="bi bi-exclamation-circle me-1"></i> Code expired?
            </span>
          )}
        </span>

        <button
          type="button"
          className={`btn btn-link p-0 text-decoration-none fw-semibold ${
            timer > 0 || disabled ? 'text-muted disabled' : 'text-primary'
          }`}
          onClick={handleResendClick}
          disabled={timer > 0 || disabled}
        >
          Resend OTP
        </button>
      </div>
    </div>
  );
};

export default OtpInputGroup;
