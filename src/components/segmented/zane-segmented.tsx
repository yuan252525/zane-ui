import type { ComponentSize } from '../../types';
import type {
  RenderItemFunction,
  SegmentedDirection,
  SegmentedOption,
  SegmentedOptionProps,
  SegmentedOptionValue,
  SegmentedThumbState,
} from './types';
import type { FormItemContext } from '../form/types';
import type { ConfigProviderContext } from '../config-provider/types';

import {
  Component,
  Element,
  Event,
  EventEmitter,
  h,
  Host,
  Prop,
  State,
  Watch,
} from '@stencil/core';

import { useNamespace, useResizeObserver } from '../../hooks';
import { segmentedDefaultProps } from './constants';
import { getConfigProviderContext } from '../config-provider/utils';
import { getFormItemContext } from '../form/utils';
import { debugWarn, inLabel, isObject, nextFrame, ReactiveObject } from '../../utils';
import classNames from 'classnames';
import isEqual from 'lodash-es/isEqual';
import state from '../../global/store';

const ns = useNamespace('segmented');

@Component({
  tag: 'zane-segmented',
  styleUrl: 'zane-segmented.scss',
})
export class ZaneSegmented {
  @Element() el!: HTMLElement;

  @Prop({ attribute: 'id', mutable: true }) zId?: string = undefined;

  @Prop({ mutable: true }) value?: SegmentedOptionValue = undefined;

  @Prop() options?: SegmentedOption[] = undefined;

  @Prop() direction: SegmentedDirection = 'horizontal';

  @Prop() size: ComponentSize = '';

  @Prop() disabled?: boolean = undefined;

  @Prop() block: boolean = false;

  @Prop() props: SegmentedOptionProps = { ...segmentedDefaultProps };

  @Prop() name?: string = undefined;

  @Prop() ariaLabel?: string = undefined;

  @Prop() validateEvent: boolean = true;

  @Event({ eventName: 'zChange', bubbles: false })
  changeEvent?: EventEmitter<SegmentedOptionValue>;

  @State() actualSize: ComponentSize = '';

  @State() actualDisabled: boolean = false;

  @State() thumbState: SegmentedThumbState = {
    isInit: false,
    width: 0,
    height: 0,
    translateX: 0,
    translateY: 0,
    focusVisible: false,
  };

  @State() inputId?: string;

  @State() aliasProps: Required<SegmentedOptionProps> = {
    ...segmentedDefaultProps,
  };

  @Prop() renderItem?: RenderItemFunction;

  private populatedItems = new WeakMap<HTMLElement, string>();

  private formItemContext?: ReactiveObject<FormItemContext>;

  private configProviderContext?: ReactiveObject<ConfigProviderContext>;

  private segmentedRef!: HTMLDivElement;

  private unResizeObserver!: () => void;

  @Watch('size')
  handleSizeChange() {
    this.actualSize =
      this.size ||
      this.configProviderContext?.value.size ||
      '';
  }

  @Watch('disabled')
  handleDisabledChange() {
    this.actualDisabled = this.disabled ?? false;
  }

  @Watch('props')
  handlePropsChange() {
    this.aliasProps = { ...segmentedDefaultProps, ...this.props };
  }

  @Watch('value')
  handleValueChange(newVal: SegmentedOptionValue, oldVal: SegmentedOptionValue) {
    nextFrame(() => this.updateThumbPosition());

    if (this.validateEvent && !isEqual(newVal, oldVal)) {
      this.formItemContext?.value
        .validate('change')
        .catch((err) => debugWarn(err));
    }
  }

  @Watch('options')
  handleOptionsChange() {
    nextFrame(() => this.updateThumbPosition());
  }

  @Watch('zId')
  handleWatchId() {
    const newId = this.zId ?? `${ns.namespace}-id-${state.idInjection.prefix}-${state.idInjection.current++}`;
    if (this.inputId !== newId) {
      if (this.formItemContext?.value.removeInputId && !inLabel(this.el)) {
        if (this.inputId) {
          this.formItemContext.value.removeInputId(this.inputId);
        }
        this.formItemContext?.value.addInputId(newId);
      }
      this.inputId = newId;
    }
  }

  componentWillLoad() {
    this.formItemContext = getFormItemContext(this.el);
    this.configProviderContext = getConfigProviderContext(this.el);

    this.handleWatchId();

    this.handlePropsChange();
    this.handleSizeChange();
    this.handleDisabledChange();

    this.configProviderContext?.change$.subscribe(({ key }) => {
      if (key === 'size') this.handleSizeChange();
    });

    this.formItemContext?.change$.subscribe(({ key }) => {
      if (key === 'size') this.handleSizeChange();
    });
  }

  componentDidLoad() {
    this.unResizeObserver = useResizeObserver(this.segmentedRef, () =>
      this.updateThumbPosition()
    );
    nextFrame(() => this.updateThumbPosition());
  }

  disconnectedCallback() {
    this.unResizeObserver?.();
    if (this.formItemContext?.value.removeInputId && this.inputId) {
      this.formItemContext.value.removeInputId(this.inputId);
    }
  }

  private updateThumbPosition = () => {
    if (!this.segmentedRef) return;

    const selectedItem = this.segmentedRef.querySelector(
      '.is-selected'
    ) as HTMLElement;
    const selectedItemInput = this.segmentedRef.querySelector(
      '.is-selected input'
    ) as HTMLElement;

    if (!selectedItem || !selectedItemInput) {
      this.thumbState = {
        isInit: false,
        width: 0,
        height: 0,
        translateX: 0,
        translateY: 0,
        focusVisible: false,
      };
      return;
    }

    let focusVisible = false;
    try {
      focusVisible = selectedItemInput.matches(':focus-visible');
    } catch {
      // :focus-visible may not be supported in test environments
    }

    this.thumbState = {
      isInit: true,
      width: selectedItem.offsetWidth,
      height: selectedItem.offsetHeight,
      translateX: selectedItem.offsetLeft,
      translateY: selectedItem.offsetTop,
      focusVisible,
    };
  };

  private getValue = (item: SegmentedOption): SegmentedOptionValue => {
    return isObject(item) ? item[this.aliasProps.value] : item;
  };

  private getLabel = (item: SegmentedOption): string | number | boolean => {
    return isObject(item) ? item[this.aliasProps.label] : item;
  };

  private getDisabled = (item: SegmentedOption): boolean => {
    return !!(
      this.actualDisabled ||
      (isObject(item) ? item[this.aliasProps.disabled] : false)
    );
  };

  private getSelected = (item: SegmentedOption): boolean => {
    return this.value === this.getValue(item);
  };

  private handleChange = (_evt: Event, item: SegmentedOption) => {
    const newValue = this.getValue(item);
    this.value = newValue;
    nextFrame(() => {
      this.changeEvent?.emit(newValue);
    });
  };

  private isLabeledByFormItem = (): boolean => {
    return !!(
      !this.ariaLabel &&
      this.formItemContext &&
      this.formItemContext?.value.inputIds &&
      this.formItemContext?.value.inputIds.length <= 1
    );
  };

  private renderItemContent = (
    item: SegmentedOption,
    index: number,
  ) => {
    if (this.renderItem) {
      const itemKey = String(this.getValue(item));
      return (
        <div
          class={ns.e('item-custom')}
          ref={(el) => {
            if (el) {
              const prevKey = this.populatedItems.get(el);
              if (prevKey !== itemKey) {
                this.populatedItems.set(el, itemKey);
                const rendered = this.renderItem!(item, index);
                el.replaceChildren(rendered);
              }
            }
          }}
        />
      );
    }
    return this.getLabel(item);
  };

  render() {
    if (!this.options?.length) {
      return <Host />;
    }

    const segmentedCls = classNames(
      ns.b(),
      ns.m(this.actualSize),
      ns.is('block', this.block)
    );

    const selectedStyle = {
      width:
        this.direction === 'vertical' ? '100%' : `${this.thumbState.width}px`,
      height:
        this.direction === 'vertical'
          ? `${this.thumbState.height}px`
          : '100%',
      transform:
        this.direction === 'vertical'
          ? `translateY(${this.thumbState.translateY}px)`
          : `translateX(${this.thumbState.translateX}px)`,
      display: this.thumbState.isInit ? 'block' : 'none',
    };

    const selectedOption = this.options.find(
      (item) => this.getValue(item) === this.value
    );
    const isSelectedDisabled = selectedOption
      ? this.getDisabled(selectedOption)
      : false;

    const selectedCls = classNames(
      ns.e('item-selected'),
      ns.is('disabled', isSelectedDisabled),
      ns.is('focus-visible', this.thumbState.focusVisible)
    );

    const groupName = this.name || this.inputId;

    return (
      <Host>
        <div
          id={this.inputId}
          ref={(el) => (this.segmentedRef = el!)}
          class={segmentedCls}
          role="radiogroup"
          ariaLabel={
            !this.isLabeledByFormItem()
              ? this.ariaLabel || 'segmented'
              : undefined
          }
          ariaLabelledby={
            this.isLabeledByFormItem()
              ? this.formItemContext?.value.labelId
              : undefined
          }
        >
          <div class={classNames(ns.e('group'), ns.em('group', this.direction))}>
            <div class={selectedCls} style={selectedStyle} />
            {this.options.map((item, index) => {
              const itemCls = classNames(
                ns.e('item'),
                ns.is('selected', this.getSelected(item)),
                ns.is('disabled', this.getDisabled(item))
              );
              return (
                <label key={index} class={itemCls}>
                  <input
                    class={ns.e('item-input')}
                    type="radio"
                    name={groupName}
                    disabled={this.getDisabled(item)}
                    checked={this.getSelected(item)}
                    onChange={(evt) => this.handleChange(evt, item)}
                  />
                  <div class={ns.e('item-label')}>
                    {this.renderItemContent(item, index)}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </Host>
    );
  }
}
