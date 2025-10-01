import crypto from 'crypto';

/**
 * Generate a secure API key
 * Format: vp_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (32 random bytes)
 */
export const generateApiKey = (): string => {
  const randomBytes = crypto.randomBytes(32);
  const key = randomBytes.toString('hex');
  return `vp_live_${key}`;
};

/**
 * Generate a test/development API key
 * Format: vp_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 */
export const generateTestApiKey = (): string => {
  const randomBytes = crypto.randomBytes(32);
  const key = randomBytes.toString('hex');
  return `vp_test_${key}`;
};

/**
 * Validate API key format
 */
export const isValidApiKeyFormat = (key: string): boolean => {
  return /^vp_(live|test)_[a-f0-9]{64}$/.test(key);
};
