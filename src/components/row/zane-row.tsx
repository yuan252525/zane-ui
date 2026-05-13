import { Component, Element, h, Host, Method, Prop } from '@stencil/core';

import { rowContexts } from './constants';
import { useNamespace } from '../../hooks';
import type { RowAlignType, RowContext, RowJustifyType } from './types';
import { hasRawParent, ReactiveObject } from '../../utils';
import classNames from 'classnames';

const ns = useNamespace('row');

@Component({
  styleUrl: 'zane-row.scss',
  tag: 'zane-row',
})
export class ZaneRow {
  @Prop()
  align?: RowAlignType;

  @Element() el!: HTMLElement;

  @Prop()
  gutter: number = 0;

  @Prop()
  justify: RowJustifyType = 'start';

  private context?: ReactiveObject<RowContext>;

  @Method()
  async getContext() {
    return this.context;
  }

  componentWillLoad() {
    this.context = new ReactiveObject<RowContext>({
      gutter: this.gutter
    });
    rowContexts.set(this.el, this.context);
  }

  disconnectedCallback() {
    if (!hasRawParent(this.el)) {
      rowContexts.delete(this.el);
      this.context = undefined;
    }
  }

  render() {
    const rowKls = classNames(
      ns.b(),
      ns.is(`justify-${this.justify}`, this.justify !== 'start'),
      ns.is(`align-${this.align}`, !!this.align),
    );

    const styles = {} as Record<string, string>;
    if (!this.gutter) {
      return styles;
    }

    styles.marginRight = styles.marginLeft = `-${this.gutter / 2}px`;

    return (
      <Host class={rowKls} style={styles}>
        <slot />
      </Host>
    );
  }
}
