import { absoluteMediaUrl } from './media-url';

const ORIGIN = 'https://api.tashkino.ir';

describe('absoluteMediaUrl', () => {
  it('keeps absolute URLs untouched', () => {
    expect(absoluteMediaUrl('https://cdn.tashkino.ir/media/a.png', ORIGIN)).toBe('https://cdn.tashkino.ir/media/a.png');
    expect(absoluteMediaUrl('http://localhost:8000/media/a.png', ORIGIN)).toBe('http://localhost:8000/media/a.png');
  });
  it('resolves a server path against the API origin', () => {
    expect(absoluteMediaUrl('/media/a.png', ORIGIN)).toBe('https://api.tashkino.ir/media/a.png');
  });
  it('does not turn protocol-relative or unknown values into something else', () => {
    expect(absoluteMediaUrl('//evil.example/x.png', ORIGIN)).toBe('//evil.example/x.png');
    expect(absoluteMediaUrl('relative.png', ORIGIN)).toBe('relative.png');
  });
});
