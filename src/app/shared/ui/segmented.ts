import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface SegmentOption<T extends string> { value: T; label: string; }

/** Small exclusive toggle group (tabs-like filter). Keyboard and screen-reader friendly via buttons + aria-pressed. */
@Component({
  selector: 'app-segmented',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="inline-flex rounded-md border border-border bg-surface-muted p-0.5" role="group" [attr.aria-label]="label()">
      @for (o of options(); track o.value) {
        <button type="button" class="h-8 cursor-pointer rounded-sm px-3 text-sm" [class.bg-surface]="value() === o.value" [class.shadow-card]="value() === o.value"
                [attr.aria-pressed]="value() === o.value" (click)="valueChange.emit(o.value)">{{ o.label }}</button>
      }
    </div>
  `,
})
export class SegmentedComponent<T extends string = string> {
  readonly options = input.required<SegmentOption<T>[]>();
  readonly value = input.required<T>();
  readonly label = input.required<string>();
  readonly valueChange = output<T>();
}
