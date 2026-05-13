import type { ComponentSize } from "../../types";

import {
  Component,
  Element,
  Event,
  EventEmitter,
  Fragment,
  h,
  Host,
  Method,
  Prop,
  State,
  Watch,
} from "@stencil/core";

import { useCursor, useNamespace } from "../../hooks";
import { mutable } from "../../types";
import {
  calcTextareaHeight,
  debugWarn,
  isClient,
  isKorean,
  isObject,
  nextFrame,
  normalizeStyle,
  type ReactiveObject,
} from "../../utils";
import type { FormContext, FormItemContext } from "../form/types";
import { getFormContext, getFormItemContext } from "../form/utils";
import type { ConfigProviderContext } from "../config-provider/types";
import { getConfigProviderContext } from "../config-provider/utils";
import classNames from "classnames";
import type { InputAutoSize, InputMode, InputType } from "./types";

type TargetElement = HTMLInputElement | HTMLTextAreaElement;

const nsInput = useNamespace("input");
const nsTextarea = useNamespace("textarea");

@Component({
  styleUrl: "zane-input.scss",
  tag: "zane-input",
})
export class ZaneInput {
  @Prop() ariaLabel: string = '';

  @Prop() autocomplete: HTMLInputElement['autocomplete'] = "off";

  @Prop() autofocus: boolean = false;

  @Prop() autosize: InputAutoSize = false;

  @Event({ eventName: "zBlur", bubbles: false })
  blurEvent?: EventEmitter<FocusEvent>;

  @Event({ eventName: "zChange", bubbles: false })
  changeEvent?: EventEmitter<number | string>;

  @Prop() clearable: boolean = false;

  @Event({ eventName: "zClear", bubbles: false })
  clearEvent?: EventEmitter<void>;

  @Prop() clearIcon: string = "close-circle-line";

  @Event({ eventName: "zCompositionEnd", bubbles: false })
  compositionendEvent?: EventEmitter<CompositionEvent>;

  @Event({ eventName: "zCompositionStart", bubbles: false })
  compositionstartEvent?: EventEmitter<CompositionEvent>;

  @Event({ eventName: "zCompositionUpdate", bubbles: false })
  compositionupdateEvent?: EventEmitter<CompositionEvent>;

  @Prop() containerRole?: string;

  @Prop() containerStyle?: Record<string, string> | string;

  @State() countStyle: any = {};

  @Prop() disabled?: boolean = undefined;

  @Element() el!: HTMLElement;

  @Event({ eventName: "zFocus", bubbles: false })
  focusEvent?: EventEmitter<FocusEvent>;

  @Prop() form?: string;

  @Prop() formatter?: Function;

  @State() hovering: boolean = false;

  @Event({ eventName: "zInput", bubbles: false })
  inputEvent?: EventEmitter<string>;

  @Prop() inputStyle: Record<string, string> | string = mutable({} as const);

  @Prop({ mutable: true }) isComposing: boolean = false;

  @State() isFocused: boolean = false;

  @Event({ eventName: "zKeyDown", bubbles: false })
  keydownEvent?: EventEmitter<KeyboardEvent>;

  @Prop() max?: number;

  @Prop() maxLength?: number | string;

  @Prop() min?: number;

  @Prop() minLength?: number | string;

  @Event({ eventName: "zMouseEnter", bubbles: false })
  mouseEnterEvent?: EventEmitter<MouseEvent>;

  @Event({ eventName: "zMouseLeave", bubbles: false })
  mouseLeaveEvent?: EventEmitter<MouseEvent>;

  @Prop() name?: string;

  @Prop() parser?: Function;

  @State() passwordVisible: boolean = false;

  @Prop() placeholder?: string;

  @Prop() prefixIcon?: string;

  @Prop() readonly: boolean = false;

  @Prop() resize: "both" | "horizontal" | "none" | "vertical" = "none";

  @Prop() rows: number = 2;

  @Prop() showPassword: boolean = false;

  @Prop() showWordLimit: boolean = false;

  @Prop() size?: ComponentSize;

  @Prop() step: number = 1;

  @Prop() suffixIcon?: string;

  @State() textareaCalcStyle: Record<string, string> = {};

  @Prop() type: InputType = "text";

  @Prop() validateEvent: boolean = true;

  @Prop({ mutable: true }) value: null | number | string | undefined = "";

  @Prop() wordLimitPosition: "inside" | "outside" = "inside";

  @Prop({ attribute: "id" }) zId?: string;

  @Prop({ attribute: "inputmode" }) zInputMode?: InputMode;

  @Prop({ attribute: "tabindex" }) zTabindex: number | string = 0;

  @State() inputSize: ComponentSize = "";

  @State() inputDisabled?: boolean = undefined;

  @State() needStatusIcon: boolean = false;

  @State() validateState: "" | "error" | "validating" | "success" = "";

  @State() validateIcon?: string;

  @State() showClear: boolean = false;

  @State() showPwdVisible: boolean = false;

  @State() isWordLimitVisible: boolean = false;

  @State() textLength: number = 0;

  @State() inputExceed: boolean = false;

  @State() suffixVisible: boolean = false;

  private formContext?: ReactiveObject<FormContext>;

  private formItemContext?: ReactiveObject<FormItemContext>;

  private configProviderContext?: ReactiveObject<ConfigProviderContext>;

  private hasAppend: boolean = false;

  private hasPrefix: boolean = false;

  private hasPrepend: boolean = false;

  private hasSuffix: boolean = false;

  private inputRef?: HTMLInputElement;

  private recordCursor?: () => void;

  private setCursor?: () => void;

  private textareaRef?: HTMLTextAreaElement;

  private wrapperRef?: HTMLDivElement;

  @Method()
  async clear() {
    this.value = "";
    this.setNativeInputValue();
    this.changeEvent?.emit("");
    this.clearEvent?.emit();
    this.inputEvent?.emit("");
  }

  componentDidLoad() {
    const [recordCursor, setCursor] = useCursor(this.inputRef);
    this.recordCursor = recordCursor;
    this.setCursor = setCursor;

    this.setNativeInputValue();
    nextFrame(() => {
      this.resizeTextarea();
    });
  }

  componentWillLoad() {
    this.hasAppend = !!this.el.querySelector('[slot="append"]');
    this.hasPrefix = !!this.el.querySelector('[slot="prefix"]');
    this.hasPrepend = !!this.el.querySelector('[slot="prepend"]');
    this.hasSuffix = !!this.el.querySelector('[slot="suffix"]');

    this.formContext = getFormContext(this.el);
    this.formItemContext = getFormItemContext(this.el);
    this.configProviderContext = getConfigProviderContext(this.el);

    this.needStatusIcon = this.formContext?.value.statusIcon ?? false;
    this.validateState = this.formItemContext?.value.validateState || "";

    this.handleUpdateDisabled();
    this.handleUpdateSize();
    this.handleUpdateShowClear();
    this.handleUpdateShowPwdVisible();
    this.handleUpdateIsWordLimitVisible();
    this.updateTextLength();
    this.updateInputExceed();
    this.updateSuffixVisible();
    this.handleUpdateValidateIcon();

    this.textareaCalcStyle = normalizeStyle(this.inputStyle);

    this.formContext?.change$.subscribe(({ key, value }) => {
      if (key === "size") {
        this.handleUpdateSize();
      }

      if (key === "disabled") {
        this.handleUpdateDisabled();
      }

      if (key === "statusIcon") {
        this.needStatusIcon = value;
      }
    });

    this.formItemContext?.change$.subscribe(({ key }) => {
      if (key === "size") {
        this.handleUpdateSize();
      }
    });

    this.configProviderContext?.change$.subscribe(({ key }) => {
      if (key === "size") {
        this.handleUpdateSize();
      }
    });
  }

  @Method()
  async getInput() {
    return this.inputRef;
  }

  @Method()
  async getTextarea() {
    return this.textareaRef;
  }

  @Watch("clearable")
  @Watch('inputDisabled')
  @Watch('readonly')
  @Watch('value')
  @Watch('isFocused')
  @Watch('hovering')
  handleUpdateShowClear() {
    this.showClear =
      this.clearable &&
      !this.inputDisabled &&
      !this.readonly &&
      !!this.value &&
      (this.isFocused || this.hovering);
  }

  @Watch("showPassword")
  @Watch("inputDisabled")
  @Watch("value")
  handleUpdateShowPwdVisible() {
    this.showPwdVisible = this.showPassword && !this.inputDisabled && !!this.value;
  }

  @Watch('showWordLimit')
  @Watch('maxLength')
  @Watch('type')
  @Watch('inputDisabled')
  @Watch('readonly')
  @Watch('showPassword')
  handleUpdateIsWordLimitVisible() {
    this.isWordLimitVisible = this.showWordLimit &&
      !!this.maxLength &&
      (this.type === "text" || this.type === "textarea") &&
      !this.inputDisabled &&
      !this.readonly &&
      !this.showPassword
  }

  @Watch("disabled")
  handleUpdateDisabled() {
    this.inputDisabled =
      this.disabled ?? this.formContext?.value.disabled ?? false;
  }

  @Watch('validateState')
  handleUpdateValidateIcon() {
    switch(this.validateState) {
      case 'error':
        this.validateIcon = 'close-circle-line';
        break;
      case 'success':
        this.validateIcon = 'checkbox-circle-line';
        break;
      case 'validating':
        this.validateIcon = 'loader-2-line';
        break;
    }
  }

  @Watch('isWordLimitVisible')
  @Watch('textLength')
  @Watch('maxLength')
  updateInputExceed(): void {
    this.inputExceed = (
      !!this.isWordLimitVisible &&
      this.textLength > Number(this.maxLength)
    );
  }

  @Watch("size")
  handleUpdateSize() {
    this.inputSize = (
      this.size ||
      this.formItemContext?.value.size ||
      this.formContext?.value.size ||
      this.configProviderContext?.value.size ||
      ""
    );
  }

  getInputType(): InputType {
    if (this.showPassword) {
      return this.passwordVisible ? "text" : "password";
    }
    return this.type;
  }

  getNativeInput(): HTMLInputElement | HTMLTextAreaElement | undefined {
    return this.inputRef || this.textareaRef;
  }

  getNativeInputValue(): string {
    return this.value === null ? "" : String(this.value);
  }

  @Watch('showClear')
  @Watch('showPassword')
  @Watch('isWordLimitVisible')
  updateSuffixVisible(): void {
    this.suffixVisible = (
      !!this.hasSuffix ||
      !!this.suffixIcon ||
      this.showClear ||
      this.showPassword ||
      this.isWordLimitVisible
    );
  }

  getTextareaStyle() {
    return {
      ...normalizeStyle(this.inputStyle),
      ...this.textareaCalcStyle,
      resize: this.resize,
    };
  }

  @Watch('value')
  updateTextLength() {
    this.textLength = this.getNativeInputValue().length;
  }

  @Watch("type")
  onTypeChange() {
    setTimeout(() => {
      this.setNativeInputValue();
      this.resizeTextarea();
    });
  }

  @Watch("value")
  onValueChange() {
    this.inputRef!.value = this.value as string;
    this.resizeTextarea();
    if (this.validateEvent) {
      this.formItemContext?.value.validate?.('change').catch((err) => debugWarn(err))
    }
  }

  render() {
    const isTextarea = this.type === "textarea";

    const containerClasses = {
      [nsInput.b("group")]: this.hasPrepend || this.hasAppend,
      [nsInput.b("hidden")]: this.type === "hidden",
      [nsInput.b()]: !isTextarea,
      [nsInput.bm("group", "append")]: this.hasAppend,
      [nsInput.bm("group", "prepend")]: this.hasPrepend,
      [nsInput.bm("suffix", "password-clear")]:
        this.showClear && this.showPwdVisible,
      [nsInput.is("disabled", this.inputDisabled)]: true,
      [nsInput.is("exceed", this.inputExceed)]: true,
      [nsInput.m("prefix")]: this.hasPrefix || !!this.prefixIcon,
      [nsInput.m("suffix")]:
        this.hasSuffix ||
        !!this.suffixIcon ||
        this.clearable ||
        this.showPassword,
      [nsInput.m(this.inputSize)]: true,
      [nsTextarea.b()]: isTextarea,
    };

    return (
      <Host
        class={containerClasses}
        onMouseEnter={this.handleMouseEnter}
        onMouseLeave={this.handleMouseLeave}
      >
        {this.type === "textarea" ? this.renderTextarea() : this.renderInput()}
      </Host>
    );
  }

  resizeTextarea = () => {
    if (!isClient || this.type !== "textarea" || !this.textareaRef) return;

    if (this.autosize) {
      const minRows = isObject(this.autosize)
        ? this.autosize.minRows
        : undefined;
      const maxRows = isObject(this.autosize)
        ? this.autosize.maxRows
        : undefined;
      const textareaStyle = calcTextareaHeight(
        this.textareaRef,
        minRows,
        maxRows,
      );

      // If the scrollbar is displayed, the height of the textarea needs more space than the calculated height.
      // If set textarea height in this case, the scrollbar will not hide.
      // So we need to hide scrollbar first, and reset it in next tick.
      // see https://github.com/element-plus/element-plus/issues/8825
      this.textareaCalcStyle = {
        overflowY: "hidden",
        ...textareaStyle,
      };

      nextFrame(() => {
        // NOTE: Force repaint to make sure the style set above is applied.
        this.textareaRef!.offsetHeight;
        this.textareaCalcStyle = textareaStyle;
      });
    } else {
      this.textareaCalcStyle = {
        minHeight: calcTextareaHeight(this.textareaRef!).minHeight ?? '',
      };
    }
  };

  @Method()
  async select() {
    this.getNativeInput()?.select();
  }

  setNativeInputValue = () => {
    const input = this.inputRef || this.textareaRef;
    const formatterValue = this.formatter
      ? this.formatter(this.getNativeInputValue())
      : this.getNativeInputValue();
    if (!input || input.value === formatterValue) return;
    input.value = formatterValue;
  };

  @Method()
  async zBlur() {
    this.getNativeInput()?.blur();
  }

  @Method()
  async zFocus() {
    this.getNativeInput()?.focus();
  }

  private handleAfterBlur = () => {
    if (this.validateEvent) {
      this.formItemContext?.value.validate?.('blur').catch((error) => debugWarn(error));
    }
  };

  private handleBlur = (event: FocusEvent) => {
    if (
      this.inputDisabled ||
      (event.relatedTarget &&
        this.wrapperRef?.contains(event.relatedTarget as Node))
    ) {
      return;
    }
    this.isFocused = false;
    this.blurEvent?.emit(event);
    this.handleAfterBlur();
  };

  private handleChange = (event: Event) => {
    let { value } = event.target as TargetElement;

    if (this.formatter && this.parser) {
      value = this.parser(value);
    }

    this.changeEvent?.emit(value);
  };

  private handleClear = () => {
    this.clear();
  };

  private handleCompositionEnd = (event: CompositionEvent) => {
    this.compositionendEvent?.emit(event);
    if (this.isComposing) {
      this.isComposing = false;
      nextFrame(() => {
        this.handleInput(event);
      });
    }
  };

  private handleCompositionStart = (event: CompositionEvent) => {
    this.compositionstartEvent?.emit(event);
    this.isComposing = true;
  };

  private handleCompositionUpdate = (event: CompositionEvent) => {
    this.compositionupdateEvent?.emit(event);
    const text = (event.target as HTMLInputElement)?.value;
    const lastCharacter = text[text.length - 1] || "";
    this.isComposing = !isKorean(lastCharacter);
  };

  private handleFocus = (event: FocusEvent) => {
    if (this.inputDisabled || this.isFocused) return;

    this.isFocused = true;
    this.focusEvent?.emit(event);
  };

  private handleInput = async (event: Event) => {
    this.recordCursor?.();

    let { value } = event.target as TargetElement;

    if (this.formatter && this.parser) {
      value = this.parser(value);
    }

    // should not emit input during composition
    // see: https://github.com/ElemeFE/element/issues/10516
    if (this.isComposing) return;

    // hack for https://github.com/ElemeFE/element/issues/8548
    // should remove the following line when we don't support IE
    if (value === this.getNativeInputValue()) {
      this.setNativeInputValue();
      return;
    }

    this.value = value;
    this.inputEvent?.emit(value);

    nextFrame(() => {
      this.setNativeInputValue();
      this.setCursor?.();
    });
  };

  private handleKeydown = (evt: KeyboardEvent) => {
    this.keydownEvent?.emit(evt);
  };

  private handleMouseEnter = (evt: MouseEvent) => {
    this.hovering = true;
    this.mouseEnterEvent?.emit(evt);
  };

  private handleMouseLeave = (evt: MouseEvent) => {
    this.hovering = false;
    this.mouseLeaveEvent?.emit(evt);
  };

  private handlePasswordVisible = () => {
    this.recordCursor?.();
    this.passwordVisible = !this.passwordVisible;
    // The native input needs a little time to regain focus
    setTimeout(() => {
      this.setCursor?.();
    });
  };

  private renderInput = () => {
    const wrapperClasses = {
      [nsInput.e("wrapper")]: true,
      [nsInput.is("focus", this.isFocused)]: true,
    };

    return (
      <Fragment>
        {this.hasPrepend && (
          <div class={nsInput.be("group", "prepend")}>
            <slot name="prepend" />
          </div>
        )}

        <div class={wrapperClasses} ref={(el) => (this.wrapperRef = el!)}>
          {(this.hasPrefix || this.prefixIcon) && (
            <span class={nsInput.e("prefix")}>
              <span class={nsInput.e("prefix-inner")}>
                <slot name="prefix"></slot>
                {this.prefixIcon && (
                  <zane-icon
                    class={nsInput.e("icon")}
                    name={this.prefixIcon}
                  ></zane-icon>
                )}
              </span>
            </span>
          )}

          <input
            aria-label={this.ariaLabel}
            autocomplete={this.autocomplete}
            autofocus={this.autofocus}
            class={nsInput.e("inner")}
            disabled={this.inputDisabled}
            form={this.form}
            inputmode={this.zInputMode as any}
            max={this.max}
            maxlength={this.maxLength}
            min={this.min}
            minlength={this.minLength}
            name={this.name}
            onBlur={this.handleBlur}
            onChange={this.handleChange}
            onCompositionend={this.handleCompositionEnd}
            onCompositionstart={this.handleCompositionStart}
            onCompositionupdate={this.handleCompositionUpdate}
            onFocus={this.handleFocus}
            onInput={this.handleInput}
            onKeyDown={this.handleKeydown}
            placeholder={this.placeholder}
            readonly={this.readonly}
            ref={(el) => (this.inputRef = el!)}
            step={this.step}
            tabindex={this.zTabindex}
            type={this.getInputType() as string}
          />

          {this.suffixVisible && (
            <span class={nsInput.e("suffix")}>
              <span class={nsInput.e("suffix-inner")}>
                {(!this.showClear ||
                  !this.showPwdVisible ||
                  !this.isWordLimitVisible) && (
                  <Fragment>
                    <slot name="suffix"></slot>
                    {this.suffixIcon && (
                      <zane-icon
                        class={nsInput.e("icon")}
                        name={this.suffixIcon}
                      ></zane-icon>
                    )}
                  </Fragment>
                )}
                {this.showClear && (
                  <zane-icon
                    class={{
                      [nsInput.e("clear")]: true,
                      [nsInput.e("icon")]: true,
                    }}
                    name={this.clearIcon}
                    onClick={this.handleClear}
                  ></zane-icon>
                )}
                {this.showPwdVisible && (
                  <zane-icon
                    class={{
                      [nsInput.e("icon")]: true,
                      [nsInput.e("password")]: true,
                    }}
                    name={this.passwordVisible ? 'eye-line' : 'eye-off-line'}
                    onClick={this.handlePasswordVisible}
                  ></zane-icon>
                )}
                {this.isWordLimitVisible && (
                  <span
                    class={{
                      [nsInput.e("count")]: true,
                      [nsInput.is(
                        "outside",
                        this.wordLimitPosition === "outside",
                      )]: true,
                    }}
                  >
                    <span class={nsInput.e("count-inner")}>
                      {this.textLength} / {this.maxLength}
                    </span>
                  </span>
                )}
                {
                  (this.validateState && this.validateIcon && this.needStatusIcon) && (
                    <zane-icon
                      class={classNames(
                        nsInput.e('icon'),
                        nsInput.e('validateIcon'),
                        nsInput.is('loading', this.validateState === 'validating')
                      )}
                      name={this.validateIcon}
                    ></zane-icon>
                  )
                }
              </span>
            </span>
          )}
        </div>

        {this.hasAppend && (
          <div class={nsInput.be("group", "append")}>
            <slot name="append" />
          </div>
        )}
      </Fragment>
    );
  };

  private renderTextarea = () => {
    return (
      <Fragment>
        <textarea
          aria-label={this.ariaLabel}
          autocomplete={this.autocomplete}
          autofocus={this.autofocus}
          class={{
            [nsInput.is("focus", this.isFocused)]: true,
            [nsTextarea.e("inner")]: true,
          }}
          disabled={this.inputDisabled}
          form={this.form}
          maxlength={this.maxLength}
          minlength={this.minLength}
          name={this.name}
          onBlur={this.handleBlur}
          onChange={this.handleChange}
          onCompositionend={this.handleCompositionEnd}
          onCompositionstart={this.handleCompositionStart}
          onCompositionupdate={this.handleCompositionUpdate}
          onFocus={this.handleFocus}
          onInput={this.handleInput}
          onKeyDown={this.handleKeydown}
          placeholder={this.placeholder}
          readonly={this.readonly}
          ref={(el) => (this.textareaRef = el!)}
          rows={this.rows}
          style={this.getTextareaStyle()}
          tabindex={this.zTabindex}
        />
        {this.isWordLimitVisible && (
          <span
            class={{
              [nsInput.e("count")]: true,
              [nsInput.is("outside", this.wordLimitPosition === "outside")]:
                true,
            }}
            style={this.countStyle}
          >
            {this.textLength} / {this.maxLength}
          </span>
        )}
      </Fragment>
    );
  };
}
