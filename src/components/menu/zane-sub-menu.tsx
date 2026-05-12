import { Component, Element, Host, Prop, State, Watch, h } from '@stencil/core';
import { useNamespace } from '../../hooks/useNamespace';
import { getTransitionInfo, whenTransitionEnds } from '../../utils/dom/transition';
import classNames from 'classnames';
import { getMenuContext, getSubMenuContext } from './utils';
import { subMenuContexts } from './constants';
import { ReactiveObject } from '../../utils/reactive/ReactiveObject';
import type { MenuContext, SubMenuContext } from './types';

const ns = useNamespace('menu');

@Component({
  tag: 'zane-sub-menu',
  styleUrl: 'zane-sub-menu.scss',
})
export class ZaneSubMenu {
  @Element() el!: HTMLZaneSubMenuElement;

  @Prop() index: string = '';

  @Prop({ reflect: true }) disabled: boolean = false;

  @Prop() popperClass: string = '';

  @Prop() showTimeout: number = 300;

  @Prop() hideTimeout: number = 300;

  @State() isOpened: boolean = false;

  @State() hasActiveChild: boolean = false;

  @State() isActive: boolean = false;

  @State() hasChildren: boolean = false;

  @State() level: number = 0;

  private menuContext: ReactiveObject<MenuContext> | null = null;

  private subMenuContext: ReactiveObject<SubMenuContext> | null = null;

  private wrapRef: HTMLElement;

  private showTimer: ReturnType<typeof setTimeout> | null = null;

  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  get isInlineMode(): boolean {
    return this.menuContext?.value.mode === 'vertical' && !this.menuContext?.value.collapse;
  }

  get isHorizontal(): boolean {
    return this.menuContext?.value.mode === 'horizontal';
  }

  get isCollapse(): boolean {
    return this.menuContext?.value.mode === 'vertical' && this.menuContext?.value.collapse;
  }

  private childObserver: MutationObserver | null = null;

  private checkHasChildren = (): boolean => {
    for (let i = 0; i < this.el.children.length; i++) {
      const child = this.el.children[i] as HTMLElement;
      if (!child.getAttribute('slot')) {
        return true;
      }
    }
    return false;
  };

  private updateHasChildren = () => {
    this.hasChildren = this.checkHasChildren();
  };

  componentWillLoad() {
    this.menuContext = getMenuContext(this.el);

    // Detect children from light DOM (works before shadow DOM is ready)
    this.updateHasChildren();

    if (this.menuContext) {
      this.isOpened = this.menuContext.value.openedMenus.includes(this.index);

      this.menuContext.change$.subscribe((change) => {
        if (change.key === 'openedMenus') {
          this.isOpened = change.value.includes(this.index);
        }
        if (change.key === 'activeIndex') {
          this.hasActiveChild = this.checkActiveChild(change.value);
          this.isActive = change.value === this.index;
        }
        if (change.key === 'collapse' || change.key === 'mode') {
          // force re-render when mode changes
          this.isOpened = false;
        }
      });

      // Initialize self-active state
      this.isActive = this.menuContext.value.activeIndex === this.index;

      // Get nesting level from parent sub-menu
      this.subMenuContext = getSubMenuContext(this.el);
      this.level = this.subMenuContext ? this.subMenuContext.value.level + 1 : 0;

      // Create own sub-menu context for children
      const ownContext = new ReactiveObject<SubMenuContext>({
        level: this.level,
        parentIndex: this.index,
        isOpened: this.isOpened,
      });
      subMenuContexts.set(this.el, ownContext);
    }
  }

  componentDidLoad() {
    // Re-check after element is fully connected (slot content is distributed)
    this.updateHasChildren();

    // Watch for child changes to update hasChildren dynamically
    this.childObserver = new MutationObserver(() => {
      this.updateHasChildren();
    });
    this.childObserver.observe(this.el, { childList: true });

    if (this.isInlineMode) {
      if (this.isOpened) {
        this.handleShow();
      } else if (this.wrapRef) {
        // Initially closed: hide immediately without animation
        this.wrapRef.style.display = 'none';
        this.wrapRef.style.height = '0';
      }
    }
  }

  @Watch('isOpened')
  watchIsOpenedHandler(val: boolean) {
    if (this.isInlineMode) {
      val ? this.handleShow() : this.handleHidden();
    }
    // Update own sub-menu context
    if (this.subMenuContext) {
      this.subMenuContext.value.isOpened = val;
    }
  }

  disconnectedCallback() {
    this.clearTimers();
    if (this.childObserver) {
      this.childObserver.disconnect();
      this.childObserver = null;
    }
    subMenuContexts.delete(this.el);
  }

  private checkActiveChild = (activeIndex: string): boolean => {
    const items = this.el.querySelectorAll('zane-menu-item');
    for (let i = 0; i < items.length; i++) {
      if ((items[i] as any).index === activeIndex) {
        return true;
      }
    }
    const subMenus = this.el.querySelectorAll('zane-sub-menu');
    for (let i = 0; i < subMenus.length; i++) {
      const sub = subMenus[i] as HTMLZaneSubMenuElement;
      // check if any nested item has the active index
      const nestedItems = sub.querySelectorAll('zane-menu-item');
      for (let j = 0; j < nestedItems.length; j++) {
        if ((nestedItems[j] as any).index === activeIndex) {
          return true;
        }
      }
    }
    return false;
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

  // --- Inline collapse animation ---
  private handleShow = () => {
    if (!this.wrapRef) return;
    this.wrapRef.style.display = '';
    // height is 0 from previous hide, force reflow then set to scrollHeight
    const endHeight = this.wrapRef.scrollHeight;
    this.wrapRef.style.height = endHeight + 'px';
    const { timeout } = getTransitionInfo(this.wrapRef, 'transition');
    whenTransitionEnds(this.wrapRef, 'transition', timeout, () => {
      // Reset to auto so nested content can expand freely
      this.wrapRef.style.height = 'auto';
    });
  };

  private handleHidden = () => {
    if (!this.wrapRef) return;
    // Capture current height from auto, force reflow, then collapse to 0
    const startHeight = this.wrapRef.scrollHeight;
    this.wrapRef.style.height = startHeight + 'px';
    this.wrapRef.offsetHeight; // force reflow
    this.wrapRef.style.height = '0';
    const { timeout } = getTransitionInfo(this.wrapRef, 'transition');
    whenTransitionEnds(this.wrapRef, 'transition', timeout, () => {
      this.wrapRef.style.display = 'none';
    });
  };

  // --- Click handler ---
  private handleClick = () => {
    if (this.disabled || !this.menuContext) return;
    const indexPath = this.getIndexPath();
    if (this.hasChildren) {
      // Has children: toggle expand/collapse
      if (this.isOpened) {
        this.menuContext.value.handleSubMenuClose(this.index, indexPath);
      } else {
        this.menuContext.value.handleSubMenuOpen(this.index, indexPath);
      }
    } else {
      // No children: act like a menu-item, trigger select
      this.menuContext.value.handleSubMenuClick(this.index, indexPath);
    }
  };

  // --- Hover handlers (for popup mode) ---
  private handleMouseEnter = () => {
    if (this.disabled || !this.menuContext) return;
    if (this.menuContext.value.menuTrigger !== 'hover') return;

    this.clearTimers();
    this.showTimer = setTimeout(() => {
      const indexPath = this.getIndexPath();
      this.menuContext.value.handleSubMenuOpen(this.index, indexPath);
    }, this.showTimeout);
  };

  private handleMouseLeave = () => {
    if (this.disabled || !this.menuContext) return;
    if (this.menuContext.value.menuTrigger !== 'hover') return;

    this.clearTimers();
    this.hideTimer = setTimeout(() => {
      const indexPath = this.getIndexPath();
      this.menuContext.value.handleSubMenuClose(this.index, indexPath);
    }, this.hideTimeout);
  };

  private clearTimers = () => {
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  };

  private handlePopperMouseEnter = () => {
    this.clearTimers();
  };

  private handlePopperMouseLeave = () => {
    this.handleMouseLeave();
  };

  private getTitleStyle = (): Record<string, string> => {
    const padding = 20 + this.level * 20;
    return { paddingLeft: padding + 'px' };
  };

  render() {
    const subKls = classNames(
      ns.e('sub'),
      ns.is('opened', this.isOpened),
      ns.is('disabled', this.disabled),
      ns.is('active', this.hasActiveChild || this.isActive),
    );

    const titleKls = classNames(
      ns.be('sub', 'title'),
      ns.is('active', this.hasActiveChild || this.isActive),
      ns.is('disabled', this.disabled),
    );

    const arrowKls = classNames(
      ns.be('sub', 'arrow'),
      ns.is('opened', this.isOpened),
    );

    const isPopup = !this.isInlineMode;

    return (
      <Host class={subKls} role="menuitem" aria-haspopup="true" aria-expanded={this.isOpened}>
        <div
          class={titleKls}
          onClick={this.handleClick}
          onMouseEnter={this.handleMouseEnter}
          onMouseLeave={this.handleMouseLeave}
          style={this.isInlineMode ? this.getTitleStyle() : undefined}
        >
          <slot name="title"></slot>
          {this.hasChildren && (
            <zane-icon
              class={arrowKls}
              name="arrow-down-s-line"
              style={this.isOpened ? { transform: this.isHorizontal ? 'rotate(0deg)' : 'rotate(180deg)' } : undefined}
            ></zane-icon>
          )}
        </div>

        {this.isInlineMode && (
          <div
            class={ns.be('sub', 'wrap')}
            ref={(el) => (this.wrapRef = el)}
          >
            <div
              class={ns.be('sub', 'content')}
              style={{ '--zane-sub-menu-level': this.level + 1 } as any}
            >
              <slot></slot>
            </div>
          </div>
        )}

        {isPopup && (
          <div
            class={classNames(ns.be('sub', 'popper'), this.popperClass)}
            style={{ display: this.isOpened ? '' : 'none' }}
            onMouseEnter={this.handlePopperMouseEnter}
            onMouseLeave={this.handlePopperMouseLeave}
          >
            <div class={ns.be('sub', 'content')}>
              <slot></slot>
            </div>
          </div>
        )}
      </Host>
    );
  }
}
