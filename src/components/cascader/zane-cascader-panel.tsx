import { useNamespace } from "../../hooks";
import { cascaderPanelContexts, defaultProps } from "./constants";
import { CascaderNode } from "./node";

import {
  Component,
  h,
  Method,
  Prop,
  Element,
  Event,
  type EventEmitter,
  State,
  Watch,
  Host,
} from "@stencil/core";
import type {
  CascaderConfig,
  CascaderNodePathValue,
  CascaderNodeValue,
  CascaderOption,
  CascaderPanelContext,
  CascaderProps,
  CascaderValue,
  RenderLabel,
} from "./types";
import { ReactiveObject } from "../../utils/reactive/ReactiveObject";
import classNames from "classnames";
import Store from "./store";
import { focusNode, getEventCode, getSibling, hasRawParent, isClient, isEmpty, nextFrame, scrollIntoView } from "../../utils";
import { isEqual, uniq, flattenDeep, castArray, cloneDeep } from "lodash-es";
import { checkNode, getMenuIndex, sortByOriginalOrder } from "./utils";
import { EVENT_CODE } from "../../constants";

const ns = useNamespace("cascader");

@Component({
  styleUrl: 'zane-cascader-panel.scss',
  tag: "zane-cascader-panel",
})
export class ZaneCascaderPanel {
  @Element() el!: HTMLElement;

  @Prop({ mutable: true }) value?: CascaderValue;

  @Prop() options: CascaderOption[] = [];

  @Prop() props: CascaderProps = {};

  @Prop() border: boolean = true;

  @Prop() renderLabel?: RenderLabel;

  @Prop({ mutable: true }) checkedNodes: CascaderNode[] = [];

  @Event({ eventName: "zChange", bubbles: false })
  changeEvent?: EventEmitter<
    CascaderValue | undefined | null
  >;

  @Event({ eventName: "zClose", bubbles: false })
  closeEvent?: EventEmitter<void>;

  @Event({ eventName: "zExpandChange", bubbles: false })
  expandChangeEvent?: EventEmitter<CascaderNodePathValue>;

  @Method()
  async clearCheckedNodes() {
    this.checkedNodes.forEach((node) => node.doCheck(false));
    await this.calculateCheckedValue();
    this.menus = this.menus.slice(0, 1);
    this.expandingNode = undefined;
    this.expandChangeEvent?.emit([]);
  }

  @State() config?: CascaderConfig;

  @State() expandingNode?: CascaderNode;

  @State() isHoverMenu: boolean = false;

  @State() initialLoaded: boolean = true;

  @State() initialLoadedOnce: boolean = false;

  @State() checkedValue: CascaderValue | undefined;

  @State() menus: CascaderNode[][] = [];

  @State() menuList: HTMLZaneCascaderMenuElement[] = [];

  private store?: Store;

  private manualChecked = false;

  private lazyLoad = (
    node?: CascaderNode,
    cb?: (dataList: CascaderOption[]) => void
  ) => {
    const cfg: CascaderConfig = this.config!;
    node! = node || new CascaderNode({}, cfg, undefined, true)
    node.loading = true

    const resolve = (dataList?: CascaderOption[]) => {
      const _node = node as CascaderNode
      const parent = _node.root ? null : _node
      _node.loading = false
      _node.loaded = true
      _node.childrenData = _node.childrenData || []
      dataList && this.store?.appendNodes(dataList, parent as CascaderNode)
      dataList && cb?.(dataList)
      if (node.level === 0) {
        this.initialLoadedOnce = true
      }
    }

    const reject = () => {
      node!.loading = false
      node!.loaded = false
      if (node!.level === 0) {
        this.initialLoaded = true
      }
    }

    cfg.lazyLoad(node, resolve, reject)
  };

  private expandNode = (node: CascaderNode, silent: boolean = false) => {
    const { level } = node
    const newMenus = this.menus.slice(0, level)
    let newExpandingNode: CascaderNode;

    if (node.isLeaf) {
      newExpandingNode = node.pathNodes[level - 2]
    } else {
      newExpandingNode = node
      newMenus.push(node.children)
    }

    if (this.expandingNode?.uid !== newExpandingNode?.uid) {
      this.expandingNode = node
      this.menus = newMenus
      !silent && this.expandChangeEvent?.emit(node?.pathValues || []);
    }
  };

  private expandParentNode = (node: CascaderNode | undefined) => {
    if (!node) return
    node = node.parent;
    this.expandParentNode(node);
    node && this.expandNode(node);
  }

  @Method()
  async handleCheckChange(
    node: CascaderNode,
    checked: boolean,
    emitClose: boolean = true
  ) {
    const { checkStrictly, multiple } = this.config!;
    const oldNode = this.checkedNodes[0];
    this.manualChecked = true;

    !multiple && oldNode?.doCheck(false)
    node.doCheck(checked)
    this.calculateCheckedValue();
    emitClose && !multiple && !checkStrictly && this.closeEvent?.emit();
    !emitClose && !multiple && this.expandParentNode(node)
  };

  private context?: ReactiveObject<CascaderPanelContext>;

  @Watch("props")
  updateConfig() {
    this.config = {
      ...defaultProps,
      ...this.props,
    };
  }

  @Watch("isHoverMenu")
  handleIsHoverMenuChange() {
    this.context!.value.isHoverMenu = this.isHoverMenu;
  }

  @Watch("checkedNodes")
  handleCheckedNodesChange() {
    this.context!.value.checkedNodes = this.checkedNodes;
  }

  @Watch('config')
  handleConfigChange(newVal: CascaderConfig, oldVal: CascaderConfig) {
    if (!isEqual(newVal, oldVal)) {
      this.initStore();
    }
    this.context!.value.config = this.config as CascaderConfig;
  }

  @Watch('options')
  handleOptionsChange() {
    this.initStore();
  }

  @Watch('value')
  handleValueChange() {
    this.manualChecked = false;
    this.syncCheckedValue();
  }

  @Watch('checkedValue')
  handleCheckedValueChange(newVal: CascaderValue | undefined) {
    if (!isEqual(newVal, this.value)) {
      this.value = newVal;
      this.changeEvent?.emit(newVal);
    }
  }

  @Watch('expandingNode')
  handleExpandingNodeChange() {
    this.context!.value.expandingNode = this.expandingNode!;
  }

  @Method()
  async getContext() {
    return this.context;
  }

  private initStore = () => {
    const cfg = this.config

    this.manualChecked = false;
    this.store = new Store(this.options, cfg!);
    this.menus = [this.store.getNodes()];

    if (cfg!.lazy && isEmpty(this.options)) {
      this.initialLoaded = false;
      this.lazyLoad(undefined, (list) => {
        if (list) {
          this.store = new Store(list, cfg!);
          this.menus = [this.store.getNodes()];
        }
        this.initialLoaded = true;
        this.syncCheckedValue(false, true);
      })
    } else {
      this.syncCheckedValue(false, true);
    }
  }

  private syncCheckedValue = (loaded = false, forced = false) => {
    const { lazy, multiple, checkStrictly } = this.config!;
    const leafOnly = !checkStrictly;

    if (
      !this.initialLoaded ||
      this.manualChecked ||
      (!forced && isEqual(this.value, this.checkedValue))
    ) {
      return;
    }

    if (lazy && !loaded) {
      const values: CascaderNodeValue[] = uniq(
        flattenDeep(castArray(this.value as CascaderNodeValue[]))
      );

      const nodes = values
        .map((val) => this.store?.getNodeByValue(val))
        .filter(
          (node) => !!node && !node.loaded && !node.loading
        ) as CascaderNode[];

      if (nodes.length) {
        nodes.forEach((node) => {
          this.lazyLoad(node, () => this.syncCheckedValue(false, forced));
        });
      } else {
        this.syncCheckedValue(true, forced);
      }
    } else {
      const values = multiple ? castArray(this.value) : [this.value];
      const nodes = uniq(
        values.map((val) =>
          this.store?.getNodeByValue(val as CascaderNodeValue, leafOnly)
        )
      ) as CascaderNode[];
      this.syncMenuState(nodes, forced);
      this.checkedValue = cloneDeep(this.value ?? undefined);
    }
  };

  private syncMenuState = (
    newCheckedNodes: CascaderNode[],
    reserveExpandingState = true
  ) => {
    const { checkStrictly } = this.config!;
    const oldNodes = this.checkedNodes;
    const newNodes = newCheckedNodes.filter(
      (node) => !!node && (checkStrictly || node.isLeaf)
    );
    const oldExpandingNode = this.store?.getSameNode(this.expandingNode!);
    const newExpandingNode =
      (reserveExpandingState && oldExpandingNode) || newNodes[0];

    if (newExpandingNode) {
      newExpandingNode.pathNodes.forEach((node) => this.expandNode(node, true));
    } else {
      this.expandingNode = undefined;
    }

    oldNodes.forEach((node) => node.doCheck(false));
    newNodes.forEach((node) => node.doCheck(true));
    this.checkedNodes = newNodes;
    nextFrame(() => {
      this.scrollToExpandingNode();
    });
  };

  componentWillLoad() {
    this.context = new ReactiveObject<CascaderPanelContext>({
      config: {} as CascaderConfig,
      expandingNode: this.expandingNode,
      checkedNodes: this.checkedNodes,
      isHoverMenu: this.isHoverMenu,
      initialLoaded: this.initialLoaded,
      renderLabel: this.renderLabel,
      lazyLoad: this.lazyLoad,
      expandNode: this.expandNode,
      handleCheckChange: this.handleCheckChange.bind(this),
    });
    cascaderPanelContexts.set(this.el, this.context);

    this.config = {
      ...defaultProps,
      ...this.props,
    };
  }

  componentDidLoad() {
    if (!isEmpty(this.value)) {
      this.syncCheckedValue();
    }
  }

  componentWillUpdate() {
    this.menuList = [];
  }

  disconnectedCallback() {
    if (!hasRawParent(this.el)) {
      cascaderPanelContexts.delete(this.el);
    }
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement
    const code = getEventCode(e);

    switch (code) {
      case EVENT_CODE.up:
      case EVENT_CODE.down: {
        e.preventDefault()
        const distance = code === EVENT_CODE.up ? -1 : 1
        focusNode(
          getSibling(
            target,
            distance,
            `.${ns.b('node')}[tabindex="-1"]`
          ) as HTMLElement
        );
        break;
      }
      case EVENT_CODE.left: {
        e.preventDefault()
        const preMenu = this.menuList[getMenuIndex(target) - 1]
        const expandedNode = preMenu?.querySelector(
          `.${ns.b('node')}[aria-expanded="true"]`
        )
        focusNode(expandedNode as HTMLElement);
        break;
      }
      case EVENT_CODE.right: {
        e.preventDefault()
        const nextMenu = this.menuList[getMenuIndex(target) + 1];
        const firstNode = nextMenu?.querySelector(
          `.${ns.b('node')}[tabindex="-1"]`
        );
        focusNode(firstNode as HTMLElement);
        break;
      }
      case EVENT_CODE.enter:
      case EVENT_CODE.numpadEnter:
        checkNode(target);
        break;
    }
  };

  render() {
    return (
      <Host
        class={classNames(ns.b("panel"), ns.is("bordered", this.border))}
        onKeyDown={this.handleKeyDown}
      >
        {this.menus.map((menu, index) => (
          <zane-cascader-menu
            key={index}
            ref={(el) => (this.menuList[index] = el!)}
            index={index}
            nodes={[...menu]}
          >
            <div slot="empty">
              <slot name="empty"></slot>
            </div>
          </zane-cascader-menu>
        ))}
      </Host>
    );
  }

  @Method()
  async getFlattedNodes(leafOnly: boolean) {
    return this.store?.getFlattedNodes(leafOnly);
  }

  @Method()
  async getCheckedNodes(leafOnly: boolean) {
    const nodes = await this.getFlattedNodes(leafOnly);
    return nodes?.filter(({ checked }) => checked !== false);
  }

  @Method()
  async scrollToExpandingNode() {
    if (!isClient) return;

    this.menuList.forEach((menu) => {
      if (menu) {
        const container = menu.querySelector(
          `.${ns.namespace}-scrollbar__wrap`
        );
        const activeNode =
          menu.querySelector(
            `.${ns.b("node")}.${ns.is("active")}:last-child`
          ) || menu.querySelector(`.${ns.b("node")}.in-active-path`);
        scrollIntoView(container as HTMLElement, activeNode as HTMLElement);
      }
    });
  }

  @Method()
  async calculateCheckedValue() {
    const { checkStrictly, multiple } = this.config!;
    const oldNodes = this.checkedNodes;
    const newNodes = await this.getCheckedNodes(!checkStrictly)!;
    const nodes = sortByOriginalOrder(oldNodes, newNodes ?? []);
    const values = nodes.map((node) => node.valueByOption);
    this.checkedNodes = nodes;
    this.checkedValue = multiple ? values : (values[0] ?? null);
  }

  @Method()
  async loadLazyRootNodes() {
    if (this.initialLoadedOnce) {
      return;
    }
    this.initStore();
  }
}
