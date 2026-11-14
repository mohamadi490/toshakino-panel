import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface BarDatum {
  label: string;
  value: number;
}

const W = 600;
const H = 180;
const PAD_TOP = 8;

/**
 * Minimal accessible bar chart. Renders nothing for empty data (no decorative placeholders)
 * and ships a visually-hidden table with the exact values for screen readers.
 */
@Component({
  selector: 'app-bar-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (bars().length > 0) {
      <figure class="m-0">
        <svg
          [attr.viewBox]="'0 0 ' + width + ' ' + (height + 24)"
          class="h-auto w-full"
          role="img"
          [attr.aria-label]="ariaLabel()"
        >
          <line
            x1="0"
            [attr.y1]="height"
            [attr.x2]="width"
            [attr.y2]="height"
            class="stroke-border"
            stroke-width="1"
          />
          @for (b of bars(); track b.index) {
            <g>
              <title>{{ b.label }}: {{ b.formatted }}</title>
              <rect
                [attr.x]="b.x"
                [attr.y]="b.y"
                [attr.width]="b.w"
                [attr.height]="b.h"
                rx="3"
                class="fill-primary"
              />
              @if (b.showLabel) {
                <text
                  [attr.x]="b.x + b.w / 2"
                  [attr.y]="height + 16"
                  text-anchor="middle"
                  class="fill-muted"
                  font-size="11"
                >
                  {{ b.label }}
                </text>
              }
            </g>
          }
        </svg>
        <table class="sr-only">
          <caption>
            {{
              ariaLabel()
            }}
          </caption>
          <tbody>
            @for (b of bars(); track b.index) {
              <tr>
                <th scope="row">{{ b.label }}</th>
                <td>{{ b.formatted }}</td>
              </tr>
            }
          </tbody>
        </table>
      </figure>
    }
  `,
})
export class BarChartComponent {
  readonly data = input.required<BarDatum[]>();
  readonly ariaLabel = input.required<string>();
  readonly format = input<(n: number) => string>((n) => String(n));

  protected readonly width = W;
  protected readonly height = H;

  protected readonly bars = computed(() => {
    const data = this.data();
    if (data.length === 0) return [];
    const max = Math.max(...data.map((d) => d.value), 0);
    const slot = W / data.length;
    const w = Math.min(slot * 0.6, 48);
    const every = Math.ceil(data.length / 10); // at most ~10 axis labels
    return data.map((d, index) => {
      const h = max > 0 ? Math.max((d.value / max) * (H - PAD_TOP), d.value > 0 ? 2 : 0) : 0;
      return {
        index,
        label: d.label,
        formatted: this.format()(d.value),
        w,
        h,
        x: slot * index + (slot - w) / 2,
        y: H - h,
        showLabel: index % every === 0,
      };
    });
  });
}
