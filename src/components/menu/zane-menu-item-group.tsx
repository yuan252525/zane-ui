import { Component, h, Prop, Host } from '@stencil/core';
import { useNamespace } from '../../hooks/useNamespace';

const ns = useNamespace('menu');

@Component({
  tag: 'zane-menu-item-group',
  styleUrl: 'zane-menu-item-group.scss',
})
export class ZaneMenuItemGroup {
  @Prop() groupTitle: string = '';

  render() {
    return (
      <Host role="group">
        <div class={ns.be('item-group', 'title')}>
          <slot name="title">{this.groupTitle}</slot>
        </div>
        <div class={ns.be('item-group', 'items')}>
          <slot></slot>
        </div>
      </Host>
    );
  }
}
