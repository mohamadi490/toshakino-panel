import { Injectable, signal } from '@angular/core';

export interface RuntimeConfig {
  /** Absolute API base including version prefix, e.g. https://api.tashkino.ir/api/v1 */
  readonly apiBaseUrl: string;
  readonly environment: 'development' | 'production';
}

const DEFAULT_CONFIG: RuntimeConfig = {
  apiBaseUrl: 'https://api.tashkino.ir/api/v1',
  environment: 'production',
};

export function parseRuntimeConfig(raw: unknown): RuntimeConfig {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_CONFIG;
  const r = raw as Record<string, unknown>;
  const apiBaseUrl = typeof r['apiBaseUrl'] === 'string' ? r['apiBaseUrl'].replace(/\/+$/, '') : '';
  let valid = false;
  try {
    const u = new URL(apiBaseUrl);
    valid = u.protocol === 'https:' || (u.protocol === 'http:' && u.hostname === 'localhost');
  } catch {
    valid = false;
  }
  if (!valid) return DEFAULT_CONFIG;
  return {
    apiBaseUrl,
    environment: r['environment'] === 'development' ? 'development' : 'production',
  };
}

/** Runtime (non-build-time) configuration, loaded from /config.json before bootstrap. */
@Injectable({ providedIn: 'root' })
export class AppConfig {
  private readonly _config = signal<RuntimeConfig>(DEFAULT_CONFIG);
  readonly config = this._config.asReadonly();

  get apiBaseUrl(): string {
    return this._config().apiBaseUrl;
  }

  get apiOrigin(): string {
    return new URL(this._config().apiBaseUrl).origin;
  }

  async load(fetchFn: typeof fetch = fetch): Promise<void> {
    try {
      const res = await fetchFn('/config.json', { cache: 'no-store' });
      this._config.set(res.ok ? parseRuntimeConfig(await res.json()) : DEFAULT_CONFIG);
    } catch {
      this._config.set(DEFAULT_CONFIG);
    }
  }
}
