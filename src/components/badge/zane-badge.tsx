import { Component, Element, h, Host, Prop, Watch } from '@stencil/core';
import { useNamespace } from '../../hooks';
import { isNumber, isStringNumber } from '../../utils';

const ns = useNamespace('badge');

@Component({
  tag: 'zane-badge',
  styleUrl: 'zane-badge.scss',
  shadow: false,
})
export class ZaneBadge {
  @Element() el: HTMLElement | undefined;
  @Prop() value: string | number = '';

  @Prop() max: number = 99;

  @Prop() isDot: boolean = false;

  @Prop() hidden: boolean = false;

  @Prop() type: 'primary' | 'success' | 'warning' | 'info' | 'danger' =
    'danger';

  @Prop() showZero: boolean = true;

  @Prop() color: string = '';

  @Prop() offset: number[] | string = [0, 0];

  @Prop() badgeStyle: Record<string, string> = {};

  @Prop() badgeClass: string = '';

  componentDidLoad() {
    this.updateSlotValue();
  }

  componentDidRender() {
    this.updateSlotValue();
  }

  @Watch('value')
  @Watch('max')
  onValueChange() {
    this.updateSlotValue();
  }

  private updateSlotValue() {
    const content = this.getDisplayContent();
    const slotted = this.el?.querySelectorAll('[slot="content"]');
    slotted?.forEach((root) => {
      root
        .querySelectorAll('[data-badge-value]')
        .forEach((el) => {
          (el as HTMLElement).textContent = content;
        });
    });
  }

  private shouldShow(): boolean {
    if (this.hidden) return false;

    if (this.isDot) return true;

    if (isNumber(this.value) || isStringNumber(this.value)) {
      const num = Number(this.value);
      if (num === 0) return this.showZero;
      return true;
    }

    if (typeof this.value === 'string' && this.value !== '') return true;

    return false;
  }

  private getDisplayContent(): string {
    if (this.isDot) return '';

    if (isNumber(this.value) || isStringNumber(this.value)) {
      const num = Number(this.value);
      if (typeof this.max === 'number' && num > this.max) {
        return `${this.max}+`;
      }
      return String(num);
    }

    return String(this.value);
  }

  private getBadgeStyle(): Record<string, string> {
    const style: Record<string, string> = {};

    if (this.color) {
      style.backgroundColor = this.color;
    }

    let transform = 'translateY(-50%) translateX(50%)';

    let parsedOffset: number[] = [];
    if (typeof this.offset === 'string') {
      try {
        parsedOffset = JSON.parse(this.offset);
      } catch {
        parsedOffset = this.offset
          .replace(/[\[\]]/g, '')
          .split(',')
          .map((v) => Number(v.trim()));
      }
    } else if (Array.isArray(this.offset)) {
      parsedOffset = this.offset;
    }
    if (parsedOffset.length === 2) {
      const [x, y] = parsedOffset;
      transform += ` translate(${x}px, ${y}px)`;
    }

    style.transform = transform;

    if (this.badgeStyle) {
      Object.assign(style, this.badgeStyle);
    }

    return style;
  }

  render() {
    const show = this.shouldShow();
    const content = this.getDisplayContent();
    const badgeStyle = this.getBadgeStyle();
    const hasCustomContent = !!this.el?.querySelector('[slot="content"]');

    return (
      <Host class={ns.b()}>
        <slot />
        {show && (
          <sup
            class={[
              ns.e('content'),
              this.type ? ns.em('content', this.type) : '',
              this.isDot ? ns.is('dot') : '',
              this.badgeClass || '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              ...badgeStyle,
              '--zane-badge-content': `"${content}"`,
            }}
            data-value={String(this.value)}
          >
            {hasCustomContent ? <slot name="content"></slot> : content}
          </sup>
        )}
      </Host>
    );
  }
}
