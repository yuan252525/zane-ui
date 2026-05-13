
import { Component, h, Prop, Element, State, Watch } from '@stencil/core';
import type { FormContext, FormItemContext } from './types';
import { getFormContext, getFormItemContext } from './utils';
import { nextFrame, throwError, type ReactiveObject } from '../../utils';
import { useNamespace } from '../../hooks';

const ns = useNamespace('form')

const COMPONENT_NAME = 'zane-form-label-wrap'

@Component({
  tag: 'zane-form-label-wrap',
})
export class ZaneFormLabelWrap {
  @Element() el: HTMLElement | undefined;
  
  @Prop() isAutoWidth: boolean = false;

  @Prop() updateAll: boolean = false;

  @State() computedWidth: number = 0;

  private rootEl: HTMLElement | undefined;
  
  private hasDefaultSlot = false;

  private formContext: ReactiveObject<FormContext> | undefined;

  private formItemContext: ReactiveObject<FormItemContext> | undefined;

  componentWillLoad() {
    this.formContext = getFormContext(this.el!);
    this.formItemContext = getFormItemContext(this.el!);

    if (!this.formItemContext) {
      throwError(COMPONENT_NAME, 'usage: <zane-form-item><zane-form-label-wrap /></zane-form-item>')
    }

    this.hasDefaultSlot = Array.from(this.el!.childNodes).some(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        return (node.textContent?.trim().length ?? 0) > 0;
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        return true;
      }
      return false;
    });
  }

  componentDidLoad() {
    this.updateLabelWidth();
  }

  disconnectedCallback() {
    this.updateLabelWidth('remove');
  }

  componentDidUpdate() {
    this.updateLabelWidth();
  }

  @Watch('computedWidth')
  handleComputedWidthChanged(val: number, oldVal: number) {
    if (this.updateAll) {
      this.formContext?.value.registerLabelWidth(val, oldVal);
    }
  }

  private getLabelWidth = () => {
    if (this.rootEl?.firstElementChild) {
      const width = window.getComputedStyle(this.rootEl.firstElementChild).width
      return Math.ceil(Number.parseFloat(width))
    } else {
      return 0
    }
  }

  private updateLabelWidth = (action: 'update' | 'remove' = 'update') => {
    nextFrame(() => {
      if (this.hasDefaultSlot && this.isAutoWidth) {
        if (action === 'update') {
          this.computedWidth = this.getLabelWidth()
        } else if (action === 'remove') {
          this.formContext?.value.deregisterLabelWidth(this.computedWidth);
        }
      }
    })
  }

  render() {
    if (this.isAutoWidth) {
      const autoLabelWidth = this.formContext?.value.autoLabelWidth
      const hasLabel = this.formItemContext?.value.hasLabel
      const style: Record<string, any> = {};
      if (hasLabel && autoLabelWidth && autoLabelWidth !== 'auto') {
        const marginWidth = Math.max(
          0,
          Number.parseInt(autoLabelWidth, 10) - this.computedWidth
        )
        const labelPosition =
          this.formItemContext?.value.labelPosition || this.formContext?.value.labelPosition;

        const marginPosition =
          labelPosition === 'left' ? 'marginRight' : 'marginLeft';

        if (marginWidth) {
          style[marginPosition] = `${marginWidth}px`;
        }
      }
      return (<div
        ref={(el) => this.rootEl = el}
        class={ns.be('item', 'label-wrap')}
        style={style}
      >
        <slot></slot>
      </div>);
    }
    return <span ref={(el) => this.rootEl = el}><slot></slot></span>;
  }

}
