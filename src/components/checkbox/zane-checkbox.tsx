import {
  Component,
  Event,
  h,
  Prop,
  Element,
  type EventEmitter,
  State,
  Watch,
  Host,
} from "@stencil/core";
import type { ComponentSize } from "../../types";
import type { FormContext, FormItemContext } from "../form/types";
import type { CheckboxGroupContext } from "./types";
import type { ConfigProviderContext } from "../config-provider/types";
import { getConfigProviderContext } from "../config-provider/utils";
import { getFormContext, getFormItemContext } from "../form/utils";
import { getCheckboxGroupContext } from "./utils";
import { useNamespace } from "../../hooks";
import { isPropAbsent } from "../../utils/is/isPropAbsent";
import classNames from "classnames";
import state from "../../global/store";
import { isBoolean, nextFrame, type ReactiveObject } from "../../utils";

const ns = useNamespace("checkbox");

@Component({
  styleUrl: "zane-checkbox.scss",
  tag: "zane-checkbox",
})
export class ZaneCheckbox {
  @Element() el: HTMLElement | undefined;

  @Prop({ mutable: true }) value?: number | string | boolean;

  @Prop() label: any;

  @Prop() indeterminate?: boolean;

  @Prop() disabled?: boolean = undefined;

  @Prop() checked?: boolean;

  @Prop() name?: string;

  @Prop() trueValue?: string | number = undefined;

  @Prop() falseValue?: string | number = undefined;

  @Prop() trueLabel?: string | number = undefined;

  @Prop() falseLabel?: string | number = undefined;

  @Prop({ attribute: "id", mutable: true }) zId?: string;

  @Prop() border?: boolean;

  @Prop() size?: ComponentSize;

  @Prop({ attribute: "tabindex" }) zTabIndex?: number;

  @Prop() validateEvent: boolean = true;

  @Prop() ariaLabel?: string;

  @Prop() ariaControls?: string;

  @Event({ eventName: "zChange", bubbles: false })
  changeEvent?: EventEmitter<string | number | boolean>;

  @State() isFocused: boolean = false;

  @State() isChecked: boolean = false;

  @State() actualValue?: string | number | boolean;

  @State() isDisabled: boolean = false;

  @State() isLimitDisabled: boolean = false;

  @State() isLabeledByFormItem: boolean = false;

  @State() hasOwnLabel: boolean = false;

  @State() checkboxSize?: ComponentSize;

  private hasDefaultSlot = false;

  private formContext?: ReactiveObject<FormContext>;

  private formItemContext?: ReactiveObject<FormItemContext>;

  private checkboxGroupContext?: ReactiveObject<CheckboxGroupContext>;

  private configProviderContext?: ReactiveObject<ConfigProviderContext>;

  @Watch('isLimitDisabled')
  handleIsLimitDisabledChange() {
    this.updateIsDisabled();
  }

  @Watch('value')
  @Watch('label')
  handleValueOrLabelChange() {
    this.updateActualValue();
    this.updateIsLabeledByFormItem();
  }

  @Watch('actualValue')
  handleActualValueChange() {
    this.updateIsChecked();
    this.updateHasOwnLabel();
  }

  @Watch('size')
  handleSizeChange() {
    this.updateCheckboxSize();
  }

  componentWillLoad() {
    this.configProviderContext = getConfigProviderContext(this.el!);
    this.formContext = getFormContext(this.el!);
    this.formItemContext = getFormItemContext(this.el!);
    this.checkboxGroupContext = getCheckboxGroupContext(this.el!);
    this.hasDefaultSlot = Array.from(this.el!.childNodes).some((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return (node.textContent?.trim().length ?? 0) > 0;
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        return true;
      }
      return false;
    });

    if (!this.zId) {
      const id = state.idInjection.current++;
      const prefix = state.idInjection.prefix;
      this.zId = `${ns.namespace}-id-${prefix}-${id}`;
    }

    this.handleIsLimitDisabledChange();
    this.handleValueOrLabelChange();
    this.handleActualValueChange();
    this.handleSizeChange();

    this.checkboxGroupContext?.change$.subscribe((change) => {
      if (change.key === "value") {
        this.updateIsChecked();
        this.updateIsLimitDisabled();
      }
      if (change.key === 'size') {
        this.updateCheckboxSize();
      }
      if (change.key === 'max' || change.key === 'min') {
        this.updateIsLimitDisabled();
      }
    })
  }

  private updateActualValue() {
    this.actualValue = !isPropAbsent(this.value) ? this.value : this.label;
  };

  private updateCheckboxSize = () =>
    this.checkboxSize = this.size ||
      this.checkboxGroupContext?.value.size ||
      this.formItemContext?.value.size ||
      this.formContext?.value.size ||
      this.configProviderContext?.value.size ||
      "";

  private updateHasOwnLabel = () => {
    this.hasOwnLabel = this.hasDefaultSlot || !isPropAbsent(this.actualValue);
  };

  private updateIsChecked() {
    const value = this.checkboxGroupContext?.value?.value ?? this.value;
    if (isBoolean(value)) {
      this.isChecked = value;
    } else if (Array.isArray(value)) {
      this.isChecked = value.includes(this.actualValue);
    } else if (value !== null && value !== undefined) {
      this.isChecked = value === this.trueValue || value === this.trueLabel;
    } else {
      this.isChecked = !!value;
    }
  };

  private updateIsLimitDisabled() {
    const max = this.checkboxGroupContext?.value.max;
    const min = this.checkboxGroupContext?.value.min;
    const checked = this.isChecked;
    this.isLimitDisabled = (
      (max !== undefined &&
        this.checkboxGroupContext?.value?.value.length >= max &&
        !checked) ||
      (min !== undefined &&
        this.checkboxGroupContext?.value?.value.length <= min &&
        checked)
    );
  };

  private updateIsDisabled() {
    if (this.disabled !== undefined) {
      this.isDisabled = this.disabled;
    } else {
      const limitDisabled = this.isLimitDisabled;
      if (!this.checkboxGroupContext) {
        this.isDisabled = this.formContext?.value.disabled ?? limitDisabled;
      } else {
        this.isDisabled =
          this.checkboxGroupContext?.value.disabled || limitDisabled;
      }
    }
  };

  private updateIsLabeledByFormItem = () => {
    this.isLabeledByFormItem = !!(
      !(this.label || this.ariaLabel) &&
      this.formItemContext &&
      this.formItemContext.value.inputIds &&
      this.formItemContext.value.inputIds.length <= 1
    );
  };

  private getLabeledValue = (value: string | number | boolean) => {
    return [true, this.trueValue, this.trueLabel].includes(value)
      ? this.trueValue ?? this.trueLabel ?? true
      : this.falseValue ?? this.falseLabel ?? false;
  };

  private getInputBindings = () => {
    if (
      this.trueValue ||
      this.falseValue ||
      this.trueLabel ||
      this.falseLabel
    ) {
      return {
        trueValue: this.trueValue ?? this.trueLabel ?? true,
        falseValue: this.falseValue ?? this.falseLabel ?? false,
      }
    }
    return {
      trueValue: this.actualValue,
    }
  }

  private onClickRoot = async (e: MouseEvent) => {
    if (!this.hasOwnLabel && !this.isDisabled && this.isLabeledByFormItem) {
      const eventTargets: EventTarget[] = e.composedPath();
      const hasLabel = eventTargets.some((item) => {
        return (item as HTMLElement).tagName === 'LABEL';
      });
      if (!hasLabel) {
        this.value = this.getLabeledValue(
          [false, this.falseValue, this.falseLabel].includes(this.value)
        );
        nextFrame(() => {
          this.changeEvent?.emit(this.value);
        })
      }
    }
  };

  private handleChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const v = this.getLabeledValue(target.checked);
    if (this.checkboxGroupContext) {
      const value = [...this.checkboxGroupContext.value.value];
      const aVal = this.actualValue;
      const index = value.indexOf(aVal);
      if (target.checked) {
        if (index === -1) {
          value.push(aVal)
        }
      } else {
        if (index > -1) {
          value.splice(index, 1)
        }
      }
      this.checkboxGroupContext.value.changeEvent(value);
    } else {
      this.value = v;
    }
    this.changeEvent?.emit(v);
  };

  render() {
    const Tag =
      !this.hasOwnLabel && this.isLabeledByFormItem ? "span" : "label";

    const forValue =
      !this.hasOwnLabel && this.isLabeledByFormItem ? null : this.zId;

    const compKls = classNames(
      ns.b(),
      ns.m(this.checkboxSize),
      ns.is('disabled', this.isDisabled),
      ns.is('bordered', this.border),
      ns.is('checked', this.isChecked)
    );

    const spanKls = classNames(
      ns.e('input'),
      ns.is('disabled', this.isDisabled),
      ns.is('checked', this.isChecked),
      ns.is('indeterminate', this.indeterminate),
      ns.is('focus', this.isFocused),
    );
    return (<Host
      class={compKls}
      onClick={this.onClickRoot}
    >
      <Tag
        htmlFor={forValue || undefined}
        ariaControls={this.indeterminate ? (this.ariaControls ?? '') : ''}
        ariaChecked={this.indeterminate ? 'mixed' : undefined}
        ariaLabel={this.ariaLabel}
        class={ns.b()}
      >
        <span class={spanKls}>
          <input
            id={this.zId}
            class={ns.e('original')}
            type="checkbox"
            indeterminate={this.indeterminate}
            name={this.name}
            tabIndex={this.zTabIndex}
            disabled={this.isDisabled}
            onChange={this.handleChange}
            onFocus={() => this.isFocused = true}
            onBlur={() => this.isFocused = false}
            onClick={(e) => e.stopPropagation()}
            {...this.getInputBindings()}
          />
          <span class={ns.e('inner')} />
        </span>
        {
          this.hasOwnLabel && (
            <span class={ns.e('label')}>
              <slot>
                {this.label}
              </slot>
            </span>
          )
        }
      </Tag>
    </Host>);
  }
}
