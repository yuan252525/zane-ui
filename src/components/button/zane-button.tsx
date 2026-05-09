import type { ComponentSize } from "../../types";

import { TinyColor } from "@ctrl/tinycolor";
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
} from "@stencil/core";

import { useNamespace } from "../../hooks";
import { darken, findAllLegitChildren, type ReactiveObject } from "../../utils";
import type { ButtonGroupContext, ButtonNativeType, ButtonType } from "./types";
import type { ConfigProviderContext } from "../config-provider/types";
import { getConfigProviderContext } from "../config-provider/utils";
import { getButtonGroupContext } from "./utils";
import classNames from "classnames";

const ns = useNamespace("button");

@Component({
  styleUrl: "zane-button.scss",
  tag: "zane-button",
})
export class ZaneButton {
  @Prop() autofocus: boolean = false;

  @Prop() autoInsertSpace: boolean | undefined = undefined;

  @Prop() bg: boolean = false;

  @State() buttonStyle: Record<string, string> = {};

  @Prop() circle: boolean = false;

  @Event({ eventName: "zClick", bubbles: false })
  clickEvent: EventEmitter<MouseEvent> | undefined;

  @Prop() color: string | undefined;

  @Prop() dark: boolean = false;

  @Prop() disabled: boolean | undefined = undefined;

  @Element() el: HTMLElement | undefined;

  @Prop() icon: string | undefined;

  @Prop({ reflect: true }) link: boolean = false;

  @Prop() loading: boolean = false;

  @Prop() nativeType: ButtonNativeType = "button";

  @Prop() plain: boolean | undefined = undefined;

  @Prop() round: boolean | undefined = undefined;

  @State() shouldAddSpace: boolean = false;

  @Prop() size: ComponentSize | undefined;

  @Prop() text: boolean | undefined = undefined;

  @Prop() type: ButtonType = "";

  @State() actualDisabled: boolean = false;

  @State() actualPlain: boolean = false;

  @State() actualRound: boolean = false;

  @State() actualSize: string = "";

  @State() actualText: boolean = false;

  @State() actualType: string = "";

  @State() actualAutoInsertSpace: boolean = false;

  private buttonGroupContext: ReactiveObject<ButtonGroupContext> | undefined;

  private configProviderContext: ReactiveObject<ConfigProviderContext> | undefined;

  componentWillLoad() {
    this.buttonGroupContext = getButtonGroupContext(this.el!);
    this.configProviderContext = getConfigProviderContext(this.el!);

    this.updateCustomStyle();

    this.buttonGroupContext?.change$.subscribe((change) => {
      if (change.key === "disabled") {
        this.onDisabledChange();
      }
      if (change.key === "type") {
        this.onTypeChange();
      }
      if (change.key === "size") {
        this.onSizeChange();
      }
    });
  }

  @Watch("disabled", { immediate: true })
  onDisabledChange() {
    this.actualDisabled =
      this.disabled ?? this.buttonGroupContext?.value.disabled ?? false;
  }

  @Watch("plain", { immediate: true })
  onPlainChange() {
    this.actualPlain =
      this.plain ?? this.configProviderContext?.value.button?.plain ?? false;
  }

  @Watch("round", { immediate: true })
  onRoundChange() {
    this.actualRound =
      this.round ?? this.configProviderContext?.value.button?.plain ?? false;
  }

  @Watch("text", { immediate: true })
  onTextChange() {
    this.actualText =
      this.text ?? this.configProviderContext?.value.button?.text ?? false;
  }

  @Watch("type", { immediate: true })
  onTypeChange() {
    this.actualType =
      this.type ||
      this.buttonGroupContext?.value.type ||
      this.configProviderContext?.value.button?.type ||
      "";
  }

  @Watch("size", { immediate: true })
  onSizeChange() {
    this.actualSize =
      this.size ||
      this.buttonGroupContext?.value.size ||
      this.configProviderContext?.value.size ||
      "";
  }

  @Watch("autoInsertSpace", { immediate: true })
  onAutoInsertSpaceChange() {
    this.actualAutoInsertSpace =
      this.autoInsertSpace ??
      this.configProviderContext?.value.button?.autoInsertSpace ??
      false;

    if (this.actualAutoInsertSpace) {
      const slot = this.el?.querySelector("span");
      if (slot) {
        const text = slot.textContent;
        this.shouldAddSpace = /^\p{Unified_Ideograph}{2}$/u.test(text);
      }
    } else this.shouldAddSpace = false;
  }

  @Watch("color")
  @Watch("dark")
  @Watch("actualPlain")
  @Watch("actualPlain")
  @Watch("actualDisabled")
  updateCustomStyle() {
    let styles: Record<string, string> = {};

    let buttonColor = this.color;

    if (buttonColor) {
      const match = (buttonColor as string).match(/var\((.*?)\)/);
      if (match) {
        buttonColor = window
          .getComputedStyle(window.document.documentElement)
          .getPropertyValue(match[1]);
      }
      const color = new TinyColor(buttonColor);
      const activeBgColor = this.dark
        ? color.tint(20).toString()
        : darken(color, 20);

      if (this.actualPlain) {
        styles = ns.cssVarBlock({
          "active-bg-color": activeBgColor,
          "active-border-color": activeBgColor,
          "active-text-color": `var(${ns.cssVarName("color-white")})`,
          "bg-color": this.dark ? darken(color, 90) : color.tint(90).toString(),
          "border-color": this.dark
            ? darken(color, 50)
            : color.tint(50).toString(),
          "hover-bg-color": buttonColor,
          "hover-border-color": buttonColor,
          "hover-text-color": `var(${ns.cssVarName("color-white")})`,
          "text-color": buttonColor,
        });

        if (this.disabled) {
          styles[ns.cssVarBlockName("disabled-bg-color")] = this.dark
            ? darken(color, 90)
            : color.tint(90).toString();
          styles[ns.cssVarBlockName("disabled-text-color")] = this.dark
            ? darken(color, 50)
            : color.tint(50).toString();
          styles[ns.cssVarBlockName("disabled-border-color")] = this.dark
            ? darken(color, 80)
            : color.tint(80).toString();
        }
      } else {
        const hoverBgColor = this.dark
          ? darken(color, 30)
          : color.tint(30).toString();
        const textColor = color.isDark()
          ? `var(${ns.cssVarName("color-white")})`
          : `var(${ns.cssVarName("color-black")})`;
        styles = ns.cssVarBlock({
          "active-bg-color": activeBgColor,
          "active-border-color": activeBgColor,
          "bg-color": buttonColor,
          "border-color": buttonColor,
          "hover-bg-color": hoverBgColor,
          "hover-border-color": hoverBgColor,
          "hover-text-color": textColor,
          "text-color": textColor,
        });

        if (this.disabled) {
          const disabledButtonColor = this.dark
            ? darken(color, 50)
            : color.tint(50).toString();
          styles[ns.cssVarBlockName("disabled-bg-color")] = disabledButtonColor;
          styles[ns.cssVarBlockName("disabled-text-color")] = this.dark
            ? "rgba(255, 255, 255, 0.5)"
            : `var(${ns.cssVarName("color-white")})`;
          styles[ns.cssVarBlockName("disabled-border-color")] =
            disabledButtonColor;
        }
      }
    }

    this.buttonStyle = {
      ...styles,
      ...this.el?.style,
    } as any;
  }

  handleClick = (evt: MouseEvent) => {
    if (this.loading || this.actualDisabled) return;
    this.clickEvent?.emit(evt);
  };

  render() {
    const hasContent = findAllLegitChildren(this.el!).length > 0;

    const buttonKls = classNames(
      ns.b(),
      ns.m(this.actualType),
      ns.m(this.actualSize),
      this.el?.className,
      ns.is("disabled", this.actualDisabled),
      ns.is("loading", this.loading),
      ns.is("plain", this.actualPlain),
      ns.is("round", this.actualRound),
      ns.is("circle", this.circle),
      ns.is("text", this.actualText),
      ns.is("link", this.link),
      ns.is("has-bg", this.bg)
    );
    return (
      <Host>
        <button
          autofocus={this.autofocus}
          class={buttonKls}
          disabled={this.actualDisabled}
          onClick={this.handleClick}
          style={this.buttonStyle}
          type={this.nativeType}
        >
          {this.renderIcon()}

          {hasContent && (
            <span class={{ [ns.em("text", "expand")]: this.shouldAddSpace }}>
              <slot />
            </span>
          )}
        </button>
      </Host>
    );
  }

  renderIcon() {
    const hasIcon = this.icon || this.el?.querySelector('[slot="icon"]');

    if (this.loading) {
      return (
        <slot name="loading">
          <svg
            class="mr-2"
            height="1em"
            viewBox="0 0 24 24"
            width="1em"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z"
              fill="currentColor"
              opacity=".25"
            />
            <path
              d="M10.14,1.16a11,11,0,0,0-9,8.92A1.59,1.59,0,0,0,2.46,12,1.52,1.52,0,0,0,4.11,10.7a8,8,0,0,1,6.66-6.61A1.42,1.42,0,0,0,12,2.69h0A1.57,1.57,0,0,0,10.14,1.16Z"
              fill="currentColor"
            >
              <animateTransform
                attributeName="transform"
                dur="0.75s"
                repeatCount="indefinite"
                type="rotate"
                values="0 12 12;360 12 12"
              />
            </path>
          </svg>
        </slot>
      );
    } else if (hasIcon) {
      return this.icon ? (
        <zane-icon name={this.icon}></zane-icon>
      ) : (
        <slot name="icon" />
      );
    }
    return null;
  }


}
