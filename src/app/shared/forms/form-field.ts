import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl } from '@angular/forms';
import { map, switchMap } from 'rxjs';
import { firstErrorMessage } from './apply-field-errors';

/** Label + projected control + accessible error/hint. The projected input needs `[id]="for"` matching `for`. */
@Component({
  selector: 'app-form-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-4">
      <label [attr.for]="for()" class="mb-1 block text-sm font-medium">
        {{ label() }}
        @if (required()) {
          <span class="text-danger" aria-hidden="true"> *</span>
        }
      </label>
      <ng-content />
      @if (hint(); as h) {
        <p class="m-0 mt-1 text-xs text-muted" [id]="for() + '-hint'">{{ h }}</p>
      }
      <p class="m-0 mt-1 min-h-5 text-xs text-danger" [id]="for() + '-err'" role="alert">
        {{ error() }}
      </p>
    </div>
  `,
})
export class FormFieldComponent {
  readonly label = input.required<string>();
  readonly for = input.required<string>();
  readonly control = input.required<AbstractControl>();
  readonly required = input(false);
  readonly hint = input<string | null>(null);

  // Re-evaluates whenever the control's value/status/touched state changes (OnPush + zoneless safe).
  private readonly tick = toSignal(
    toObservable(this.control).pipe(
      switchMap((c) => c.events),
      map(() => ({})),
    ),
    { initialValue: {} },
  );
  protected readonly error = computed(() => {
    this.tick();
    return firstErrorMessage(this.control());
  });
}
