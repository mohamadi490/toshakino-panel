import { parseRuntimeConfig } from './app-config';

describe('parseRuntimeConfig', () => {
  it('accepts https URLs and trims trailing slashes', () => {
    expect(parseRuntimeConfig({ apiBaseUrl: 'https://api.example.ir/api/v1///' }).apiBaseUrl).toBe(
      'https://api.example.ir/api/v1',
    );
  });
  it('accepts http only for localhost', () => {
    expect(parseRuntimeConfig({ apiBaseUrl: 'http://localhost:8000/api/v1' }).apiBaseUrl).toBe(
      'http://localhost:8000/api/v1',
    );
    expect(parseRuntimeConfig({ apiBaseUrl: 'http://evil.example/api' }).apiBaseUrl).toBe(
      'https://api.tashkino.ir/api/v1',
    );
  });
  it('falls back to defaults on garbage', () => {
    expect(parseRuntimeConfig(null).apiBaseUrl).toBe('https://api.tashkino.ir/api/v1');
    expect(parseRuntimeConfig({ apiBaseUrl: 42 }).apiBaseUrl).toBe(
      'https://api.tashkino.ir/api/v1',
    );
  });
});
