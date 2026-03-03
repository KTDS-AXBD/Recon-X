/**
 * Constant-time string comparison for secret validation.
 * Prevents timing side-channel attacks on inter-service authentication.
 */

const encoder = new TextEncoder();

/**
 * Compare two strings in constant time using crypto.subtle.timingSafeEqual.
 * Returns false if either string is empty or if they differ.
 */
export function timingSafeCompare(a: string, b: string): boolean {
  if (a.length === 0 || b.length === 0) return false;

  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);

  // If lengths differ, compare a against itself to maintain constant time,
  // then return false.
  if (aBytes.byteLength !== bBytes.byteLength) {
    crypto.subtle.timingSafeEqual(aBytes, aBytes);
    return false;
  }

  return crypto.subtle.timingSafeEqual(aBytes, bBytes);
}

/**
 * Verify the X-Internal-Secret header against the expected secret.
 * Returns true if authenticated, false otherwise.
 */
export function verifyInternalSecret(
  request: Request,
  expectedSecret: string,
): boolean {
  const secret = request.headers.get("X-Internal-Secret");
  if (!secret) return false;
  return timingSafeCompare(secret, expectedSecret);
}
