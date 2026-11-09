import { ErrorHandler, Injectable, inject } from '@angular/core';
import { Logger } from '../logging/logger';
import { NotificationService } from './notification.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly logger = inject(Logger);
  private readonly notify = inject(NotificationService);

  handleError(error: unknown): void {
    this.logger.error(
      'Unhandled error',
      error instanceof Error ? { name: error.name, message: error.message } : error,
    );
    this.notify.error('خطای غیرمنتظره‌ای رخ داد. اگر تکرار شد با پشتیبانی تماس بگیرید.');
  }
}
