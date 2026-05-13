import { Component, h, Element, Prop, State, Watch } from "@stencil/core";
import type { CascaderNode } from "./node";
import { useNamespace } from "../../hooks";
import type { ReactiveObject } from "../../utils";
import type { CascaderPanelContext } from "./types";
import { getCascaderPanelContext } from "./utils";
import state from "../../global/store";
import classNames from "classnames";

const ns = useNamespace("cascader-menu");

@Component({
  tag: "zane-cascader-menu",
})
export class ZaneCascaderMenu {
  @Element() el: HTMLElement | undefined;

  @Prop() nodes: CascaderNode[] = [];

  @Prop() index: number | undefined;

  @State() isEmpty: boolean = false;

  @State() isLoading: boolean = false;

  @State() menuId: string | undefined;

  private cascaderPanelContext: ReactiveObject<CascaderPanelContext> | undefined;

  private hoverZone: SVGElement | undefined;

  private activeNode: HTMLElement | undefined;

  private hoverTimer: number | undefined;

  private id: string | undefined;

  @Watch("index")
  onIndexChange() {
    this.menuId = `${this.id}-${this.index}`;
  }

  componentWillLoad() {
    this.id = `${ns.namespace}-id-${state.idInjection.prefix}-${state
      .idInjection.current++}`;
    this.menuId = `${this.id}-${this.index}`;
    this.cascaderPanelContext = getCascaderPanelContext(this.el!);
  }

  private handleExpand = (e: CustomEvent) => {
    this.activeNode = e.target as HTMLElement;
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (
      !this.cascaderPanelContext?.value.isHoverMenu ||
      !this.activeNode ||
      !this.hoverZone
    )
      return;

    if (this.activeNode.contains(e.target as HTMLElement)) {
      this.clearHoverTimer();

      const { left } = this.el!.getBoundingClientRect();
      const { offsetWidth = 0, offsetHeight = 0 } = this.el || {};
      const startX = e.clientX - left;
      const top = this.activeNode.offsetTop;
      const bottom = top + this.activeNode.offsetHeight;
      const scrollTop =
        this.el?.querySelector(`.${ns.e("wrap")}`)?.scrollTop || 0;

      this.hoverZone.innerHTML = `
            <path style="pointer-events: auto;" fill="transparent" d="M${startX} ${top} L${offsetWidth} ${scrollTop} V${top} Z" />
            <path style="pointer-events: auto;" fill="transparent" d="M${startX} ${bottom} L${offsetWidth} ${
        offsetHeight + scrollTop
      } V${bottom} Z" />
          `;
    } else if (!this.hoverTimer) {
      this.hoverTimer = window.setTimeout(
        this.clearHoverZone,
        this.cascaderPanelContext?.value.config.hoverThreshold
      );
    }
  };

  private clearHoverTimer = () => {
    if (!this.hoverTimer) return;
    clearTimeout(this.hoverTimer);
    this.hoverTimer = undefined;
  };

  private clearHoverZone = () => {
    if (!this.hoverZone) return;
    this.hoverZone.innerHTML = "";
    this.clearHoverTimer();
  };

  render() {
    const { t } = state.i18n;
    return (
      <zane-scrollbar
        key={this.menuId}
        role="menu"
        class={ns.b()}
        wrapClass={ns.e("wrap")}
        viewClass={classNames(ns.e("list"), ns.is("empty", !this.nodes.length))}
        onMouseMove={this.handleMouseMove}
        onMouseLeave={this.clearHoverZone}
      >
        {this.nodes.map((node) => (
          <zane-cascader-node
            key={node.uid}
            node={node}
            menuId={this.menuId}
            onZExpand={this.handleExpand}
          ></zane-cascader-node>
        ))}
        {this.isLoading ? (
          <div class={ns.e("empty-text")}>
            <zane-icon
              class={ns.is("loading")}
              name="loader-2-line"
              size="14"
            ></zane-icon>
            {t("cascader.loading")}
          </div>
        ) : !this.nodes.length ? (
          <div class={ns.e("empty-text")}>
            <slot name="empty">{t("cascader.noData")}</slot>
          </div>
        ) : this.cascaderPanelContext?.value.isHoverMenu ? (
          <svg
            ref={(el) => (this.hoverZone = el)}
            class={ns.e("hover-zone")}
          ></svg>
        ) : null}
      </zane-scrollbar>
    );
  }
}
