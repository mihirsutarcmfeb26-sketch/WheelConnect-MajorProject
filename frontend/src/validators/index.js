// Comprehensive Frontend Validators

export const validatePhone = (phone, countryCode = '+91') => {
  if (!phone || !phone.trim()) {
    return { valid: false, message: 'Phone number is required.' };
  }
  const cleanPhone = phone.trim();

  if (cleanPhone.startsWith('+')) {
    const e164Regex = /^\+[1-9]\d{6,14}$/;
    if (!e164Regex.test(cleanPhone)) {
      return { valid: false, message: 'Phone must be a valid international number (e.g. +919876543210).' };
    }
    return { valid: true, normalized: cleanPhone };
  }

  const digitsOnly = cleanPhone.replaceAll(/\D/g, '');

  if (countryCode === '+91') {
    if (!/^[6-9]\d{9}$/.test(digitsOnly)) {
      return { valid: false, message: 'Enter a valid 10-digit Indian mobile number (e.g. 9876543210).' };
    }
    return { valid: true, normalized: '+91' + digitsOnly };
  } else if (countryCode === '+1') {
    if (!/^\d{10}$/.test(digitsOnly)) {
      return { valid: false, message: 'Enter a valid 10-digit US/Canada phone number.' };
    }
    return { valid: true, normalized: '+1' + digitsOnly };
  } else if (countryCode === '+44') {
    if (!/^\d{10,11}$/.test(digitsOnly)) {
      return { valid: false, message: 'Enter a valid UK phone number.' };
    }
    return { valid: true, normalized: '+44' + digitsOnly };
  }

  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return { valid: false, message: 'Phone number must be between 7 and 15 digits.' };
  }

  return { valid: true, normalized: countryCode + digitsOnly };
};

export const validateVehicleNumber = (vehicleNumber) => {
  if (!vehicleNumber || !vehicleNumber.trim()) {
    return { valid: false, message: 'Vehicle registration number is required.' };
  }
  const normalized = vehicleNumber.replaceAll(/\s+/g, '').toUpperCase();

  const pattern = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$|^[A-Z0-9-]{4,20}$/;
  if (!pattern.test(normalized)) {
    return { valid: false, message: 'Invalid vehicle number format. Example: MH12AB1234 or KA01MA5555' };
  }
  return { valid: true, normalized };
};

export const getPasswordStrength = (password) => {
  if (!password) {
    return {
      score: 0,
      label: '',
      color: 'secondary',
      percent: 0,
      checks: {
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false,
      },
    };
  }

  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[@$!%*?&#^()_+=|-]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;

  if (score <= 2) {
    return { score, label: 'Weak', color: 'danger', percent: 33, checks };
  } else if (score <= 4) {
    return { score, label: 'Medium', color: 'warning', percent: 66, checks };
  } else {
    return { score, label: 'Strong', color: 'success', percent: 100, checks };
  }
};

export const validatePassword = (password) => {
  if (!password) {
    return { valid: false, message: 'Password is required.' };
  }
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter.' };
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: 'Password must contain at least one digit.' };
  }
  if (!/[@$!%*?&#^()_+=|-]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character (@$!%*?&#).' };
  }
  return { valid: true };
};

export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword) {
    return { valid: false, message: 'Please confirm your password.' };
  }
  if (password !== confirmPassword) {
    return { valid: false, message: 'Passwords do not match.' };
  }
  return { valid: true };
};

export const validateName = (name) => {
  if (!name || !name.trim()) {
    return { valid: false, message: 'Name is required.' };
  }
  if (name.trim().length < 2) {
    return { valid: false, message: 'Name must be at least 2 characters long.' };
  }
  if (/^\d+$/.test(name.trim())) {
    return { valid: false, message: 'Name cannot contain only numbers.' };
  }
  return { valid: true, normalized: name.trim() };
};

export const validateEmail = (email) => {
  if (!email || !email.trim()) {
    return { valid: false, message: 'Email address is required.' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { valid: false, message: 'Enter a valid email address.' };
  }
  return { valid: true, normalized: email.trim().toLowerCase() };
};
