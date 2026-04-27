import { describe, expect, it } from 'vitest';
import { isUrlAllowed } from '../src/config.js';

describe('isUrlAllowed', () => {
  it('allows everything when patterns are empty', () => {
    expect(isUrlAllowed('https://umami.example.com', [])).toBe(true);
    expect(isUrlAllowed('http://localhost:3000', [])).toBe(true);
    expect(isUrlAllowed('http://169.254.169.254', [])).toBe(true);
  });

  it('matches exact origins', () => {
    const list = ['https://umami.example.com'];
    expect(isUrlAllowed('https://umami.example.com', list)).toBe(true);
    expect(isUrlAllowed('https://umami.example.com/api/x', list)).toBe(true);
    expect(isUrlAllowed('http://umami.example.com', list)).toBe(false);
    expect(isUrlAllowed('https://other.example.com', list)).toBe(false);
  });

  it('matches wildcards on subdomains', () => {
    const list = ['https://*.example.com'];
    expect(isUrlAllowed('https://umami.example.com', list)).toBe(true);
    expect(isUrlAllowed('https://a.b.example.com', list)).toBe(true);
    expect(isUrlAllowed('https://example.com', list)).toBe(false);
    expect(isUrlAllowed('https://example.com.evil', list)).toBe(false);
  });

  it('honors explicit ports', () => {
    const list = ['http://umami:3000'];
    expect(isUrlAllowed('http://umami:3000/api/x', list)).toBe(true);
    expect(isUrlAllowed('http://umami:3001', list)).toBe(false);
    expect(isUrlAllowed('http://umami', list)).toBe(false);
  });

  it('rejects malformed URLs', () => {
    expect(isUrlAllowed('not a url', ['https://x.example.com'])).toBe(false);
  });

  it('combines multiple patterns with OR', () => {
    const list = ['https://umami.a.com', 'https://*.b.com'];
    expect(isUrlAllowed('https://umami.a.com', list)).toBe(true);
    expect(isUrlAllowed('https://x.b.com', list)).toBe(true);
    expect(isUrlAllowed('https://other.c.com', list)).toBe(false);
  });
});
