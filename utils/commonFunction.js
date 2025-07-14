// Password validation function
function isPasswordValid(pwd) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(pwd);
}

function isFullNameValid(fullName) {
  return !!fullName && !!fullName.trim();
}

function isEmailValid(email) {
  return !!email && !!email.trim() && email.includes('@');
}

function validateAddUser({ fullName, email, password, confirmPassword, file }) {
  const errors = {};
  if (!isFullNameValid(fullName)) {
    errors.fullName = 'Full name is required.';
  }
  if (!isEmailValid(email)) {
    errors.email = 'Email is required.';
  }
  if (!password) {
    errors.password = 'Password is required.';
  } else if (!isPasswordValid(password)) {
    errors.password = 'Password must be at least 8 characters, include uppercase, lowercase, a number, and a special character.';
  }
  if (!confirmPassword) {
    errors.confirmPassword = 'Confirm password is required.';
  } else if (password && confirmPassword && password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }
  if (!file || !file.key) {
    errors.pic = 'Photo is required.';
  }
  return errors;
}

module.exports = {
  isPasswordValid,
  isFullNameValid,
  isEmailValid,
  validateAddUser
};