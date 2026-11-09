import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

@Component({
  selector: 'button[app-button]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (loading()) {
      <span
        class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        aria-hidden="true"
      ></span>
    }
    <ng-content />`,
  host: {
    '[class]': 'classes()',
    '[attr.aria-busy]': 'loading() || null',
    '[disabled]': 'loading() || null',
  },
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly loading = input(false);

  protected readonly classes = computed(() => {
    const base =
      'inline-flex items-center justify-center gap-2 rounded-md px-4 h-10 text-sm font-medium transition-colors ' +
      'disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer';
    const v: Record<ButtonVariant, string> = {
      primary: 'bg-primary text-primary-contrast hover:opacity-90',
      secondary: 'bg-surface-muted text-foreground hover:bg-border',
      danger: 'bg-danger text-primary-contrast hover:opacity-90',
      ghost: 'bg-transparent text-foreground hover:bg-surface-muted',
    };
    return `${base} ${v[this.variant()]}`;
  });
}
