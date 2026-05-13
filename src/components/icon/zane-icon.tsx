import { Component, h, Prop, State, Watch } from '@stencil/core';

import { useNamespace } from '../../hooks/useNamespace';

import classNames from 'classnames';

import '@zanejs/icons';

const ns = useNamespace('icon');

const SVG_END_WITH_FLAG = '|svg'

@Component({
  styleUrl: 'zane-icon.scss',
  tag: 'zane-icon',
})
export class ZaneIcon {
  @Prop() iconClass: string = '';

  @Prop() color?: string;

  @Prop({attribute: 'prefix'}) zPrefix?: string;

  @Prop() name?: string;

  @Prop() rotate?: number;

  @Prop() size?: string;

  @Prop() spin: boolean = false;

  @Prop() styles?: object;

  @State() isSvgIcon: boolean = false;

  @Watch('name', { immediate: true })
  watchNameHandler(name: string) {
    this.isSvgIcon = name?.endsWith(SVG_END_WITH_FLAG) ?? false;
  }

  render() {
    const style = Object.assign(
      {
        color: this.color,
      },
      this.styles || {},
    ) as Record<string, string>;

    if (this.size) {
      const value = Number.isNaN(Number(this.size))
        ? this.size
        : `${this.size}px`;
      style.width = value;
      style.height = value;
      style.fontSize = value;
    }

    if (this.rotate && Number.isSafeInteger(this.rotate)) {
      style.transform = `rotate(${this.rotate}deg)`;
    }

    if (this.isSvgIcon) {
      const symbolId = `#${this.zPrefix ? `${this.zPrefix}-` : ''}${this.name}`;
      return (
        <svg
          class={classNames(ns.b(), this.iconClass, ns.is('spin', this.spin))}
          style={style}
        >
          <use xlinkHref={symbolId}></use>
        </svg>
      );
    }

    const IconName = this.name ? `zane-icon-${this.name}` : 'slot';

    return (
        <IconName
          class={classNames(ns.b(), this.iconClass, ns.is('spin', this.spin))}
          style={style}
          width={style.width}
          height={style.height}
        ></IconName>
    );
  }
}
