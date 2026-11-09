import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';
export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private nextId = 1;
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  success(message: string): void {
    this.push('success', message, 4000);
  }
  info(message: string): void {
    this.push('info', message, 4000);
  }
  warning(message: string): void {
    this.push('warning', message, 6000);
  }
  error(message: string): void {
    this.push('error', message, 8000);
  }

  dismiss(id: number): void {
    this._toasts.update((list) => list.filter((t) => t.id !== id));
  }

  private push(kind: ToastKind, message: string, ttlMs: number): void {
    const id = this.nextId++;
    this._toasts.update((list) => [...list.slice(-3), { id, kind, message }]);
    setTimeout(() => this.dismiss(id), ttlMs);
  }
}
