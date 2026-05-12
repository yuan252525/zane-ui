import type { CollapseActiveName, CollapseContext } from './types';
import { Component, Element, h, Prop, State, Watch } from '@stencil/core';
import { useNamespace } from '../../hooks';
import { getTransitionInfo, nextFrame, whenTransitionEnds, type ReactiveObject } from '../../utils';
import state from '../../global/store';
import { getCollapseContext } from './utils';
import classNames from 'classnames';

const ns = useNamespace('collapse');

@Component({
  tag: 'zane-collapse-item',
})
export class ZaneCollapseItem {
  @Prop() disabled: boolean = false;

  @Element() el!: HTMLElement;

  @State() focusing = false;

  @Prop() icon?: string = 'arrow-right';

  @State() isActive: boolean = false;

  @State() isClick = false;

  @Prop({ attribute: 'title' }) label: string = '';

  @Prop() name?: CollapseActiveName;

  @State() wrapperRef?: HTMLElement;

  @State() collapseItemName?: CollapseActiveName;

  private id?: number;

  private collapseContext?: ReactiveObject<CollapseContext>;

  @Watch('name')
  handleNameChange() {
    this.collapseItemName = this.name ?? `${ns.namespace}-id-${state.idInjection.prefix}-${this.id}`;
  }
  
  private wrapperHeight?: string;

  componentDidLoad() {
    const bodyStyle = getComputedStyle(this.wrapperRef!);
    this.wrapperHeight = bodyStyle.height;
    this.isActive ? this.handleShow() : this.handleHidden();
  }

  componentWillLoad() {
    this.collapseContext = getCollapseContext(this.el);
    this.id = state.idInjection.current++;
    this.collapseItemName = this.name ?? `${ns.namespace}-id-${state.idInjection.prefix}-${this.id}`;

    this.collapseContext?.change$.subscribe((change) => {
      if (change.key === 'activeNames') {
        this.isActive = !!this.collapseContext?.value.activeNames.includes(this.name!);
      }
    });
  }

  handleEnterClick(e: KeyboardEvent) {
    const target = e.target as HTMLElement;
    if (target?.closest('input, textarea, select')) return;
    e.preventDefault();
    this.collapseContext?.value.handleItemClick(this.collapseItemName!);
  }

  handleFocus() {
    setTimeout(() => {
      if (this.isClick) {
        this.isClick = false;
      } else {
        this.focusing = true;
      }
    }, 50);
  }

  handleHeaderClick = (e: MouseEvent) => {
    if (this.disabled) return;
    const target = e.target as HTMLElement;
    if (target?.closest('input, textarea, select')) return;
    this.collapseContext?.value.handleItemClick(this.collapseItemName!);
    this.focusing = false;
    this.isClick = true;
  };

  handleHidden() {
    if (this.wrapperRef) {
      const { timeout } = getTransitionInfo(this.wrapperRef, 'transition');
      this.wrapperRef.style.height = '0';
      whenTransitionEnds(this.wrapperRef, 'transition', timeout, () => {
        this.wrapperRef!.style.display = 'none';
      });
    }
  }

  handleShow() {
    if (this.wrapperRef) {
      this.wrapperRef.style.display = '';
      nextFrame(() => {
        this.wrapperRef!.style.height = this.wrapperHeight ?? '';
      });
    }
  }

  render() {

    const rootKls = classNames(
      ns.b('item'),
      ns.is('active', this.isActive),
      ns.is('disabled', this.disabled),
    );

    const headKls = classNames(
      ns.be('item', 'header'),
      ns.is('active', this.isActive),
      this.focusing && !this.disabled ? 'focusing' : '',
    );

    const arrowKls = classNames(
      ns.be('item', 'arrow'),
      ns.is('active', this.isActive)
    );

    const scopedHeadId = ns.b(`head-${this.id}`)
    return (
      <div class={rootKls}>
        <div
          class={headKls}
          id={scopedHeadId}
          onBlur={() => (this.focusing = false)}
          onClick={this.handleHeaderClick}
          onFocus={this.handleFocus}
          onKeyDown={this.handleEnterClick}
          role="button"
          tabindex={this.disabled ? -1 : 0}
        >
          <span class={ns.be('item', 'title')}>
            <slot name="title">{this.label}</slot>
          </span>
          <slot name="icon">
            {this.icon && (
              <zane-icon class={arrowKls} name={this.icon}></zane-icon>
            )}
          </slot>
        </div>

        <div
          class={ns.be('item', 'wrap')}
          id={ns.b(`content-${this.id}`)}
          ref={(el) => (this.wrapperRef = el)}
        >
          <div class={ns.be('item', 'content')}>
            <slot></slot>
          </div>
        </div>
      </div>
    );
  }

  @Watch('isActive')
  watchIsActiveHandler(val: boolean) {
    val ? this.handleShow() : this.handleHidden();
  }
}
