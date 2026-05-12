import { useNamespace } from "../../hooks";
import type { CheckboxValueType } from "../checkbox/types";
import type { CascaderNode } from "./node";

import {
  Component,
  Event,
  h,
  Host,
  Prop,
  Element,
  type EventEmitter,
  State,
  Watch,
} from "@stencil/core";
import type { CascaderPanelContext, ExpandTrigger } from "./types";
import { getCascaderPanelContext } from "./utils";
import type { ReactiveObject } from "../../utils/reactive/ReactiveObject";
import classNames from "classnames";

const ns = useNamespace("cascader-node");

@Component({
  tag: "zane-cascader-node",
})
export class ZaneCascaderNode {
  @Element() el!: HTMLElement;

  @Prop() node?: CascaderNode;

  @Prop() menuId?: string;

  @Event({ eventName: "zExpand", bubbles: false })
  expandEvent?: EventEmitter<Event>;

  @State() multiple?: boolean = undefined;

  @State() isHoverMenu?: boolean = undefined;

  @State() checkStrictly?: boolean = undefined;

  @State() showPrefix?: boolean = undefined;

  @State() checkOnClickNode?: boolean = undefined;

  @State() checkOnClickLeaf?: boolean = undefined;

  @State() expandTrigger?: ExpandTrigger = undefined;

  @State() checkedNodes?: CascaderNode[] = undefined;

  @State() expandingNode?: CascaderNode = undefined;

  @State() checkedNodeId?: number = undefined;

  @State() expandable?: boolean = undefined;

  @State() inExpandingPath?: boolean = undefined;

  @State() inCheckedPath?: boolean = undefined;

  private cascaderPanelContext?: ReactiveObject<CascaderPanelContext>;

  @Watch("checkStrictly")
  @Watch("node")
  updateExpandable() {
    this.expandable =
      (this.checkStrictly && !this.node?.isLeaf) || !this.node?.isDisabled;
  }

  @Watch("expandingNode")
  handleWatchExpandingNode() {
    this.inExpandingPath = this.isInPath(this.expandingNode!);
  }

  @Watch("checkedNodes")
  @Watch("checkStrictly")
  handleUpdateInCheckedPath() {
    this.inCheckedPath =
      this.checkStrictly && this.checkedNodes?.some(this.isInPath);
  }

  componentWillLoad() {
    this.cascaderPanelContext = getCascaderPanelContext(this.el);

    this.multiple =
      this.multiple ?? this.cascaderPanelContext?.value.config.multiple;
    this.checkStrictly =
      this.checkStrictly ??
      this.cascaderPanelContext?.value.config.checkStrictly;
    this.showPrefix =
      this.showPrefix ?? this.cascaderPanelContext?.value.config.showPrefix;
    this.checkOnClickNode =
      this.checkOnClickNode ??
      this.cascaderPanelContext?.value.config.checkOnClickNode;
    this.checkOnClickLeaf =
      this.checkOnClickLeaf ??
      this.cascaderPanelContext?.value.config.checkOnClickLeaf;
    this.expandTrigger =
      this.expandTrigger ??
      this.cascaderPanelContext?.value.config.expandTrigger;

    this.isHoverMenu =
      this.isHoverMenu ?? this.cascaderPanelContext?.value.isHoverMenu;
    this.checkedNodes =
      this.checkedNodes ?? this.cascaderPanelContext?.value.checkedNodes;
    this.expandingNode =
      this.expandingNode ?? this.cascaderPanelContext?.value.expandingNode;
    this.checkedNodeId = this.checkedNodeId ?? this.checkedNodes?.[0]?.uid;
    this.expandable =
      this.expandable ??
      ((this.checkStrictly && !this.node?.isLeaf) || !this.node?.isDisabled);

    this.inExpandingPath =
      this.inExpandingPath ?? this.isInPath(this.expandingNode!);
    this.inCheckedPath =
      this.inCheckedPath ??
      (this.checkStrictly && this.checkedNodes?.some(this.isInPath));

    this.cascaderPanelContext?.change$.subscribe(({ key, value }) => {
      if (key === "config") {
        this.multiple = value.multiple;
        this.checkStrictly = value.checkStrictly;
        this.showPrefix = value.showPrefix;
        this.checkOnClickNode = value.checkOnClickNode;
        this.checkOnClickLeaf = value.checkOnClickLeaf;
        this.expandTrigger = value.expandTrigger;
      }
      if (key === "isHoverMenu") {
        this.isHoverMenu = value;
      }
      if (key === "checkedNodes") {
        this.checkedNodes = value;
        this.checkedNodeId = this.checkedNodes?.[0]?.uid;
      }
      if (key === "expandingNode") {
        this.expandingNode = value;
      }
    });
  }

  render() {
    return (
      <Host
        id={`${this.menuId}-${this.node?.uid ?? ""}`}
        role="menuitem"
        ariaHaspopup={!this.node?.isLeaf}
        ariaOwns={this.node?.isLeaf ? undefined : this.menuId}
        ariaExpanded={this.inExpandingPath}
        tabIndex={this.expandable ? -1 : undefined}
        class={classNames(
          ns.b(),
          ns.is("selectable", this.checkStrictly),
          ns.is("active", this.node?.checked),
          ns.is("disabled", !this.expandable),
          this.inExpandingPath && "in-active-path",
          this.inCheckedPath && "in-checked-path"
        )}
        onMouseEnter={this.handleHoverExpand}
        onFocus={this.handleHoverExpand}
        onClick={this.handleClick}
      >
        {this.multiple && this.showPrefix ? (
          <zane-checkbox
            value={this.node?.checked}
            indeterminate={this.node?.indeterminate}
            disabled={this.node?.isDisabled}
            onClick={(e) => e.stopPropagation()}
            onZChange={(e) => this.handleSelectCheck(e.detail)}
          ></zane-checkbox>
        ) : this.checkStrictly && this.showPrefix ? (
          <zane-radio
            value={this.checkedNodeId}
            label={this.node?.uid}
            disabled={this.node?.isDisabled}
            onClick={(e) => e.stopPropagation()}
            onZChange={(e) => this.handleSelectCheck(e.detail)}
          >
            <span></span>
          </zane-radio>
        ) : (
          this.node?.isLeaf &&
          this.node?.checked && (
            <zane-icon name="check-line" class={ns.e("prefix")}></zane-icon>
          )
        )}

        <zane-cascader-node-content
          node={this.node}
        ></zane-cascader-node-content>

        {!this.node?.isLeaf &&
          (this.node?.loading ? (
            <zane-icon
              class={classNames(ns.is("loading"), ns.e("postfix"))}
              name="loader-2-line"
            ></zane-icon>
          ) : (
            <zane-icon
              class={classNames("arrow-right", ns.e("postfix"))}
              name="arrow-right-s-line"
            ></zane-icon>
          ))}
      </Host>
    );
  }

  private isInPath = (node: CascaderNode) => {
    const { level, uid } = this.node!;
    return node?.pathNodes[level - 1]?.uid === uid;
  };

  private doExpand = () => {
    if (this.inExpandingPath) {
      return;
    }
    this.cascaderPanelContext?.value.expandNode?.(this.node!);
  };

  private doCheck = (checked: boolean) => {
    if (checked === this.node?.checked) {
      return;
    }
    this.cascaderPanelContext?.value.handleCheckChange(this.node!, checked);
  };

  private doLoad = () => {
    this.cascaderPanelContext?.value.lazyLoad?.(this.node!, () => {
      if (!this.node?.isLeaf) {
        this.doExpand();
      }
    });
  };

  private handleHoverExpand = (e: Event) => {
    if (this.expandTrigger !== "hover") {
      return;
    }
    this.handleExpand();
    !this.node?.isLeaf && this.expandEvent?.emit(e);
  };

  private handleExpand = () => {
    if (!this.expandable || this.node?.loading) {
      return;
    }
    this.node?.loaded ? this.doExpand() : this.doLoad();
  };

  private handleClick = () => {
    const { isLeaf, isDisabled, checked } = this.node!;
    if (isLeaf && !isDisabled && !this.checkStrictly && !this.multiple) {
      this.handleCheck(true);
    } else if (
      ((this.checkOnClickNode && (this.multiple || this.checkStrictly)) ||
        (isLeaf && this.checkOnClickLeaf)) &&
      !isDisabled
    ) {
      this.handleSelectCheck(!checked);
    } else {
      this.handleExpand();
    }
  };

  private handleSelectCheck = (checked: CheckboxValueType | undefined) => {
    if (this.checkStrictly) {
      this.doCheck(checked as boolean);
      if (this.node?.loaded) {
        this.doExpand();
      }
    } else {
      this.handleCheck(checked as boolean);
    }
  };

  private handleCheck = (checked: boolean) => {
    if (!this.node?.loaded) {
      this.doLoad();
    } else {
      this.doCheck(checked);
      !this.checkStrictly && this.doExpand();
    }
  };
}
