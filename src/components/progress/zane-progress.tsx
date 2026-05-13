import { Component, Element, h, Host, Prop, Watch } from '@stencil/core';
import { useNamespace } from '../../hooks';
import { isString } from '../../utils';
import { STATUS_COLOR_MAP } from './constants';

const ns = useNamespace('progress');
const nsBar = useNamespace('progress-bar');
const nsCircle = useNamespace('progress-circle');

interface ProgressColor {
  color: string;
  percentage: number;
}

@Component({
  tag: 'zane-progress',
  styleUrl: 'zane-progress.scss',
  shadow: false,
})
export class ZaneProgress {
  @Element() el: HTMLElement;

  @Prop() percentage: number = 0;

  @Prop() type: 'line' | 'circle' | 'dashboard' = 'line';

  @Prop() status: '' | 'success' | 'exception' | 'warning' = '';

  @Prop() indeterminate: boolean = false;

  @Prop() duration: number = 3;

  @Prop() strokeWidth: number = 6;

  @Prop() strokeLinecap: 'butt' | 'round' | 'square' = 'round';

  @Prop() textInside: boolean = false;

  @Prop() width: number = 126;

  @Prop() showText: boolean = true;

  @Prop() color: string = '';

  @Prop() striped: boolean = false;

  @Prop() stripedFlow: boolean = false;

  @Watch('percentage')
  onPercentageChange() {
    this.updateSlotPercentage();
  }

  componentDidLoad() {
    this.updateSlotPercentage();
  }

  componentDidRender() {
    this.updateSlotPercentage();
  }

  private updateSlotPercentage() {
    const slotted = this.el?.querySelectorAll('[slot="text"]');
    slotted?.forEach((root) => {
      root.querySelectorAll('[data-percentage]').forEach((el) => {
        (el as HTMLElement).textContent = `${this.percentage}%`;
      });
    });
  }

  private get clampedPercentage(): number {
    return Math.min(100, Math.max(0, this.percentage));
  }

  private getParsedColor(): string | ProgressColor[] | null {
    if (!this.color) return null;
    try {
      const parsed = JSON.parse(this.color);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // not JSON, treat as plain string color
    }
    return this.color;
  }

  private getCurrentColor(percentage: number): string {
    const parsedColor = this.getParsedColor();
    if (!parsedColor) return STATUS_COLOR_MAP.default;
    if (isString(parsedColor)) return parsedColor as string;
    if (Array.isArray(parsedColor)) {
      const colors = (parsedColor as ProgressColor[])
        .slice()
        .sort((a, b) => a.percentage - b.percentage);
      for (const item of colors) {
        if (item.percentage >= percentage) return item.color;
      }
      return colors[colors.length - 1]?.color || STATUS_COLOR_MAP.default;
    }
    return STATUS_COLOR_MAP.default;
  }

  private getStroke(): string {
    if (this.status && STATUS_COLOR_MAP[this.status]) {
      return STATUS_COLOR_MAP[this.status];
    }
    const parsedColor = this.getParsedColor();
    if (parsedColor) {
      return this.getCurrentColor(this.clampedPercentage);
    }
    return STATUS_COLOR_MAP.default;
  }

  private getBarStyle(): Record<string, string> {
    const parsedColor = this.getParsedColor();
    const style: Record<string, string> = {
      width: `${this.clampedPercentage}%`,
      animationDuration: `${this.duration}s`,
    };

    if (this.status && STATUS_COLOR_MAP[this.status]) {
      style.backgroundColor = STATUS_COLOR_MAP[this.status];
      return style;
    }

    if (parsedColor) {
      if (Array.isArray(parsedColor)) {
        const colors = (parsedColor as ProgressColor[])
          .slice()
          .sort((a, b) => a.percentage - b.percentage);
        const stops = colors
          .map((c) => `${c.color} ${c.percentage}%`)
          .join(', ');
        style.background = `linear-gradient(to right, ${stops})`;
      } else {
        const colorStr = parsedColor as string;
        if (colorStr.includes('gradient')) {
          style.background = colorStr;
        } else {
          style.backgroundColor = colorStr;
        }
      }
    }

    return style;
  }

  private getRelativeStrokeWidth(): number {
    return (this.strokeWidth / this.width) * 100;
  }

  private getRadius(): number {
    return Math.round(50 - this.getRelativeStrokeWidth() / 2);
  }

  private getTrackPath(): string {
    const r = this.getRadius();
    const isDashboard = this.type === 'dashboard';
    return `
      M 50 50
      m 0 ${isDashboard ? '' : '-'}${r}
      a ${r} ${r} 0 1 1 0 ${isDashboard ? '-' : ''}${r * 2}
      a ${r} ${r} 0 1 1 0 ${isDashboard ? '' : '-'}${r * 2}
    `;
  }

  private getPerimeter(): number {
    return 2 * Math.PI * this.getRadius();
  }

  private getRate(): number {
    return this.type === 'dashboard' ? 0.75 : 1;
  }

  private getStrokeDashoffset(): string {
    const offset = (-1 * this.getPerimeter() * (1 - this.getRate())) / 2;
    return `${offset}px`;
  }

  private getTrailPathStyle(): Record<string, string> {
    return {
      strokeDasharray: `${this.getPerimeter() * this.getRate()}px ${this.getPerimeter()}px`,
      strokeDashoffset: this.getStrokeDashoffset(),
    };
  }

  private getCirclePathStyle(): Record<string, string> {
    return {
      strokeDasharray: `${this.getPerimeter() * this.getRate() * (this.clampedPercentage / 100)}px ${this.getPerimeter()}px`,
      strokeDashoffset: this.getStrokeDashoffset(),
      transition:
        'stroke-dasharray 0.6s ease 0s, stroke 0.6s ease, opacity ease 0.6s',
    };
  }

  private getProgressTextSize(): number {
    if (this.type === 'line') {
      return 12 + this.strokeWidth * 0.4;
    }
    return this.width * 0.111111 + 2;
  }

  private renderStatusIcon() {
    if (!this.status) return null;
    const iconSize =
      this.type === 'line'
        ? Math.max(16, this.strokeWidth + 8)
        : this.getProgressTextSize() + 6;
    const color = STATUS_COLOR_MAP[this.status] || STATUS_COLOR_MAP.default;

    const iconMap: Record<string, { line: string; circle: string }> = {
      success: { line: 'checkbox-circle-line', circle: 'check-fill' },
      exception: { line: 'close-circle-line', circle: 'close-fill' },
      warning: { line: 'error-warning-fill', circle: 'error-warning-fill' },
    };

    const icons = iconMap[this.status];
    if (!icons) return null;
    const name = this.type === 'line' ? icons.line : icons.circle;

    return <zane-icon name={name} size={`${iconSize}px`} color={color} />;
  }

  private renderLineProgress() {
    const barInnerCls = [
      nsBar.e('inner'),
      this.indeterminate ? nsBar.em('inner', 'indeterminate') : '',
      this.striped ? nsBar.em('inner', 'striped') : '',
      this.stripedFlow ? nsBar.em('inner', 'striped-flow') : '',
    ]
      .filter(Boolean)
      .join(' ');

    return [
      <div class={nsBar.b()}>
        <div
          class={nsBar.e('outer')}
          style={{ height: `${this.strokeWidth}px` }}
        >
          <div class={barInnerCls} style={this.getBarStyle()}>
            {(this.showText || this.textInside) && this.textInside && (
              <div class={nsBar.e('innerText')}>
                <slot name="text" />
                {!this.el?.querySelector('[slot="text"]') && (
                  <span>{`${this.percentage}%`}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>,
      this.showText &&
        !this.textInside && (
          <div
            class={ns.e('text')}
            style={{ fontSize: `${this.getProgressTextSize()}px` }}
          >
            <slot name="text" />
            {!this.el?.querySelector('[slot="text"]') && !this.status && <span>{`${this.percentage}%`}</span>}
            {!this.el?.querySelector('[slot="text"]') && this.status && this.renderStatusIcon()}
          </div>
        ),
    ];
  }

  private renderCircleProgress() {
    const strokeColor = this.getStroke();

    return [
      <div
        class={ns.e('circle')}
        style={{ height: `${this.width}px`, width: `${this.width}px` }}
      >
        <svg viewBox="0 0 100 100">
          <path
            class={nsCircle.e('track')}
            d={this.getTrackPath()}
            stroke="var(--zane-border-color-lighter, #ebeef5)"
            stroke-linecap={this.strokeLinecap}
            stroke-width={this.getRelativeStrokeWidth()}
            fill="none"
            style={this.getTrailPathStyle()}
          />
          <path
            class={nsCircle.e('path')}
            d={this.getTrackPath()}
            stroke={strokeColor}
            fill="none"
            opacity={this.clampedPercentage ? 1 : 0}
            stroke-linecap={this.strokeLinecap}
            stroke-width={this.getRelativeStrokeWidth()}
            style={this.getCirclePathStyle()}
          />
        </svg>
      </div>,
      this.showText && (
        <div
          class={ns.e('text')}
          style={{ fontSize: `${this.getProgressTextSize()}px` }}
        >
          <slot name="text" />
          {!this.el?.querySelector('[slot="text"]') && !this.status && <span>{`${this.percentage}%`}</span>}
          {!this.el?.querySelector('[slot="text"]') && this.status && this.renderStatusIcon()}
        </div>
      ),
    ];
  }

  render() {
    const cls = [
      ns.b(),
      ns.m(this.type),
      ns.is(this.status, !!this.status),
      !this.showText ? ns.m('without-text') : '',
      this.textInside ? ns.m('text-inside') : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <Host
        class={cls}
        role="progressbar"
        aria-valuenow={this.percentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {this.type === 'line' && this.renderLineProgress()}
        {(this.type === 'circle' || this.type === 'dashboard') &&
          this.renderCircleProgress()}
      </Host>
    );
  }
}
