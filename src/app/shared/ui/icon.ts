import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const PATHS: Record<string, string> = {
  home: 'M3 11.5 12 4l9 7.5M5 10v10h5v-6h4v6h5V10',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6M9 12h6',
  menu: 'M4 6h16M4 12h16M4 18h16',
  sun: 'M12 4V2m0 20v-2M4 12H2m20 0h-2m-2.9-7.1 1.4-1.4M5.5 18.5l1.4-1.4m0-10.2L5.5 5.5m13 13-1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z',
  monitor: 'M3 5h18v11H3zM8 20h8M12 16v4',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  chevron: 'm9 6 6 6-6 6',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
  close: 'M6 6l12 12M18 6 6 18',
  users:
    'M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.3M15.5 5.2a3.5 3.5 0 0 1 0 6.6',
  shield: 'M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Zm-3 9 2 2 4-4',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z',
  box: 'm12 3 8 4v10l-8 4-8-4V7l8-4Zm0 8 8-4M12 11v10M12 11 4 7',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3',
  stack: 'M12 3 3 8l9 5 9-5-9-5ZM3 12l9 5 9-5M3 16l9 5 9-5',
  plus: 'M12 5v14M5 12h14',
  alert:
    'M12 8v5m0 3.5v.01M10.3 4.3 2.8 17.5A2 2 0 0 0 4.5 20.5h15a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 20a8 8 0 0 1 16 0',
};

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    [attr.width]="size()"
    [attr.height]="size()"
    aria-hidden="true"
  >
    <path [attr.d]="path()" />
  </svg>`,
  host: { class: 'inline-flex shrink-0' },
})
export class IconComponent {
  readonly name = input.required<string>();
  readonly size = input(20);
  protected readonly path = computed(() => PATHS[this.name()] ?? '');
}
