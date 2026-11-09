import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AppearancePreference, ThemeService } from '../../core/theme/theme.service';
import { IconComponent } from '../../shared/ui/icon';

@Component({
  selector: 'app-appearance-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div
      class="inline-flex rounded-md border border-border bg-surface-muted p-0.5"
      role="group"
      aria-label="حالت نمایش"
    >
      @for (o of options; track o.value) {
        <button
          type="button"
          class="inline-flex size-8 cursor-pointer items-center justify-center rounded-sm transition-colors"
          [class.bg-surface]="theme.preference() === o.value"
          [class.shadow-card]="theme.preference() === o.value"
          [attr.aria-pressed]="theme.preference() === o.value"
          [attr.aria-label]="o.label"
          [title]="o.label"
          (click)="theme.set(o.value)"
        >
          <app-icon [name]="o.icon" [size]="16" />
        </button>
      }
    </div>
  `,
})
export class AppearanceToggleComponent {
  protected readonly theme = inject(ThemeService);
  protected readonly options: { value: AppearancePreference; label: string; icon: string }[] = [
    { value: 'light', label: 'روشن', icon: 'sun' },
    { value: 'dark', label: 'تیره', icon: 'moon' },
    { value: 'system', label: 'مطابق سیستم', icon: 'monitor' },
  ];
}
