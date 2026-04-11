/**
 * Convert Firebase/technical errors to user-friendly messages
 */
export const getUserFriendlyError = (error: any): string => {
  const errorMessage = error?.message || error?.toString() || '';
  const errorCode = error?.code || '';

  // Firebase Auth errors
  const authErrors: { [key: string]: string } = {
    'auth/invalid-verification-code': 'Invalid OTP code. Please check and try again.',
    'auth/code-expired': 'OTP code has expired. Please request a new one.',
    'auth/invalid-phone-number': 'Invalid phone number format. Please check your number.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/operation-not-allowed': 'This operation is not allowed. Please contact support.',
    'auth/invalid-verification-id': 'Verification failed. Please try sending OTP again.',
    'auth/missing-phone-number': 'Please enter a phone number.',
    'auth/quota-exceeded': 'SMS quota exceeded. Please try again later.',
    'auth/captcha-check-failed': 'reCAPTCHA verification failed. Please refresh and try again.',
    'auth/network-request-failed': 'Network error. Please check your connection and try again.',
  };

  // Firebase Firestore errors
  const firestoreErrors: { [key: string]: string } = {
    'permission-denied': 'You do not have permission to perform this action.',
    'not-found': 'The requested resource was not found.',
    'already-exists': 'This resource already exists.',
    'failed-precondition': 'Operation failed. Please check your data and try again.',
    'unavailable': 'Service temporarily unavailable. Please try again.',
  };

  // Check for Firebase Auth error code
  if (errorCode && authErrors[errorCode]) {
    return authErrors[errorCode];
  }

  // Check for Firestore error code
  if (errorCode && firestoreErrors[errorCode]) {
    return firestoreErrors[errorCode];
  }

  // Check error message for Firebase patterns
  if (errorMessage.includes('auth/invalid-verification-code')) {
    return 'Invalid OTP code. Please check and try again.';
  }
  if (errorMessage.includes('auth/code-expired')) {
    return 'OTP code has expired. Please request a new one.';
  }
  if (errorMessage.includes('auth/invalid-phone-number')) {
    return 'Invalid phone number. Please check your number.';
  }
  if (errorMessage.includes('auth/too-many-requests')) {
    return 'Too many attempts. Please try again after some time.';
  }
  if (errorMessage.includes('Missing or insufficient permissions')) {
    return 'You do not have permission to perform this action.';
  }
  if (errorMessage.includes('network')) {
    return 'Network error. Please check your internet connection.';
  }

  // Generic fallback messages
  if (errorMessage.includes('Firebase')) {
    return 'An error occurred. Please try again.';
  }
  if (errorMessage.includes('Failed to fetch')) {
    return 'Unable to connect. Please check your internet connection.';
  }

  // If we have a readable message without technical details, return it
  if (errorMessage && !errorMessage.includes('Firebase:') && !errorMessage.includes('Error:')) {
    return errorMessage;
  }

  // Default fallback
  return 'Something went wrong. Please try again.';
};

/**
 * Log error to console (for debugging) and return user-friendly message
 */
export const handleError = (error: any, context?: string): string => {
  // Log full error for debugging
  if (context) {
    console.error(`Error in ${context}:`, error);
  } else {
    console.error('Error:', error);
  }

  // Return user-friendly message
  return getUserFriendlyError(error);
};
