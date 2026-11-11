import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LoadingService } from '../../core/loading/loading.service';

@Component({
  selector: 'app-loading-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // 150ms fade-in delay avoids flicker on fast requests.
  styles: `
    .bar {
      animation: appear 0s linear 150ms forwards;
      opacity: 0;
    }
    @keyframes appear {
      to {
        opacity: 1;
      }
    }
    .run {
      animation: slide 1.1s ease-in-out infinite;
    }
    @keyframes slide {
      from {
        transform: translateX(100%);
      }
      to {
        transform: translateX(-100%);
      }
    }
  `,
  template: `
    @if (loading.active()) {
      <div
        class="bar fixed inset-x-0 top-0 h-0.5 overflow-hidden bg-primary-soft"
        style="z-index: var(--ds-z-toast)"
        role="progressbar"
        aria-label="در حال بارگذاری"
      >
        <div class="run h-full w-1/3 bg-primary"></div>
      </div>
    }
  `,
})
export class LoadingBarComponent {
  protected readonly loading = inject(LoadingService);
}
