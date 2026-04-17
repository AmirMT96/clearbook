import { createHash } from 'crypto';

/**
 * Hash a PIN string using SHA-256.
 */
export function hashPin(pin: string): string {
  return createHash('sha256').update(pin).digest('hex');
}

/**
 * Verify a PIN against a stored SHA-256 hash.
 */
export function verifyPin(pin: string, hash: string): boolean {
  return hashPin(pin) === hash;
}
