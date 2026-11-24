import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../api/api-client';
import { ApiPage } from '../api/api-types';
import { MediaRead } from '../api/schemas';
import { AppConfig } from '../config/app-config';
import { absoluteMediaUrl } from './media-url';

/** Limits enforced by the server (docs/contracts/backend-answers.md Q9); the client check is only a hint. */
export const MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const MEDIA_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;

export interface UploadEvent {
  progress: number;
  media?: MediaRead;
}

@Injectable({ providedIn: 'root' })
export class MediaApi {
  private readonly api = inject(ApiClient);
  private readonly config = inject(AppConfig);

  list(page: number, pageSize = 24): Observable<ApiPage<MediaRead>> {
    return this.api.getPage<MediaRead>('/admin/media', { page, pageSize });
  }

  /** `alt` is stored with the file at upload time; there is no endpoint to edit it later. */
  upload(file: File, alt?: string): Observable<UploadEvent> {
    const form = new FormData();
    form.append('file', file);
    if (alt && alt.trim() !== '') form.append('alt', alt.trim());
    return new Observable<UploadEvent>((subscriber) =>
      this.api.postForm<MediaRead>('/admin/media', form).subscribe({
        next: (e) => subscriber.next({ progress: e.progress, media: e.data }),
        error: (err: unknown) => subscriber.error(err),
        complete: () => subscriber.complete(),
      }),
    );
  }

  delete(id: number): Observable<void> {
    return this.api.delete(`/admin/media/${id}`);
  }

  /** Absolute URL for previews and for values stored in other entities. */
  src(url: string): string {
    return absoluteMediaUrl(url, this.config.apiOrigin);
  }

  /** Client-side hint before uploading; returns a Persian message or null. The server stays the authority. */
  validate(file: File): string | null {
    if (file.size === 0) return 'فایل انتخاب‌شده خالی است.';
    if (file.size > MEDIA_MAX_BYTES) return 'حجم فایل از ۵ مگابایت بیشتر است.';
    if (file.type && !(MEDIA_ALLOWED_TYPES as readonly string[]).includes(file.type)) return 'فقط تصویر JPEG، PNG، GIF یا WebP مجاز است.';
    return null;
  }
}
