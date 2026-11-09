import { Injectable } from '@angular/core';

const SENSITIVE_KEY = /(token|password|authorization|secret|cookie|card)/i;

/** Redacts anything that looks like a credential before it can reach the console or a sink. */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = SENSITIVE_KEY.test(k) ? '[REDACTED]' : redact(v, depth + 1);
  }
  return out;
}

@Injectable({ providedIn: 'root' })
export class Logger {
  debug(message: string, context?: unknown): void {
    this.write('debug', message, context);
  }
  info(message: string, context?: unknown): void {
    this.write('info', message, context);
  }
  warn(message: string, context?: unknown): void {
    this.write('warn', message, context);
  }
  error(message: string, context?: unknown): void {
    this.write('error', message, context);
  }

  private write(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    context?: unknown,
  ): void {
    const safe = context === undefined ? [] : [redact(context)];
    console[level](`[toshakino] ${message}`, ...safe);
  }
}
