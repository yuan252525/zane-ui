import { Component, Element, Event, EventEmitter, Host, Prop, Watch, h } from '@stencil/core';
import { useNamespace } from '../../hooks/useNamespace';
import { ReactiveObject } from '../../utils/reactive/ReactiveObject';
import classNames from 'classnames';
import { menuContexts } from './constants';
import type { MenuContext, MenuMode, MenuTrigger } from './types';



const ns = useNamespace('menu');

@Component({
  tag: 'zane-menu',
  styleUrl: 'zane-menu.scss',
})
export class ZaneMenu {
  @Element() el!: HTMLElement;

  @Prop({ reflect: true }) mode: MenuMode = 'vertical';

  @Prop({ reflect: true }) collapse: boolean = false;

  @Prop() backgroundColor: string = '';

  @Prop() textColor: string = '';

  @Prop() activeTextColor: string = '';

  @Prop() defaultActive: string = '';

  @Prop({ reflect: false }) defaultOpeneds: string[] = [];

  @Prop({ reflect: true }) uniqueOpened: boolean = false;

  @Prop() menuTrigger: MenuTrigger = 'click';

  @Prop() ellipsis: boolean = false;

  @Event() zSelect!: EventEmitter<{ index: string; indexPath: string[] }>;

  @Event() zOpen!: EventEmitter<{ index: string; indexPath: string[] }>;

  @Event() zClose!: EventEmitter<{ index: string; indexPath: string[] }>;

  private menuContext!: ReactiveObject<MenuContext>;

  componentWillLoad() {
    this.menuContext = new ReactiveObject<MenuContext>({
      mode: this.mode,
      collapse: this.collapse,
      backgroundColor: this.backgroundColor,
      textColor: this.textColor,
      activeTextColor: this.activeTextColor,
      defaultActive: this.defaultActive,
      defaultOpeneds: this.defaultOpeneds,
      uniqueOpened: this.uniqueOpened,
      menuTrigger: this.menuTrigger,
      activeIndex: this.defaultActive,
      openedMenus: [...this.defaultOpeneds],
      registerMenuItem: () => {},
      unregisterMenuItem: () => {},
      registerSubMenu: () => {},
      unregisterSubMenu: () => {},
      handleMenuItemClick: this.handleMenuItemClick,
      handleSubMenuClick: this.handleSubMenuClick,
      handleSubMenuOpen: this.handleSubMenuOpen,
      handleSubMenuClose: this.handleSubMenuClose,
    });

    menuContexts.set(this.el, this.menuContext);
  }

  @Watch('mode')
  onModeChange(val: MenuMode) {
    if (this.menuContext) this.menuContext.value.mode = val;
  }

  @Watch('collapse')
  onCollapseChange(val: boolean) {
    if (this.menuContext) this.menuContext.value.collapse = val;
  }

  @Watch('backgroundColor')
  onBackgroundColorChange(val: string) {
    if (this.menuContext) this.menuContext.value.backgroundColor = val;
  }

  @Watch('textColor')
  onTextColorChange(val: string) {
    if (this.menuContext) this.menuContext.value.textColor = val;
  }

  @Watch('activeTextColor')
  onActiveTextColorChange(val: string) {
    if (this.menuContext) this.menuContext.value.activeTextColor = val;
  }

  @Watch('uniqueOpened')
  onUniqueOpenedChange(val: boolean) {
    if (this.menuContext) this.menuContext.value.uniqueOpened = val;
  }

  @Watch('menuTrigger')
  onMenuTriggerChange(val: MenuTrigger) {
    if (this.menuContext) this.menuContext.value.menuTrigger = val;
  }

  disconnectedCallback() {
    menuContexts.delete(this.el);
  }

  private handleMenuItemClick = (index: string, indexPath: string[]) => {
    this.menuContext.value.activeIndex = index;
    this.zSelect.emit({ index, indexPath });

    if (this.mode === 'horizontal' || (this.mode === 'vertical' && this.collapse)) {
      this.menuContext.value.openedMenus = [];
    }
  };

  private handleSubMenuClick = (index: string, indexPath: string[]) => {
    this.menuContext.value.activeIndex = index;
    this.zSelect.emit({ index, indexPath });
  };

  private handleSubMenuOpen = (index: string, indexPath: string[]) => {
    if (this.uniqueOpened) {
      this.menuContext.value.openedMenus = this.menuContext.value.openedMenus
        .filter((i: string) => indexPath.includes(i));
    }
    const openedMenus = [...this.menuContext.value.openedMenus, index];
    this.menuContext.value.openedMenus = openedMenus;
    this.zOpen.emit({ index, indexPath });
  };

  private handleSubMenuClose = (index: string, indexPath: string[]) => {
    const openedMenus = this.menuContext.value.openedMenus.filter((i: string) => i !== index);
    this.menuContext.value.openedMenus = openedMenus;
    this.zClose.emit({ index, indexPath });
  };

  render() {
    const rootKls = classNames(
      ns.b(),
      ns.m(this.mode),
      ns.is('collapse', this.collapse),
    );

    const style: Record<string, string> = {};
    if (this.backgroundColor) {
      style.backgroundColor = this.backgroundColor;
    }
    if (this.textColor) {
      style['--zane-menu-text-color'] = this.textColor;
    }
    if (this.activeTextColor) {
      style['--zane-menu-active-color'] = this.activeTextColor;
    }

    return (
      <Host class={rootKls} style={style} role="menubar">
        <slot></slot>
      </Host>
    );
  }
}
