import type { ComponentSize } from '../../types';

import { Component, Element, h, Host, Method, Prop, Watch } from '@stencil/core';

import { useNamespace } from '../../hooks';
import type { ButtonGroupContext, ButtonType } from './types';
import { hasRawParent, ReactiveObject } from '../../utils';
import { buttonGroupContexts } from './constants';

const ns = useNamespace('button');

@Component({
  styleUrl: 'zane-button-group.scss',
  tag: 'zane-button-group',
})
export class ZaneButtonGroup {
  @Element() el: HTMLElement | undefined;
  @Prop() size: ComponentSize | undefined;

  @Prop() type: ButtonType | undefined;

  @Prop() disabled: boolean | undefined;

  private context: ReactiveObject<ButtonGroupContext> | undefined;

  componentWillLoad() {
    this.context = new ReactiveObject<ButtonGroupContext>({
      size: this.size,
      type: this.type,
      disabled: this.disabled,
    });
    buttonGroupContexts.set(this.el!, this.context);
  }

  disconnectedCallback() {
    if (!hasRawParent(this.el!)) {
      buttonGroupContexts.delete(this.el!);
    }
  }

  @Watch('size')
  handleWatchSize() {
    this.context!.value.size = this.size;
  }

  @Watch('type')
  handleWatchType() {
    this.context!.value.type = this.type;
  }

  @Watch('disabled')
  handleWatchDisabled() {
    this.context!.value.disabled = this.disabled;
  }

  @Method()
  async getContext() {
    return this.context;
  }

  render() {
    return (
      <Host class={ns.b('group')}>
        <slot></slot>
      </Host>
    );
  }
}
