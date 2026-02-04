import { cn } from '../utils';

describe('cn', () => {
  it('joins two class strings', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('filters out undefined values', () => {
    expect(cn('foo', undefined, 'bar')).toBe('foo bar');
  });

  it('filters out null and false values', () => {
    expect(cn('foo', null, false, 'bar')).toBe('foo bar');
  });

  it('returns empty string when called with no arguments', () => {
    expect(cn()).toBe('');
  });

  it('returns empty string when all values are falsy', () => {
    expect(cn(undefined, null, false)).toBe('');
  });

  it('handles a single class', () => {
    expect(cn('solo')).toBe('solo');
  });
});
