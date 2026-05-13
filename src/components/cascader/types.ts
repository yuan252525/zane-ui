import type { CascaderNode } from './node';

export type CascaderNodeValue = number | Record<string, any> | string;

export type CascaderNodePathValue = CascaderNodeValue[];

export type CascaderValue =
  | CascaderNodeValue
  | CascaderNodePathValue
  | (CascaderNodeValue | CascaderNodePathValue)[];

export interface CascaderOption extends Record<string, unknown> {
  children?: CascaderOption[];
  disabled?: boolean;
  label?: string;
  leaf?: boolean;
  value?: CascaderNodeValue;
}

export type isDisabled = (data: CascaderOption, node: CascaderNode) => boolean;

export type isLeaf = (data: CascaderOption, node: CascaderNode) => boolean;

export type Resolve = (dataList?: CascaderOption[]) => void;

export type ExpandTrigger = 'click' | 'hover';

export type LazyLoad = (
  node: CascaderNode,
  resolve: Resolve,
  reject: () => void,
) => void;

export interface RenderLabelProps {
  node?: CascaderNode
  data?: CascaderOption
}

export type RenderLabel = (props: RenderLabelProps) => HTMLElement

export interface CascaderProps {
  expandTrigger?: ExpandTrigger
  multiple?: boolean
  checkStrictly?: boolean
  emitPath?: boolean
  lazy?: boolean
  lazyLoad?: LazyLoad
  value?: string
  label?: string
  children?: string
  disabled?: string | isDisabled
  leaf?: string | isLeaf
  hoverThreshold?: number
  checkOnClickNode?: boolean
  checkOnClickLeaf?: boolean
  showPrefix?: boolean
}

export type CascaderConfig = Required<CascaderProps>;

export interface Tag {
  closable: boolean;
  hitState?: boolean;
  key: number;
  node?: CascaderNode;
  text: string;
}

export type CascaderPanelContext = {
  config: CascaderConfig;
  expandingNode?: CascaderNode;
  checkedNodes: CascaderNode[];
  isHoverMenu: boolean;
  initialLoaded: boolean;
  renderLabel?: RenderLabel;
  lazyLoad: (
    node?: CascaderNode,
    cb?: (dataList: CascaderOption[]) => void
  ) => void;
  expandNode?: (node: CascaderNode, silent?: boolean) => void;
  handleCheckChange: (
    node: CascaderNode,
    checked: boolean,
    emitClose?: boolean
  ) => void;
}
