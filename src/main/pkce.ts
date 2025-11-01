/**
 * PKCE (Proof Key for Code Exchange) utilities
 *
 * Implements RFC 7636 for secure OAuth flow without client secret
 */

import { randomBytes, createHash } from 'crypto';

/**
 * Generate a cryptographically secure random code verifier
 * Length: 43-128 characters (base64url encoded)
 */
export function generateCodeVerifier(): string {
  // Generate 32 random bytes (will be 43 chars when base64url encoded)
  return base64URLEncode(randomBytes(32));
}

/**
 * Generate code challenge from code verifier using SHA256
 */
export function generateCodeChallenge(verifier: string): string {
  const hash = createHash('sha256').update(verifier).digest();
  return base64URLEncode(hash);
}

/**
 * Base64URL encoding (without padding)
 */
function base64URLEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
