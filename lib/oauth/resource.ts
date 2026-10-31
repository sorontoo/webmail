/**
 * RFC 8707 resource indicator sent with the authorization request, for
 * providers that issue access tokens per API (such as Pocket ID): the token's
 * `aud` is then that resource, so the JMAP server can tell its tokens from
 * tokens the provider issued for other apps.
 *
 * Kept free of server imports so the login page can share the rule.
 */

/**
 * The resource as it goes on the wire, or undefined when it can't be one:
 * RFC 8707 requires an absolute URI without a fragment.
 */
export function normalizeOauthResource(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(trimmed);
    if (url.hash || trimmed.includes('#')) return undefined;
  } catch {
    return undefined;
  }
  return trimmed;
}
