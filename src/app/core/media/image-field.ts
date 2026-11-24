import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { startWith, switchMap } from 'rxjs';
import { FormFieldComponent } from '../../shared/forms/form-field';
import { HTTP_URL_PATTERN } from '../../shared/forms/validators';
import { MediaRead } from '../api/schemas';
import { AuthStore } from '../auth/auth.store';
import { Permissions } from '../authorization/permissions';
import { MediaApi } from './media.api';
import { MediaPickerComponent } from './media-picker';

/**
 * Image URL input with a thumbnail and a "choose from library" button (only with `media.write`;
 * without it the URL can still be typed). The stored value is the contract's absolute URL.
 * Optionally fills an `alt` control with the picked file's alt text when that control is empty.
 */
@Component({
  selector: 'app-image-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, FormFieldComponent, MediaPickerComponent],
  template: `
    <app-form-field [label]="label()" [for]="for()" [control]="control()" [hint]="hint()">
      <div class="flex items-start gap-2">
        @if (preview(); as src) {
          <img [src]="src" alt="" class="size-10 shrink-0 rounded-md border border-border object-cover" referrerpolicy="no-referrer" />
        }
        <input [id]="for()" [formControl]="control()" autocomplete="off" class="ltr-field h-10 w-full rounded-md border border-border bg-background px-3 text-sm" />
        @if (canPick() && control().enabled) {
          <button type="button" class="h-10 shrink-0 cursor-pointer rounded-md bg-surface-muted px-3 text-sm hover:bg-border" (click)="picking.set(true)">انتخاب از کتابخانه</button>
        }
        @if (value() && control().enabled) {
          <button type="button" class="h-10 shrink-0 cursor-pointer rounded-md px-3 text-sm text-danger hover:bg-surface-muted" (click)="clear()">حذف</button>
        }
      </div>
    </app-form-field>
    @if (canPick()) {
      <app-media-picker [open]="picking()" (picked)="onPicked($event)" (closed)="picking.set(false)" />
    }
  `,
})
export class ImageFieldComponent {
  readonly label = input.required<string>();
  readonly for = input.required<string>();
  readonly control = input.required<FormControl<string>>();
  readonly altControl = input<FormControl<string> | null>(null);
  readonly hint = input<string | null>(null);

  private readonly store = inject(AuthStore);
  private readonly mediaApi = inject(MediaApi);
  protected readonly picking = signal(false);
  protected readonly canPick = computed(() => this.store.can({ all: [Permissions.MediaWrite] }));

  protected readonly value = toSignal(
    toObservable(this.control).pipe(switchMap((c) => c.valueChanges.pipe(startWith(c.value)))),
    { initialValue: '' },
  );
  /** Only a syntactically valid http(s) URL is previewed (never an arbitrary string as `src`). */
  protected readonly preview = computed(() => {
    const v = (this.value() ?? '').trim();
    return HTTP_URL_PATTERN.test(v) ? v : null;
  });

  protected onPicked(media: MediaRead): void {
    const c = this.control();
    c.setValue(this.mediaApi.src(media.url)); // absolute, as products/categories/brands require
    c.markAsDirty();
    c.markAsTouched();
    const alt = this.altControl();
    if (alt && alt.value.trim() === '' && media.alt) { alt.setValue(media.alt); alt.markAsDirty(); }
    this.picking.set(false);
  }

  protected clear(): void {
    const c = this.control();
    c.setValue('');
    c.markAsDirty();
  }
}
