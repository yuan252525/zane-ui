import { Component, h, Host, Prop } from '@stencil/core';

import { useNamespace } from '../../hooks';

const ns = useNamespace('aside');

@Component({
  styleUrl: 'zane-aside.scss',
  tag: 'zane-aside',
})
export class ZaneAside {
  @Prop() width: string | undefined;

  render() {
    const style = this.width
      ? ns.cssVarBlock({
          width: this.width,
        })
      : {};

    return (
      <Host class={ns.b()} style={style}>
        <slot />
      </Host>
    );
  }
}
