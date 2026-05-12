import type { ColSize } from './types';

import { Component, Element, h, Host, Prop, State } from '@stencil/core';

import { useNamespace } from '../../hooks';
import { mutable } from '../../types';
import { isNumber, isObject, type ReactiveObject } from '../../utils';
import type { RowContext } from '../row/types';
import { getRowContext } from '../row/utils';
import classNames from 'classnames';

const ns = useNamespace('col');

@Component({
  styleUrl: 'zane-col.scss',
  tag: 'zane-col',
})
export class ZaneRow {
  @Element() el!: HTMLElement;

  @State() gutter: number = 0;

  @Prop()
  lg: ColSize = mutable({} as const);

  @Prop()
  md: ColSize = mutable({} as const);

  @Prop()
  offset: number = 0;

  @Prop()
  pull: number = 0;

  @Prop()
  push: number = 0;

  @Prop()
  sm: ColSize = mutable({} as const);

  @Prop()
  span: number = 24;

  @Prop()
  xl: ColSize = mutable({} as const);

  @Prop()
  xs: ColSize = mutable({} as const);

  private rowContext?: ReactiveObject<RowContext>;

  componentWillLoad() {
    this.rowContext = getRowContext(this.el);
    this.gutter = this.rowContext?.value.gutter ?? 0;
  }

  render() {
    const classes: string[] = [];
    const pos = ['span', 'offset', 'pull', 'push'] as const;

    pos.forEach((prop) => {
      const size = this[prop];
      if (isNumber(size)) {
        if (prop === 'span') classes.push(ns.b(`${this[prop]}`));
        else if (size > 0) classes.push(ns.b(`${prop}-${this[prop]}`));
      }
    });

    const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
    sizes.forEach((size) => {
      if (isNumber(this[size])) {
        classes.push(ns.b(`${size}-${this[size]}`));
      } else if (isObject(this[size])) {
        Object.entries(this[size]).forEach(([prop, sizeProp]) => {
          classes.push(
            prop === 'span'
              ? ns.b(`${size}-${sizeProp}`)
              : ns.b(`${size}-${prop}-${sizeProp}`),
          );
        });
      }
    });

    // this is for the fix
    if (this.gutter) {
      classes.push(ns.is('guttered'));
    }

    const colKls = classNames(
      ns.b(),
      ...classes
    );

    const styles = {} as Record<string, string>;
    if (this.gutter) {
      styles.paddingLeft = styles.paddingRight = `${this.gutter / 2}px`;
    }

    return (
      <Host class={colKls} style={styles}>
        <slot />
      </Host>
    );
  }
}
