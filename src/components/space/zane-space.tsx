import { Component, Host, h, Element, Prop } from '@stencil/core';
import { useNamespace } from '../../hooks';

const ns = useNamespace('space');
const SIZE_MAP = { small: 8, default: 12, large: 16 };

@Component({
  tag: 'zane-space',
  styleUrl: 'zane-space.scss',
  shadow: false,
})
export class ZaneSpace {
  @Element() el: HTMLElement;

  @Prop() alignment: string = 'center';
  @Prop({ reflect: true }) direction: 'horizontal' | 'vertical' = 'horizontal';
  @Prop() fill: boolean = false;
  @Prop() fillRatio: number = 100;
  @Prop() size: string = 'small';
  @Prop() spacer: string;
  @Prop() wrap: boolean = false;

  componentDidRender() {
    const { hGap, vGap } = this.getGapValues();
    const style = this.el.style;
    if (this.fill) {
      style.setProperty('--zane-space-fill-ratio', `${this.fillRatio}%`);
    } else {
      style.removeProperty('--zane-space-fill-ratio');
    }
    style.setProperty('align-items', this.alignment);
    style.setProperty('column-gap', `${hGap}px`);
    style.setProperty('row-gap', `${vGap}px`);
    if (this.direction === 'vertical') {
      style.setProperty('flex-direction', 'column');
    } else {
      style.removeProperty('flex-direction');
    }
    if (this.wrap) {
      style.setProperty('flex-wrap', 'wrap');
    } else {
      style.removeProperty('flex-wrap');
    }
  }

  componentDidLoad() {
    requestAnimationFrame(() => {
      // Move children out of <slot> to be direct children of host
      const slot = this.el.querySelector('slot');
      if (slot && slot.children.length > 0) {
        while (slot.firstChild) {
          this.el.appendChild(slot.firstChild);
        }
        slot.remove();
      }

      const children = Array.from(this.el.children) as HTMLElement[];
      if (children.length === 0) return;

      const fragment = document.createDocumentFragment();

      children.forEach((child, index) => {
        child.style.marginLeft = '0';

        if (this.fill) {
          child.style.setProperty('--zane-fill', '1');
          child.style.display = 'flex';
        }

        fragment.appendChild(child);

        if (this.spacer && index < children.length - 1) {
          const spacer = document.createElement('span');
          spacer.className = ns.e('spacer');
          spacer.textContent = this.spacer;
          if (this.direction === 'vertical') {
            spacer.style.width = '100%';
          }
          fragment.appendChild(spacer);
        }
      });

      while (this.el.firstChild) {
        this.el.removeChild(this.el.firstChild);
      }
      this.el.appendChild(fragment);
    });
  }

  private getGapValues(): { hGap: number; vGap: number } {
    if (this.size.includes(',')) {
      const cleaned = this.size.replace(/[\[\]]/g, '');
      const parts = cleaned.split(',').map(s => parseFloat(s.trim()) || 0);
      return { hGap: parts[0] || 0, vGap: parts[1] || 0 };
    }
    const num = parseFloat(this.size);
    if (!isNaN(num) && String(num) === this.size.trim()) {
      return this.handleDirection(num);
    }
    const val = SIZE_MAP[this.size as keyof typeof SIZE_MAP] || SIZE_MAP.small;
    return this.handleDirection(val);
  }

  private handleDirection(val: number): { hGap: number; vGap: number } {
    if ((this.wrap || this.fill) && this.direction === 'horizontal') {
      return { hGap: val, vGap: val };
    }
    if (this.direction === 'horizontal') {
      return { hGap: val, vGap: 0 };
    }
    return { hGap: 0, vGap: val };
  }

  render() {
    const hostClass = [
      ns.b(),
      ns.m(this.direction),
      this.fill ? ns.m('fill') : '',
    ].filter(Boolean).join(' ');
    return (
      <Host class={hostClass}>
        <slot></slot>
      </Host>
    );
  }
}
