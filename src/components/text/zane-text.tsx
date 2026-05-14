import type { ComponentSize } from '../../types';

import { Component, Element, h, Host, Prop } from '@stencil/core';

import { useNamespace } from '../../hooks';
import type { FormContext } from '../form/types';
import type { ReactiveObject } from '../../utils';
import { getFormContext } from '../form/utils';
import classNames from 'classnames';

const ns = useNamespace('text');

@Component({
  styleUrl: 'zane-text.scss',
  tag: 'zane-text',
})
export class ZaneText {
  @Element() el!: HTMLElement;

  @Prop() lineClamp?: string;

  @Prop() size: ComponentSize = '';

  @Prop() truncated: boolean = false;

  @Prop() type: '' | 'danger' | 'info' | 'primary' | 'success' | 'warning' = '';

  private formContext?: ReactiveObject<FormContext>;

  componentWillLoad() {
    this.formContext = getFormContext(this.el);
  }

  componentDidLoad() {
    this.bindTitle();
  }

  componentDidUpdate() {
    this.bindTitle();
  }

  render() {
    const textSize = this.size || this.formContext?.value.size || 'default';
    const textKls = classNames(
      ns.b(),
      ns.m(this.type),
      ns.m(textSize),
      ns.is('truncated', this.truncated),
      ns.is('line-clamp', this.lineClamp !== undefined),
    );

    return (
      <Host class={textKls} style={{ '-webkit-line-clamp': this.lineClamp }}>
        <slot></slot>
      </Host>
    );
  }

  private bindTitle() {
    if (this.el.title) {
      return;
    }
    let shouldAddTitle = false;
    const text = this.el.textContent || '';

    if (this.truncated) {
      const width = this.el.offsetWidth;
      const scrollWidth = this.el.scrollWidth;
      if (width && scrollWidth && scrollWidth > width) {
        shouldAddTitle = true;
      }
    } else if (this.lineClamp !== undefined) {
      const height = this.el.offsetHeight;
      const scrollHeight = this.el.scrollHeight;
      if (height && scrollHeight && scrollHeight > height) {
        shouldAddTitle = true;
      }
    }

    if (shouldAddTitle) {
      this.el.setAttribute('title', text);
    } else {
      this.el.removeAttribute('title');
    }
  }
}
