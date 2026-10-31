import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/oauth/discovery', () => ({
  discoverOAuth: vi.fn(),
}));

vi.mock('@/lib/security/url-guard', () => ({
  isPublicHttpUrl: vi.fn(),
}));

vi.mock('@/lib/read-file-env', () => ({
  readFileEnv: () => '',
}));

const SERVERS = [
  { id: 'mx2', label: 'Server 2', url: 'https://mx2.example.com' },
  {
    id: 'mx3',
    label: 'Server 3',
    url: 'https://mx3.example.com',
    oauth: { issuerUrl: 'https://idp3.example.com' },
  },
];

const settings = new Map<string, unknown>();
vi.mock('@/lib/admin/config-manager', () => ({
  configManager: {
    get: (key: string, def: unknown) =>
      key === 'jmapServers' ? SERVERS : settings.has(key) ? settings.get(key) : def,
    ensureLoaded: async () => {},
  },
}));

import { normalizeOauthResource } from '@/lib/oauth/resource';
import { getOauthResource } from '@/lib/oauth/tokens';
import { getRequiredConfig } from '@/lib/oauth/token-exchange';

describe('normalizeOauthResource (RFC 8707)', () => {
  it('keeps an absolute URI, trimmed', () => {
    expect(normalizeOauthResource(' https://mail.example.com ')).toBe('https://mail.example.com');
    expect(normalizeOauthResource('https://api.example.com/jmap')).toBe('https://api.example.com/jmap');
    expect(normalizeOauthResource('urn:example:mail')).toBe('urn:example:mail');
  });

  it('rejects what cannot be a resource', () => {
    expect(normalizeOauthResource('')).toBeUndefined();
    expect(normalizeOauthResource('   ')).toBeUndefined();
    expect(normalizeOauthResource('mail.example.com')).toBeUndefined();
    expect(normalizeOauthResource('/jmap')).toBeUndefined();
    expect(normalizeOauthResource('https://mail.example.com#jmap')).toBeUndefined();
    expect(normalizeOauthResource('https://mail.example.com#')).toBeUndefined();
    expect(normalizeOauthResource(undefined)).toBeUndefined();
    expect(normalizeOauthResource(42)).toBeUndefined();
  });
});

describe('global OAuth resource', () => {
  beforeEach(() => {
    settings.clear();
    settings.set('jmapServerUrl', 'https://mx1.example.com');
    settings.set('oauthClientId', 'client');
    settings.set('oauthIssuerUrl', 'https://idp1.example.com');
  });

  it('is empty when unset or invalid', () => {
    expect(getOauthResource()).toBe('');
    settings.set('oauthResource', 'https://mail.example.com#x');
    expect(getOauthResource()).toBe('');
  });

  it('is sent to the global provider', () => {
    settings.set('oauthResource', 'https://mx1.example.com');
    expect(getRequiredConfig(null).resource).toBe('https://mx1.example.com');
    expect(getRequiredConfig('unknown').resource).toBe('https://mx1.example.com');
  });

  it('is never sent to a server entry, which has its own provider (#952)', () => {
    settings.set('oauthResource', 'https://mx1.example.com');
    expect(getRequiredConfig('mx2').resource).toBeUndefined();
    expect(getRequiredConfig('mx3').resource).toBeUndefined();
  });

  it('is undefined when not configured', () => {
    expect(getRequiredConfig(null).resource).toBeUndefined();
  });
});
