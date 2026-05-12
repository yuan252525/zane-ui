import { Component, Element, Host, Prop, State, h } from '@stencil/core';
import { useNamespace } from '../../hooks/useNamespace';
import classNames from 'classnames';
import { getMenuContext } from './utils';
import type { ReactiveObject } from '../../utils/reactive/ReactiveObject';
import type { MenuContext } from './types';

const ns = useNamespace('menu');

@Component({
  tag: 'zane-menu-item',
  styleUrl: 'zane-menu-item.scss',
})
export class ZaneMenuItem {
  @Element() el!: HTMLZaneMenuItemElement;

  @Prop() index: string = '';

  @Prop({ reflect: true }) disabled: boolean = false;

  @State() isActive: boolean = false;

  private menuContext: ReactiveObject<MenuContext> | null = null;

  componentWillLoad() {
    this.menuContext = getMenuContext(this.el);

    if (this.menuContext) {
      this.isActive = this.menuContext.value.activeIndex === this.index;

      this.menuContext.change$.subscribe((change) => {
        if (change.key === 'activeIndex') {
          this.isActive = change.value === this.index;
        }
      });
    }
  }

  private handleClick = () => {
    if (this.disabled || !this.menuContext) return;
    this.menuContext.value.handleMenuItemClick(this.index, this.getIndexPath());
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.handleClick();
    }
  };

  private getIndexPath = (): string[] => {
    const path: string[] = [];
    let parent: any = this.el.parentElement;
    while (parent) {
      if (parent.tagName === 'ZANE-SUB-MENU' && (parent as any).index) {
        path.unshift((parent as any).index);
      }
      parent = parent.rawParent ?? parent.parentElement;
    }
    path.push(this.index);
    return path;
  };

  render() {
    const itemKls = classNames(
      ns.e('item'),
      ns.is('active', this.isActive),
      ns.is('disabled', this.disabled),
    );

    return (
      <Host class={itemKls} role="menuitem" tabindex={this.disabled ? -1 : 0}>
        <div
          style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}
          onClick={this.handleClick}
          onKeyDown={this.handleKeyDown}
        >
          <slot></slot>
        </div>
      </Host>
    );
  }
}
