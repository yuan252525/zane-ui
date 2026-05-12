import type { Instance, Props } from "tippy.js";

type OptionCommon = Record<string, any>;

export type Option = OptionCommon & {
  created?: boolean
}

export interface TagTooltipProps {
  appendTo?: Props['appendTo'];
  placement?: Props['placement'];
  theme?: Props['theme'];
  popperOptions?: Props['popperOptions'];
  offset?: Props['offset']
  onShow?: (event: CustomEvent<Instance<Props>>) => void;
  onHide?: (event: CustomEvent<Instance<Props>>) => void;
}

export type SelectProps = {
  label?: string;
  value?: string;
  disabled?: string;
  options?: string;
}

export interface SelectOptionProps {
  label?: string;
  value?: string;
  disabled?: string;
  options?: string;
}

export type SelectOptionBasic = {
  index: number;
  value: SelectOptionValue;
  currentLabel: string | number | boolean;
  isDisabled?: boolean;
}

export type SelectOptionValue = string | number | boolean | Record<string, any>;

export type SelectStates = {
  inputValue: string;
  options: Map<SelectOptionValue, Option>;
  cachedOptions: Map<SelectOptionValue, Option>;
  optionValues: SelectOptionValue[];
  selected: SelectOptionBasic[];
  hoveringIndex: number;
  inputHovering: boolean;
  selectionWidth: number;
  collapseItemWidth: number;
  previousQuery: string | null;
  selectedLabel: string;
  menuVisibleOnFocus: boolean;
  isBeforeHide: boolean;
}

export type OptionStates = {
  index: number;
  groupDisabled: boolean;
  visible: boolean;
  hover: boolean;
}

export type SelectContext = {
  multiple: boolean;
  multipleLimit: number;
  fitInputWidth: boolean;
  selectRef?: HTMLDivElement;
  options: Option[]
  optionsArray: Option[];
  optionValues: SelectOptionValue[];
  value: any;
  valueKey: string;
  hoveringIndex: number;
  remote: boolean;
  handleOptionSelect: (option: Option) => Promise<void>;
  setSelected: () => void;
}

export type SelectGroupContext = {
  label: string;
  disabled: boolean;
  updateVisible: () => void | Promise<void>;
}
