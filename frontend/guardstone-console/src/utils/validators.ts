/**
 * Validation Utilities
 * Functions for form validation and data validation
 */

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * Password must be:
 * - At least 8 characters
 * - Contain uppercase letter
 * - Contain lowercase letter
 * - Contain number
 * - Contain special character
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain number');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate URL format
 */
export function validateURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate IP address (IPv4 and IPv6)
 */
export function validateIP(ip: string): boolean {
  // IPv4
  const ipv4Regex =
    /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;

  // IPv6
  const ipv6Regex =
    /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4})$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Validate domain format
 */
export function validateDomain(domain: string): boolean {
  const domainRegex =
    /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z0-9]+(-[a-z0-9]+)*$/i;
  return domainRegex.test(domain);
}

/**
 * Validate file hash format
 * Supports MD5, SHA1, SHA256, SHA512
 */
export function validateFileHash(hash: string): {
  isValid: boolean;
  type: string | null;
} {
  const hashFormats = {
    MD5: /^[a-f0-9]{32}$/i,
    SHA1: /^[a-f0-9]{40}$/i,
    SHA256: /^[a-f0-9]{64}$/i,
    SHA512: /^[a-f0-9]{128}$/i,
  };

  for (const [type, regex] of Object.entries(hashFormats)) {
    if (regex.test(hash)) {
      return { isValid: true, type };
    }
  }

  return { isValid: false, type: null };
}

/**
 * Validate date range
 */
export function validateDateRange(
  startDate: Date | string,
  endDate: Date | string
): boolean {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  return start <= end;
}

/**
 * Validate alert notes (non-empty, max 5000 characters)
 */
export function validateAlertNotes(notes: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!notes || notes.trim().length === 0) {
    errors.push('Notes cannot be empty');
  }
  if (notes.length > 5000) {
    errors.push('Notes cannot exceed 5000 characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate search query
 */
export function validateSearchQuery(query: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (query.length < 2) {
    errors.push('Search query must be at least 2 characters');
  }
  if (query.length > 200) {
    errors.push('Search query cannot exceed 200 characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function validateDateFormat(dateString: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Validate time format (HH:MM:SS)
 */
export function validateTimeFormat(timeString: string): boolean {
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
  return timeRegex.test(timeString);
}

/**
 * Validate file size
 */
export function validateFileSize(
  fileSizeBytes: number,
  maxSizeMB: number
): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return fileSizeBytes <= maxSizeBytes;
}

/**
 * Validate required field
 */
export function validateRequired(value: any): boolean {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value !== null && value !== undefined;
}

/**
 * Validate minimum length
 */
export function validateMinLength(value: string, minLength: number): boolean {
  return value.length >= minLength;
}

/**
 * Validate maximum length
 */
export function validateMaxLength(value: string, maxLength: number): boolean {
  return value.length <= maxLength;
}

/**
 * Validate date is in the past
 */
export function validateDateInPast(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d < new Date();
}

/**
 * Validate date is in the future
 */
export function validateDateInFuture(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d > new Date();
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

/**
 * Validate form data
 */
export interface ValidationRule {
  field: string;
  validators: Array<() => [isValid: boolean, error?: string]>;
}

export function validateForm(rules: ValidationRule[]): {
  isValid: boolean;
  errors: Record<string, string[]>;
} {
  const errors: Record<string, string[]> = {};

  rules.forEach((rule) => {
    const fieldErrors: string[] = [];

    rule.validators.forEach((validator) => {
      const [isValid, error] = validator();
      if (!isValid && error) {
        fieldErrors.push(error);
      }
    });

    if (fieldErrors.length > 0) {
      errors[rule.field] = fieldErrors;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
