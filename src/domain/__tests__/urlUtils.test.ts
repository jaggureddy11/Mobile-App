import { normalizeUrl } from '../urlUtils';

describe('Domain: normalizeUrl', () => {
  it('strips www. and lowercases hostname', () => {
    expect(normalizeUrl('https://WWW.Example.COM/article')).toBe('https://example.com/article');
  });

  it('strips trailing slashes from path', () => {
    expect(normalizeUrl('https://example.com/blog/post/')).toBe('https://example.com/blog/post');
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com');
  });

  it('strips UTM tracking parameters', () => {
    const url = 'https://example.com/page?utm_source=twitter&utm_medium=social&utm_campaign=spring&id=123';
    expect(normalizeUrl(url)).toBe('https://example.com/page?id=123');
  });

  it('strips fbclid, igshid, and gclid tracking params', () => {
    const url = 'https://instagram.com/reel/xyz123/?igshid=abc456&fbclid=def789';
    expect(normalizeUrl(url)).toBe('https://instagram.com/reel/xyz123');
  });

  it('sorts remaining query parameters deterministically', () => {
    const url1 = 'https://example.com/search?b=2&a=1';
    const url2 = 'https://example.com/search?a=1&b=2';
    expect(normalizeUrl(url1)).toBe(normalizeUrl(url2));
  });

  it('handles empty and null inputs safely', () => {
    expect(normalizeUrl('')).toBe('');
    expect(normalizeUrl(null)).toBe('');
    expect(normalizeUrl(undefined)).toBe('');
  });
});
