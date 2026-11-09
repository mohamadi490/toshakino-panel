import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AuthStore } from '../../core/auth/auth.store';
import { NotificationService } from '../../core/error-handling/notification.service';
import { NavigationService } from '../../core/navigation/navigation';
import { AppearanceToggleComponent } from '../chrome/appearance-toggle';
import { IconComponent } from '../../shared/ui/icon';

@Component({
  selector: 'app-admin-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, AppearanceToggleComponent],
  template: `
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-contrast"
      >رفتن به محتوای اصلی</a
    >

    <div class="min-h-dvh bg-background text-foreground">
      <!-- mobile backdrop -->
      @if (mobileOpen()) {
        <div
          class="fixed inset-0 bg-black/40 lg:hidden"
          style="z-index: calc(var(--ds-z-sidebar) - 1)"
          (click)="mobileOpen.set(false)"
          aria-hidden="true"
        ></div>
      }

      <aside
        class="fixed inset-y-0 start-0 flex flex-col border-e border-border bg-surface transition-transform duration-200"
        style="z-index: var(--ds-z-sidebar)"
        [style.width]="
          collapsed() ? 'var(--ds-sidebar-width-collapsed)' : 'var(--ds-sidebar-width)'
        "
        [class.max-lg:translate-x-full]="!mobileOpen()"
        aria-label="منوی اصلی"
      >
        <div class="flex h-14 items-center gap-2 border-b border-border px-4">
          <span
            class="grid size-8 place-items-center rounded-md bg-primary text-sm font-bold text-primary-contrast"
            >ت</span
          >
          @if (!collapsed()) {
            <span class="font-bold">تشکینو</span>
          }
        </div>
        <nav class="grow overflow-y-auto p-2">
          <ul class="m-0 flex list-none flex-col gap-1 p-0">
            @for (item of nav.items(); track item.id) {
              <li>
                <a
                  [routerLink]="item.route"
                  routerLinkActive="bg-primary-soft text-primary"
                  (click)="mobileOpen.set(false)"
                  class="flex h-10 items-center gap-3 rounded-md px-3 text-sm text-foreground no-underline hover:bg-surface-muted"
                  [attr.title]="collapsed() ? item.label : null"
                >
                  <app-icon [name]="item.icon" />
                  @if (!collapsed()) {
                    <span>{{ item.label }}</span>
                  }
                </a>
              </li>
            }
          </ul>
        </nav>
        <button
          type="button"
          class="hidden h-10 cursor-pointer items-center justify-center border-t border-border text-muted hover:text-foreground lg:flex"
          (click)="collapsed.set(!collapsed())"
          [attr.aria-label]="collapsed() ? 'باز کردن منو' : 'جمع کردن منو'"
        >
          <app-icon name="chevron" [size]="16" [class.rotate-180]="!collapsed()" />
        </button>
      </aside>

      <div class="transition-[padding] duration-200" [style.padding-inline-start]="padStart()">
        <header
          class="sticky top-0 flex h-14 items-center gap-3 border-b border-border bg-surface px-4"
          style="z-index: var(--ds-z-header)"
        >
          <button
            type="button"
            class="cursor-pointer lg:hidden"
            aria-label="باز کردن منو"
            (click)="mobileOpen.set(true)"
          >
            <app-icon name="menu" />
          </button>
          <div class="grow"></div>
          <app-appearance-toggle />
          <div class="flex items-center gap-2 border-s border-border ps-3">
            <div class="text-end leading-tight max-sm:hidden">
              <p class="m-0 text-sm font-medium">{{ store.user()?.displayName }}</p>
              <p class="m-0 text-xs text-muted">{{ roleNames() }}</p>
            </div>
            <button
              type="button"
              class="inline-flex size-9 cursor-pointer items-center justify-center rounded-md text-muted hover:bg-surface-muted hover:text-foreground"
              aria-label="خروج از حساب"
              title="خروج"
              (click)="logout()"
            >
              <app-icon name="logout" />
            </button>
          </div>
        </header>
        <main id="main" tabindex="-1" class="p-4 lg:p-6">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class AdminShellComponent {
  protected readonly store = inject(AuthStore);
  protected readonly nav = inject(NavigationService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly collapsed = signal(false);
  protected readonly mobileOpen = signal(false);
  protected readonly roleNames = computed(() =>
    (this.store.user()?.roles ?? []).map((r) => r.name).join('، '),
  );
  protected readonly padStart = computed(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) return '0';
    return this.collapsed() ? 'var(--ds-sidebar-width-collapsed)' : 'var(--ds-sidebar-width)';
  });

  protected logout(): void {
    this.auth.logout().subscribe({
      next: () => void this.router.navigate(['/login']),
      error: () => {
        this.notify.warning('خروج در سرور تأیید نشد، اما نشست محلی پاک شد.');
        void this.router.navigate(['/login']);
      },
    });
  }
}
