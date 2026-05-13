import { Component, h, Prop, Event, EventEmitter, Watch, State, Element, Fragment, Method } from '@stencil/core';
import type { ComponentSize } from '../../types';
import type { Props } from 'tippy.js';
import type {
  SelectContext,
  SelectOptionBasic,
  SelectOptionProps,
  SelectOptionValue,
  SelectProps,
  SelectStates,
  TagTooltipProps,
  Option,
} from './types';
import tippy from 'tippy.js';
import { defaultProps, selectContexts } from './constants';
import { useNamespace, useResizeObserver } from '../../hooks';
import state from '../../global/store';
import {
  castArray,
  debugWarn,
  getEventCode,
  hasRawParent,
  inLabel,
  isFocusable,
  isFunction,
  isIOS,
  isKorean,
  isNumber,
  isObject,
  isUndefined,
  nextFrame,
  ReactiveObject,
  scrollIntoView
} from '../../utils';
import { isNil } from '../../utils/is/isNil';
import type { FormContext, FormItemContext } from '../form/types';
import type { ConfigProviderContext } from '../config-provider/types';
import { getFormContext, getFormItemContext } from '../form/utils';
import { getConfigProviderContext } from '../config-provider/utils';
import { DEFAULT_EMPTY_VALUES, EVENT_CODE, MINIMUM_INPUT_WIDTH, ValidateComponentsMap } from '../../constants';
import classNames from 'classnames';
import isEqual from 'lodash-es/isEqual';
import get from 'lodash-es/get';
import findLastIndex from 'lodash-es/findLastIndex';
import clamp from 'lodash-es/clamp';
import debounce from 'lodash-es/debounce';
import isPlainObject from 'lodash-es/isPlainObject';

const ns = useNamespace('select');
const nsInput = useNamespace('input');

@Component({
  tag: 'zane-select',
  styleUrl: 'zane-select.scss'
})
export class ZaneSelect {
  @Element() el!: HTMLElement;

  @Prop() name?: string;

  @Prop({ attribute: 'id' }) zId?: string;

  @Prop({ mutable: true }) value: any[] | string | number | Record<string, any> | any = undefined;

  @Prop() autocomplete: string = 'off';

  @Prop() automaticDropdown: boolean = false;

  @Prop() size?: ComponentSize;

  @Prop() disabled?: boolean = undefined;

  @Prop() clearable: boolean = false;

  @Prop() clearIcon: string = 'close-circle-line';

  @Prop() allowCreate: boolean = false;

  @Prop() loading: boolean = false;

  @Prop() popperTheme?: string;

  @Prop() popperOptions: Props['popperOptions'] = {};

  @Prop() popperBoxClass?: string;

  @Prop() popperContentClass?: string;

  @Prop() debounce: number = 300;

  @Prop() loadingText?: string;

  @Prop() noMatchText?: string;

  @Prop() noDataText?: string;

  @Prop() remote: boolean = false;

  @Prop() remoteMethod?: (query: string) => any;

  @Prop() filterable: boolean = false;

  @Prop() filterMethod?: (query: string) => any;

  @Prop() multiple: boolean = false;

  @Prop() multipleLimit: number = 0;

  @Prop() placeholder?: string;

  @Prop() defaultFirstOption: boolean = false;

  @Prop() reserveKeyword: boolean = true;

  @Prop() valueKey: string = 'value';

  @Prop() collapseTags: boolean = false;

  @Prop() collapseTagsTooltip: boolean = false;

  @Prop() tagTooltip: TagTooltipProps = {};

  @Prop() maxCollapseTags: number = 1;

  @Prop() fitInputWidth: boolean = false;

  @Prop() suffixIcon: string = 'arrow-down-s-line';

  @Prop() tagType: 'primary' | 'success' | 'warning' | 'danger' | 'info' = 'info';

  @Prop() tagEffect: 'dark' | 'light' | 'plain' = 'light';

  @Prop() validateEvent: boolean = true;

  @Prop() remoteShowSuffix: boolean = false;

  @Prop() showArrow: boolean = false;

  @Prop() offset: Props['offset'] = tippy.defaultProps.offset;

  @Prop() placement: Props['placement'] = 'bottom-start';

  @Prop({ attribute: 'tabIndex'}) zTabIndex: number = 0;

  @Prop() appendTo: Props['appendTo'] = tippy.defaultProps.appendTo;

  @Prop() options: Record<string, any>[] = [];

  @Prop() props: SelectOptionProps = { ...defaultProps };

  @Prop() emptyValues?: any[];

  @Prop() valueOnClear: any = undefined;

  @Prop() label?: string;

  @Prop() ariaLabel?: string;

  @Prop() tagRender?: () => HTMLElement;

  @Prop() tagLabelRender?: (
    label: string | number | boolean, value: SelectOptionValue, index: number
  ) => HTMLElement;

  @Event({ eventName: 'zChange', bubbles: false })
  changeEvent?: EventEmitter<any>;

  @Event({ eventName: 'zRemoveTag', bubbles: false })
  removeTagEvent?: EventEmitter<any>;

  @Event({ eventName: 'zClear', bubbles: false })
  clearEvent?: EventEmitter<any>;

  @Event({ eventName: 'zFocus', bubbles: false })
  focusEvent?: EventEmitter<FocusEvent>;

  @Event({ eventName: 'zPopupScroll', bubbles: false })
  popupScrollEvent?: EventEmitter<{scrollTop: number; scrollLeft: number}>;

  @Event({ eventName: 'zBlur', bubbles: false })
  blurEvent?: EventEmitter<FocusEvent>;

  @Event({ eventName: 'zVisibleChange', bubbles: false })
  visibleChangeEvent?: EventEmitter<boolean>;

  @Event({ eventName: "zCompositionEnd", bubbles: false })
  compositionendEvent?: EventEmitter<CompositionEvent>;

  @Event({ eventName: "zCompositionStart", bubbles: false })
  compositionstartEvent?: EventEmitter<CompositionEvent>;

  @Event({ eventName: "zCompositionUpdate", bubbles: false })
  compositionupdateEvent?: EventEmitter<CompositionEvent>;

  @State() inputId?: string;

  @State() selectSize?: ComponentSize;

  @State() selectDisabled: boolean = false;

  @State() dropdownMenuVisible: boolean = false;

  @State() isFocused: boolean = false;

  @State() expanded: boolean = false;

  @State() contentId?: string;

  @State() optionsArray: Option[] = [];

  @State() showTagList: SelectOptionBasic[] = [];

  @State() collapseTagList: SelectOptionBasic[] = [];

  @State() collapseTagSize: 'small' | 'default' = 'default';

  @State() calculatorWidth = 0;

  @State() popperSize: number = -1;

  @State() debouncing: boolean = false;

  @State() isComposing: boolean = false;

  @State() shouldShowPlaceholder: boolean = false;

  @State() hoverOption?: Option;

  @State() aliasProps: SelectProps = {
    label: 'label',
    value: 'value',
    disabled: 'disabled',
    options: 'options'
  };

  @State() optionElements: Option[] = [];

  @State() filteredOptionsCount = 0;

  @State() inputValue: string = '';
  @State() optionValues: SelectOptionValue[] = [];
  @State() selected: SelectOptionBasic[] = [];
  @State() selectionWidth: number = 0;
  @State() collapseItemWidth: number = 0;
  @State() hoveringIndex: number = -1;
  @State() selectedLabel: string = '';
  @State() previousQuery: string | null = null;
  @State() inputHovering: boolean = false;
  @State() menuVisibleOnFocus: boolean = false;
  @State() isBeforeHide: boolean = false;

  private selectRef?: HTMLDivElement;

  private tooltipRef?: HTMLZaneTippyElement;

  private wrapperRef?: HTMLDivElement;

  private selectionRef?: HTMLDivElement;

  private inputRef?: HTMLInputElement;

  private calculatorRef?: HTMLSpanElement;

  private suffixRef?: HTMLDivElement;

  private menuRef?: HTMLElement;

  private collapseItemRef?: HTMLDivElement;

  private tagMenuRef?: HTMLDivElement;

  private scrollbarRef?: HTMLZaneScrollbarElement;

  private tagTooltipRef?: HTMLZaneTippyElement;

  private tagLabelRefs: HTMLElement[] = [];

  private collapseTagLabelRefs: HTMLElement[] = [];

  private formContext?: ReactiveObject<FormContext>;

  private formItemContext?: ReactiveObject<FormItemContext>;

  private configProviderContext?: ReactiveObject<ConfigProviderContext>;

  private hasPrefixSlot = false;

  private hasHeaderSlot = false;

  private hasLoadingSlot = false;

  private hasFooterSlot = false;

  private context?: ReactiveObject<SelectContext>;

  private unCalculatorResizeObserver?: () => void;
  private unSelectResizeObserver?: () => void;
  private unWrapperResizeObserver?: () => void;
  private unTagMenuResizeObserver?: () => void;
  private unCollapseItemResizeObserver?: () => void;
  private unSelectionResizeObserver?: () => void;
  private unMenuResizeObserver?: () => void;

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

  @Watch("size")
  handleUpdateSize() {
    this.selectSize =
      this.size ||
      this.formItemContext?.value.size ||
      this.formContext?.value.size ||
      this.configProviderContext?.value.size ||
      "";
  }

  @Watch('selectSize')
  handleUpdateCollapseTagSize() {
    this.collapseTagSize = this.selectSize === 'small' ? 'small' : 'default';
  }

  @Watch("disabled")
  handleUpdateDisabled() {
    this.selectDisabled =
      this.disabled ?? this.formContext?.value.disabled ?? false;
  }

  @Watch('multiple')
  handleMultipleChange() {
    if (this.context) {
      this.context.value.multiple = this.multiple;
    }
  }

  @Watch('fitInputWidth')
  handleFitInputWidthChange() {
    if (this.context) {
      this.context.value.fitInputWidth = this.fitInputWidth;
    }
  }

  @Watch('selectRef')
  handleSelectRefChange() {
    if (this.context) {
      this.context.value.selectRef = this.selectRef;
    }
  }

  @Watch('optionsArray')
  @Watch('hoveringIndex')
  handleUpdateHoverOption() {
    const hoveringIndex = this.hoveringIndex;
    if (isNumber(hoveringIndex) && hoveringIndex > -1) {
      this.hoverOption = this.optionsArray[hoveringIndex];
    } else {
      this.hoverOption = undefined;
    }

    this.optionsArray.forEach((option) => {
      option.setHover(this.hoverOption === option);
    });
  }

  @Watch('optionElements')
  @Watch('optionValues')
  handleUpdateOptionsArray() {
    const list = this.optionElements;
    const newList: Option[] = [];
    this.optionValues.forEach((item) => {
      const index = list.findIndex((i) => {
        return i.value === item
      });
      if (index > -1) {
        newList.push(list[index]);
      }
    });
    this.optionsArray = newList.length >= list.length ? newList : list;
    this.filteredOptionsCount = this.optionsArray.filter(
      async (option) => await option.getVisible()
    ).length;

    if (this.context) {
      this.context.value.optionsArray = this.optionsArray;
    }
  }

  @Watch('props')
  handleUpdateAliasProps() {
    this.aliasProps = {
      ...this.aliasProps,
      ...this.props
    };
  }

  @Watch('selected')
  @Watch('multiple')
  @Watch('collapseTags')
  @Watch('maxCollapseTags')
  handleUpdateShowTagList() {
    if (!this.multiple) {
      this.showTagList = [];
      this.collapseTagList = [];
      return;
    }

    this.showTagList = this.collapseTags
      ? this.selected.slice(0, this.maxCollapseTags)
      : this.selected;

    this.collapseTagList = this.collapseTags
      ? this.selected.slice(0, this.maxCollapseTags)
      : [];
  }

  @Watch('value')
  @Watch('inputValue')
  @Watch('filterable')
  handleUpdateShouldShowPlaceholder() {
    if (Array.isArray(this.value)) {
      this.shouldShowPlaceholder = this.value.length === 0 && !this.inputValue;
      return;
    }
    this.shouldShowPlaceholder = this.filterable ? !this.inputValue : true;
  }

  @Watch('expanded')
  handleUpdateExpanded() {
    if (this.expanded) {
      this.handleQueryChange('');
    } else {
      this.inputValue = '';
      this.previousQuery = null;
      this.isBeforeHide = true;
      this.menuVisibleOnFocus = false;
    }

    this.expanded ? this.tooltipRef?.show() : this.tooltipRef?.hide();
  }

  @Watch('dropdownMenuVisible')
  handleWatchDropdownMenuVisible() {
    if (this.dropdownMenuVisible) {
      this.unMenuResizeObserver = useResizeObserver(this.menuRef, this.updateTooltip);
    } else {
      this.unMenuResizeObserver?.();
      this.unMenuResizeObserver = undefined;
    }
    this.visibleChangeEvent?.emit(this.dropdownMenuVisible);
  }

  @Watch('filterable')
  @Watch('filterMethod')
  @Watch('remote')
  @Watch('remoteMethod')
  @Watch('optionsArray')
  @Watch('inputValue')
  handleUpdateOptions() {
    if (this.filterable && isFunction(this.filterMethod)) {
      return;
    }
    if (this.filterable && this.remote && isFunction(this.remoteMethod)) {
      return;
    }
    this.optionsArray.forEach((option) => {
      option.updateOption?.(this.inputValue);
    });
  }

  @Watch('value')
  handleWatchValue() {
    this.context!.value.value = this.value;
    if (this.multiple) {
      if (this.filterable && !this.reserveKeyword) {
        this.inputValue = '';
        this.handleQueryChange('');
      }
    }
    this.setSelected();
    if (this.validateEvent) {
      this.formItemContext?.value.validate('change').catch((err) => debugWarn(err));
    }
  }

  @Method()
  async getContext() {
    return this.context;
  }

  @Method()
  async zFocus() {
    this.inputRef?.focus();
  }

  @Method()
  async zBlur() {
    if (this.expanded) {
      this.expanded = false;
      nextFrame(() => {
        this.inputRef?.blur();
      });
      return;
    }
    this.inputRef?.blur();
  }

  private handleWrapperClick = (e: MouseEvent) => {
    e.preventDefault();
    if (
      this.selectDisabled ||
      isFocusable(e.target as HTMLElement) ||
      (this.wrapperRef?.contains(document.activeElement) && this.wrapperRef !== document.activeElement)
    ) {
      return;
    }
    this.inputRef?.focus();
  }

  private handleWrapperFocus = (event: FocusEvent) => {
    if (this.selectDisabled || this.isFocused) {
      return;
    }
    this.isFocused = true;
    this.focusEvent?.emit(event);

    if (this.automaticDropdown && !this.expanded) {
      this.expanded = true;
      this.menuVisibleOnFocus = true;
    }
  }

  private handleWrapperBlur = async (event: FocusEvent) => {
    const cancelBlur = await this.tooltipRef?.isFocusInsideContent(event) ||
      await this.tagTooltipRef?.isFocusInsideContent(event);

    if (this.selectDisabled ||
      (event.relatedTarget && this.wrapperRef?.contains(event.relatedTarget as Node)) ||
      cancelBlur
    ) {
      return;
    }

    this.isFocused = false;
    this.blurEvent?.emit(event);

    this.expanded = false;
    this.menuVisibleOnFocus = false;

    if (this.validateEvent) {
      this.formItemContext?.value.validate?.('blur').catch((err) => debugWarn(err));
    }
  }

  private handleClickOutside = () => {
    this.expanded = false;
    if (this.isFocused) {
      const event = new FocusEvent('blur');
      this.handleWrapperBlur(event);
    }
  }

  private handleMenuEnter = () => {
    this.isBeforeHide = false;
    nextFrame(() => {
      this.scrollbarRef?.update();
      this.scrollToOption(this.selected);
    });
  }

  private handleSelectMouseEnter = () => {
    this.inputHovering = true;
  }

  private handleSelectMouseLeave = () => {
    this.inputHovering = false;
  }

  private handleTagRender = () => {
    // TODO
  }

  private handleTagLabelRender = (
    label: string | number | boolean,
    value: SelectOptionValue,
    index: number
  ) => {
    if (this.tagLabelRender) {
      nextFrame(() => {
        const result = this.tagLabelRender?.(label, value, index);
        const parentEl = this.tagLabelRefs[index];
        if (result && parentEl) {
          parentEl.innerHTML = result.innerHTML;
        }
      });
    }
  }

  private handleCollapseTagLabelRender = (
    label: string | number | boolean,
    value: SelectOptionValue,
    index: number
  ) => {
    if (this.tagLabelRender) {
      nextFrame(() => {
        const result = this.tagLabelRender?.(label, value, index);
        const parentEl = this.collapseTagLabelRefs[index];
        if (result && parentEl) {
          parentEl.innerHTML = result.innerHTML;
        }
      });
    }
  }

  private handleQueryChange = (val: string) => {
    if (this.previousQuery === val || this.isComposing) {
      return;
    }
    this.previousQuery = val;

    if (this.filterable && isFunction(this.filterMethod)) {
      this.filterMethod(val);
    } else if (this.filterable && this.remote && isFunction(this.remoteMethod)) {
      this.remoteMethod(val);
    }

    if (
      this.defaultFirstOption &&
      (this.filterable || this.remote) &&
      this.filteredOptionsCount
    ) {
      nextFrame(() => {
        this.checkDefaultFirstOption()
      });
    } else {
      nextFrame(() => {
        this.updateHoveringIndex();
      });
    }
  }

  private navigateOptions = async (direction: 'prev' | 'next') => {
    if (!this.expanded) {
      this.expanded = true;
      return;
    }

    if (
      this.optionElements.length === 0 ||
      this.filteredOptionsCount === 0 ||
      this.isComposing
    ) {
      return;
    }

    const optionsAllDisabled = this.optionsArray.filter(
      async (option) => await option.getVisible()
    ).every(
      async (option) => option.getDisabled()
    );
    if (optionsAllDisabled) {
      if (direction === 'next') {
        this.hoveringIndex++;
        if (this.hoveringIndex === this.optionElements.length) {
          this.hoveringIndex = 0;
        }
      } else if (direction === 'prev') {
        this.hoveringIndex--;
        if (this.hoveringIndex < 0) {
          this.hoveringIndex = this.optionElements.length - 1;
        }
      }
      const option = this.optionsArray[this.hoveringIndex];
      const isDisabled = await option.getDisabled();
      const isVisible = await option.getVisible();
      if (isDisabled || !isVisible) {
        await this.navigateOptions(direction);
      }

      nextFrame(() => {
        this.scrollToOption(this.hoverOption ?? [this.optionsArray[this.hoveringIndex]]);
      });
    }
  }

  private selectOption = async () => {
    if (!this.expanded) {
      this.toggleMenu();
    } else {
      const option = this.optionsArray[this.hoveringIndex];
      const isDisabled = await option.getDisabled();
      if (option && !isDisabled) {
        this.handleOptionSelect(option);
      }
    }
  }

  @Method()
  async handleOptionSelect(option: Option) {
    if (this.multiple) {
      const value = castArray(this.value ?? []).slice();
      const optionIndex = this.getValueIndex(value, option);
      if (optionIndex > -1) {
        value.splice(optionIndex, 1);
      } else if (
        this.multipleLimit <= 0 ||
        value.length < this.multipleLimit
      ) {
        value.push(option.value);
      }

      this.value = value;
      this.emitChange(value);
      if (option.created) {
        this.handleQueryChange('');
      }
      if (this.filterable && (option.created || !this.reserveKeyword)) {
        this.inputValue = '';
      }
    } else {
      if (!isEqual(this.value, option.value)) {
        this.value = option.value;
        this.emitChange(option.value);
      }
      this.expanded = false;
    }
    this.zFocus();
    if (this.expanded) {
      return;
    }
    nextFrame(() => {
      this.scrollToOption(option);
    });
  }

  private handleEsc = () => {
    if (this.inputValue.length > 0) {
      this.inputValue = '';
    } else {
      this.expanded = false;
    }
  }

  private handleClick = (event: MouseEvent) => {
    event.stopPropagation();
    this.toggleMenu();
  }

  private handleFocus = () => {
    nextFrame(() => {
      this.isFocused = true;
    });
  }

  private handleBlur = () => {
    nextFrame(() => {
      this.isFocused = false;
    });
  }

  private deleteSelected = (event: Event) => {
    event.stopPropagation();
    const value = this.multiple ? [] : this.valueOnClear;
    if (this.multiple) {
      for (const item of this.selected) {
        if (item.isDisabled) {
          value.push(item.value);
        }
      }
    }
    this.value = value;
    this.emitChange(value);
    this.hoveringIndex = -1;
    this.expanded = false;
    this.clearEvent?.emit();
    this.zFocus();
  }

  private handleClearClick = (event: Event) => {
    this.deleteSelected(event);
  }

  private onInputChange = () => {
    if (this.inputValue.length > 0 && !this.expanded) {
      this.expanded = true;
    }
    nextFrame(() => {
      this.handleQueryChange(this.inputValue);
    });
  }

  private debouncedOnInputChange = debounce(() => {
    this.onInputChange();
    this.debouncing = false;
  }, this.debounce);

  private handleInput = (event: Event) => {
    this.inputValue = (event.target as HTMLInputElement).value;
    if (this.remote) {
      this.debouncing = true;
      this.debouncedOnInputChange();
    } else {
      this.onInputChange()
    }
  }

  private handleCompositionStart = (event: CompositionEvent) => {
    this.compositionstartEvent?.emit(event);
    this.isComposing = true;
  }

  private handleCompositionEnd = (event: CompositionEvent) => {
    this.compositionendEvent?.emit(event);
    if (this.isComposing) {
      this.isComposing = false;
      nextFrame(() => {
        this.handleInput(event);
      });
    }
  }

  private handleCompositionUpdate = (event: CompositionEvent) => {
    this.compositionupdateEvent?.emit(event);
    const text = (event.target as HTMLInputElement).value;
    const lastCharacter = text[text.length - 1] || '';
    this.isComposing = !isKorean(lastCharacter);
  }

  private deletePrevTag = (e: KeyboardEvent) => {
    const code = getEventCode(e);
    if (!this.multiple) {
      return;
    }
    if (code === EVENT_CODE.delete) {
      return;
    }
    if ((e.target as HTMLInputElement).value.length <= 0) {
      const value = castArray(this.value).slice();
      const lastNotDisabledIndex = this.getLastNotDisabledIndex(value);
      if (lastNotDisabledIndex < 0) {
        return;
      }
      const removeTagValue = value[lastNotDisabledIndex];
      value.splice(lastNotDisabledIndex, 1);
      this.value = value;
      this.emitChange(value);
      this.removeTagEvent?.emit(removeTagValue);
    }
  }

  private popupScroll = (e:CustomEvent<{
    scrollTop: number;
    scrollLeft: number;
  }>) => {
    this.popupScrollEvent?.emit(e.detail);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    const code = getEventCode(e);
    let isPreventDefault = true;
    switch(code) {
      case EVENT_CODE.up:
        this.navigateOptions('prev');
        break;
      case EVENT_CODE.down:
        this.navigateOptions('next');
        break;
      case EVENT_CODE.enter:
      case EVENT_CODE.numpadEnter:
        if (!this.isComposing) {
          this.selectOption();
        }
        break;
      case EVENT_CODE.esc:
        this.handleEsc();
        break;
      case EVENT_CODE.backspace:
        isPreventDefault = false;
        this.deletePrevTag(e);
        break;
      case EVENT_CODE.home:
        if (!this.expanded) {
          return;
        }
        this.focusOption(0, 'down');
        break;
      case EVENT_CODE.end:
        if (!this.expanded) {
          return;
        }
        this.focusOption(this.optionElements.length - 1, 'up');
        break;
      case EVENT_CODE.pageUp:
        if (!this.expanded) {
          return;
        }
        this.focusOption(this.hoveringIndex - 10, 'up');
        break;
      case EVENT_CODE.pageDown:
        if (!this.expanded) {
          return;
        }
        this.focusOption(this.hoveringIndex + 10, 'down');
        break;
      default:
        isPreventDefault = false;
        break;
    }
    if (isPreventDefault) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  private getValueKey = (item: Option | SelectStates['selected'][0]) => {
    return isObject(item.value) ? get(item, this.valueKey) : item.value;
  }

  private getOptions = (option: Option) => {
    return get(option, this.aliasProps.options as any);
  }

  private getOptionProps = (option: Option) => {
    return {
      label: this.getLabel(option),
      value: this.getValue(option),
      disabled: this.getDisabled(option),
    }
  }

  private getLabel = (option: Option) => {
    return get(option, this.aliasProps.label as any);
  }

  private getValue = (option: Option) => {
    return get(option, this.aliasProps.value as any);
  }

  private getDisabled = (option: Option) => {
    return get(option, this.aliasProps.disabled as any);
  }

  private getValueIndex = (arr: SelectOptionValue[], option: Option) => {
    if (isUndefined(option)) {
      return -1;
    }
    if (!isObject(option.value)) {
      return arr.indexOf(option.value);
    }

    return arr.findIndex((item) => {
      return isEqual(get(item, this.valueKey), this.getValueKey(option));
    });
  }

  private getLastNotDisabledIndex = (value: SelectOptionValue[]) => {
    const cachedOptionElementMap = this.optionElements.reduce((map, item) => {
      map.set(item.value, item);
      return map;
    }, new Map);
    return findLastIndex(value, async (it) => {
      const option = cachedOptionElementMap.get(it);
      const groupDisabled = await option?.getGroupDisabled();
      return !option?.disabled && !groupDisabled
    });
  }

  private getOption = (value: SelectOptionValue) => {
    let option;
    const isObjectValue = isPlainObject(value);

    for (let i = this.optionElements.length - 1; i >= 0; i--) {
      const optionEl = this.optionElements[i];
      const isEqualValue = isObjectValue
        ? get(optionEl.value, this.valueKey) === get(value, this.valueKey)
        : optionEl.value === value;

      const currentLabel = optionEl.label ?? (isObject(optionEl.value) ? '' : optionEl.value)

      if (isEqualValue) {
        option = {
          index: this.optionsArray.filter((opt) => !opt.created).indexOf(optionEl),
          value,
          currentLabel,
          disabled: optionEl.disabled,
        }
        break;
      }
    }
    if (option) return option;
    const label = isObjectValue ? (value as any).label : (value ?? '');
    const newOption = {
      index: -1,
      value,
      currentLabel: label,
    }
    return newOption;
  }

  private isEmptyValue = (value: unknown) => {
    const emptyValues = this.emptyValues || DEFAULT_EMPTY_VALUES;
    let result = true;
    if (Array.isArray(value)) {
      result = emptyValues.some((emptyVal) => {
        return isEqual(value, emptyVal);
      });
    } else {
      result = emptyValues.includes(value);
    }
    return result;
  }

  private findFocusableIndex = (
    arr: any[],
    start: number,
    step: number,
    len: number
  ) => {
    for (let i = start; i >= 0 && i < len; i += step) {
      const obj = arr[i];
      if (!obj?.isDisabled && obj?.visible) {
        return i;
      }
    }
    return null;
  }

  private getGapWidth = () => {
    if (!this.selectionRef) {
      return 0;
    }
    const style = window.getComputedStyle(this.selectionRef);
    return Number.parseFloat(style.gap || '6px');
  }

  private resetSelectionWidth = () => {
    this.selectionWidth = Number.parseFloat(window.getComputedStyle(this.selectionRef as HTMLElement).width) || 0
  }

  private updateTooltip = () => {
    this.tooltipRef?.updateTippyProps();
  }

  private updateTagTooltip = () => {
    this.tagTooltipRef?.updateTippyProps();
  }

  private updateHoveringIndex = () => {
    const length = this.selected.length;
    if (length > 0) {
      const lastOption = this.selected[length - 1];
      this.hoveringIndex = this.optionsArray.findIndex(
        (item) => this.getValueKey(lastOption) === this.getValueKey(item)
      );
    } else {
      this.hoveringIndex = -1;
    }
  }

  private resetCollapseItemWidth = () => {
    this.collapseItemWidth = this.collapseItemRef?.getBoundingClientRect().width ?? 0;
  }

  private resetCalculatorWidth = () => {
    this.calculatorWidth = this.calculatorRef?.getBoundingClientRect().width ?? 0;
  }

  private setSelected = () => {
    if (this.multiple) {
      this.selectedLabel = '';
    } else {
      const value = Array.isArray(this.value)
        ? this.value[0]
        : this.value;

      const option = this.getOption(value);
      this.selectedLabel = option.currentLabel;
      this.selected = [option];
    }
    const result: SelectStates['selected'] = [];
    if (!isUndefined(this.value)) {
      castArray(this.value).forEach((val) => {
        result.push(this.getOption(val));
      });
    }
    this.selected = result;
  }

  private deleteTag = (e: MouseEvent, tag: SelectOptionBasic) => {
    const index = this.selected.indexOf(tag);
    if (index > -1 && !this.selectDisabled) {
      const value = castArray(this.value).slice();
      value.splice(index, 1);
      this.value = value;
      this.emitChange(value);
      this.removeTagEvent?.emit(tag.value);
    }
    e.stopPropagation();
    this.zFocus();
  }

  private emitChange = (val: SelectOptionValue | SelectOptionValue[]) => {
    if (!isEqual(this.value, val)) {
      this.changeEvent?.emit(val);
    }
  }

  private checkDefaultFirstOption = () => {
    const optionsInDropdown = this.optionsArray.filter(
      async (n) => {
        const isVisible = await n.getVisible();
        const isDisabled = await n.getDisabled();
        const groupDisabled = await n.getGroupDisabled();
        return isVisible && !isDisabled && !groupDisabled
      }
    );
    const userCreatedOption = optionsInDropdown.find((n) => n.created);
    const firstOriginOption = optionsInDropdown[0];
    const valueList = this.optionsArray.map((item) => item.value);
    this.hoveringIndex = this.getValueIndex(valueList, userCreatedOption || firstOriginOption);
  }

  private focusOption = (targetIndex: number, mode: 'up' | 'down') => {
    const len = this.optionElements.length;
    if (len === 0) {
      return;
    }

    const start = clamp(targetIndex, 0, len - 1);
    const options = this.optionsArray;
    const direction = mode === 'up' ? -1 : 1;
    const newIndex =
      this.findFocusableIndex(options, start, direction, len) ??
      this.findFocusableIndex(options, start - direction, -direction, len)

    if (newIndex !== null) {
      this.hoveringIndex = newIndex;

      nextFrame(() => {
        this.scrollToOption(this.hoverOption ?? [this.optionsArray[this.hoveringIndex]]);
      });
    }
  }

  private toggleMenu = (e?: MouseEvent) => {
    if (
      this.selectDisabled ||
      (
        this.filterable && this.expanded && e && !this.suffixRef?.contains(e?.target as Node)
      )
    ) {
      return;
    }

    if (isIOS) {
      this.inputHovering = true;
    }

    if (this.menuVisibleOnFocus) {
      this.menuVisibleOnFocus = false;
    } else {
      this.expanded = !this.expanded;
    }
  }

  private scrollToOption = (option:
    | Option
    | Option[]
    | SelectStates['selected']
  ) => {
    const targetOption = Array.isArray(option)
      ? option[option.length - 1]
      : option;

    let target = null;

    if (!isNil(targetOption?.value)) {
      const options = this.optionsArray.filter(
        (item) => item.value === targetOption.value
      )
      if (options.length > 0) {
        target = options[0]
      }
    }

    if (this.tooltipRef && target) {
      const menu = this.tooltipRef.querySelector(`.${ns.be('dropdown', 'wrap')}`);
      if (menu) {
        scrollIntoView(menu as HTMLElement, target as HTMLElement);
      }
    }

    this.scrollbarRef?.handleScroll();
  }

  componentWillLoad() {
    this.formContext = getFormContext(this.el);
    this.formItemContext = getFormItemContext(this.el);
    this.configProviderContext = getConfigProviderContext(this.el);

    this.hasPrefixSlot = !!this.el.querySelector('[slot="prefix"]');
    this.hasHeaderSlot = !!this.el.querySelector('[slot="header"]');
    this.hasFooterSlot = !!this.el.querySelector('[slot="footer"]');
    this.hasLoadingSlot = !!this.el.querySelector('[slot="loading"]');

    this.contentId = `${ns.namespace}-id-${state.idInjection.prefix}-${state.idInjection.current++}`;

    this.handleWatchId();
    this.handleUpdateAliasProps();
    this.handleUpdateDisabled();
    this.handleUpdateSize();
    this.handleUpdateOptionsArray();
    this.handleUpdateShouldShowPlaceholder();

    this.context = new ReactiveObject({
      multiple: this.multiple,
      multipleLimit: this.multipleLimit,
      fitInputWidth: this.fitInputWidth,
      selectRef: this.selectRef,
      options: this.options,
      optionValues: this.optionValues,
      optionsArray: this.optionsArray,
      value: this.value,
      valueKey: this.valueKey,
      hoveringIndex: this.hoveringIndex,
      remote: this.remote,
      setSelected: this.setSelected.bind(this),
      handleOptionSelect: this.handleOptionSelect.bind(this),
    } as SelectContext);

    this.context.change$.subscribe(({ key, value }) => {
      if (key === 'optionValues') {
        this.optionValues = value;
      }
      if (key === 'hoveringIndex') {
        this.hoveringIndex = value;
      }
      if (key === 'options') {
        this.optionElements = value;
      }
    });
    selectContexts.set(this.el, this.context);

    this.setSelected();

    this.formContext?.change$.subscribe(({key}) => {
      if (key === 'disabled') {
        this.handleUpdateDisabled();
      }
      if (key === 'size') {
        this.handleUpdateSize();
      }
    });

    this.formItemContext?.change$.subscribe(({key}) => {
      if (key === 'size') {
        this.handleUpdateSize();
      }
    });

    this.configProviderContext?.change$.subscribe(({key}) => {
      if (key === 'size') {
        this.handleUpdateSize();
      }
    });
  }

  componentDidLoad() {
    this.unSelectionResizeObserver = useResizeObserver(this.selectionRef, this.resetSelectionWidth);
    this.unWrapperResizeObserver = useResizeObserver(this.wrapperRef, this.updateTooltip);
    this.unTagMenuResizeObserver = useResizeObserver(this.tagMenuRef, this.updateTagTooltip);
    this.unCollapseItemResizeObserver = useResizeObserver(this.collapseItemRef, this.resetCollapseItemWidth);
    this.unCalculatorResizeObserver = useResizeObserver(this.calculatorRef, this.resetCalculatorWidth);

    this.wrapperRef?.addEventListener('click', this.handleWrapperClick);
    this.wrapperRef?.addEventListener('focus', this.handleWrapperFocus);
    this.wrapperRef?.addEventListener('blur', this.handleWrapperBlur);

    this.context!.value.selectRef = this.selectRef;
  }

  componentWillRender() {
    this.tagLabelRefs = [];
    this.collapseTagLabelRefs = [];
  }

  disconnectedCallback() {
    if (!hasRawParent(this.el)) {
      selectContexts.delete(this.el);
      this.context = undefined;
    }

    this.unCalculatorResizeObserver?.();
    this.unSelectResizeObserver?.();
    this.unWrapperResizeObserver?.();
    this.unTagMenuResizeObserver?.();
    this.unCollapseItemResizeObserver?.();
    this.unSelectionResizeObserver?.();
  }

  render() {
    const { t } = state.i18n;

    const gapWidth = this.getGapWidth();
    const inputSlotWidth = this.filterable ? gapWidth + MINIMUM_INPUT_WIDTH : 0;
    const maxWidth = this.collapseItemRef && this.maxCollapseTags === 1
      ? this.selectionWidth - this.collapseItemWidth - gapWidth - inputSlotWidth
      : this.selectionWidth - inputSlotWidth;

    const tagStyle = { maxWidth: `${maxWidth}px` };
    const collapseTagStyle = { maxWidth: `${this.selectionWidth}px` };
    const inputStyle = { minWidth: `${Math.max(this.calculatorWidth, MINIMUM_INPUT_WIDTH)}px` };

    const hasValue = this.multiple
        ? Array.isArray(this.value) && this.value.length > 0
        : !this.isEmptyValue(this.value);

    const currentPlaceholder = this.multiple || !hasValue
      ? (this.placeholder ?? t('select.placeholder'))
      : this.selectedLabel;

    const iconComponent = this.remote && this.filterable && !this.remoteShowSuffix
      ? ''
      : this.suffixIcon;

    const iconReverse = iconComponent && ns.is('reverse', this.expanded);

    const showClearBtn = this.clearable &&
      !this.selectDisabled &&
      hasValue &&
      (this.isFocused || this.inputHovering);

    const needStatusIcon = this.formContext?.value.statusIcon ?? false;

    const validateState = this.formItemContext?.value.validateState || '';

    const validateIcon = validateState ? ValidateComponentsMap[validateState] : undefined;

    let emptyText = '';
    if (this.loading) {
      emptyText = this.loadingText || t('select.loading');
    } else {
      if (
        this.filterable &&
        this.inputValue &&
        this.optionElements.length > 0 &&
        this.filteredOptionsCount === 0
      ) {
        emptyText = this.noMatchText || t('select.noMatch');
      }
      if (this.optionElements.length === 0) {
        emptyText = this.noDataText || t('select.noData');
      }
    }

    const hasExistingOption = this.optionsArray
      .filter((opt) => !opt.created)
      .some((opt) => {
        const currentLabel = opt.label ?? isObject(opt.value) ? '' : opt.value;
        return currentLabel === this.inputValue
      });

    const showNewOption = this.filterable
      && this.allowCreate
      && this.inputValue !== ''
      && !hasExistingOption;

    return (
      <div
        ref={(el) => (this.selectRef = el!)}
        class={classNames(
          ns.b(),
          ns.m(this.selectSize)
        )}
        onMouseEnter={this.handleSelectMouseEnter}
        onMouseLeave={this.handleSelectMouseLeave}
      >
        <zane-tippy
          ref={(el) => (this.tooltipRef = el)}
          placement={this.placement}
          theme={this.popperTheme}
          popperOptions={this.popperOptions}
          appendTo={this.appendTo}
          arrow={this.showArrow}
          offset={this.offset}
          interactive={true}
          trigger="manual"
          maxWidth={''}
          boxClass={this.popperBoxClass || ns.b('tippy-box')}
          contentClass={this.popperContentClass || ns.b('tippy-content')}
          onClickOutside={this.handleClickOutside}
          onZShow={this.handleMenuEnter}
          onZHide={() => this.isBeforeHide = false}
        >
          <div
            ref={(el) => (this.wrapperRef = el)}
            class={classNames(
              ns.e('wrapper'),
              ns.is('focused', this.isFocused),
              ns.is('hovering', this.inputHovering),
              ns.is('filterable', this.filterable),
              ns.is('disabled', this.selectDisabled),
            )}
            onClick={this.handleClick}
          >
            {
              this.hasPrefixSlot && (<div
                class={ns.e('prefix')}
              >
                <slot name="prefix"></slot>
              </div>)
            }
            <div
              ref={(el) => (this.selectionRef = el)}
              class={classNames(
                ns.e('selection'),
                ns.is(
                  'near',
                  this.multiple && !this.hasPrefixSlot && !!this.selected.length
                )
              )}
            >
              {
                this.multiple && (this.tagRender ? this.handleTagRender() : (<Fragment>
                  {
                    this.showTagList.map((tag, index) => (<div
                      key={this.getValueKey(tag)}
                      class={ns.e('selected-item')}
                    >
                      <zane-tag
                        closeable={!this.selectDisabled && !tag.isDisabled}
                        size={this.collapseTagSize}
                        type={this.tagType}
                        effect={this.tagEffect}
                        style={tagStyle}
                        onZClose={(e) => this.deleteTag(e.detail, tag)}
                      >
                        <span
                          ref={(el) => this.tagLabelRefs[index] = el!}
                          class={ns.e('tags-text')}
                        >
                          {
                            this.tagLabelRender
                              ? this.handleTagLabelRender(
                                tag.currentLabel,
                                tag.value,
                                index
                              )
                              : tag.currentLabel
                          }
                        </span>
                      </zane-tag>
                    </div>))
                  }
                  {
                    (this.collapseTags && this.selected.length > this.maxCollapseTags) && (
                      <zane-tippy
                        ref={(el) => (this.tagTooltipRef = el)}
                        disabled={this.dropdownMenuVisible || !this.collapseTagsTooltip}
                        theme={this.tagTooltip?.theme ?? this.popperTheme}
                        placement={this.tagTooltip?.placement ?? this.placement}
                        appendTo={this.tagTooltip?.appendTo ?? this.appendTo}
                        popperOptions={this.tagTooltip?.popperOptions ?? this.popperOptions}
                        offset={this.tagTooltip?.offset}
                        onZShow={this.tagTooltip?.onShow}
                        onZHide={this.tagTooltip?.onHide}
                        interactive={true}
                        arrow={false}
                        boxClass={this.popperBoxClass || ns.b('tippy-box')}
                        contentClass={this.popperContentClass || ns.b('tippy-content')}
                      >
                        <div
                          ref={(el) => this.collapseItemRef = el}
                          class={ns.e('selected-item')}
                        >
                          <zane-tag
                            closeable={false}
                            size={this.collapseTagSize}
                            type={this.tagType}
                            effect={this.tagEffect}
                            style={collapseTagStyle}
                          >
                            + { this.value.length - this.maxCollapseTags }
                          </zane-tag>
                        </div>
                        <div slot='content'>
                          <div
                            ref={(el) => this.tagMenuRef = el}
                            class={ns.e('selection')}
                          >
                            {
                              this.collapseTagList.map((tag, index) => (
                                <div
                                  key={this.getValueKey(tag)}
                                  class={ns.e('selected-item')}
                                >
                                  <zane-tag
                                    class="in-tooltip"
                                    closeable={!this.selectDisabled && !tag.isDisabled}
                                    size={this.collapseTagSize}
                                    type={this.tagType}
                                    effect={this.tagEffect}
                                    onZClose={(e) => this.deleteTag(e.detail, tag)}
                                  >
                                    <span
                                      ref={(el) => this.collapseTagLabelRefs[index] = el!}
                                      class={ns.e('tags-text')}
                                    >
                                      {
                                        this.tagLabelRender
                                          ? this.handleCollapseTagLabelRender(
                                              tag.currentLabel,
                                              tag.value,
                                              index
                                            )
                                          : tag.currentLabel
                                      }
                                    </span>
                                  </zane-tag>
                                </div>
                              ))
                            }
                          </div>
                        </div>
                      </zane-tippy>
                    )
                  }
                </Fragment>))
              }
              <div
                class={classNames(
                  ns.e('selected-item'),
                  ns.e('input-wrapper'),
                  ns.is(
                    'hidden',
                    !this.filterable ||
                      this.selectDisabled ||
                      (!this.inputValue && !this.isFocused)
                  )
                )}
              >
                <input
                  id={this.inputId}
                  ref={(el) => this.inputRef = el}
                  type='text'
                  name={this.name}
                  class={classNames(
                    ns.e('input'),
                    ns.is(this.selectSize!),
                  )}
                  disabled={this.selectDisabled}
                  autoComplete={this.autocomplete}
                  style={inputStyle}
                  tabIndex={this.zTabIndex}
                  value={this.inputValue}
                  role='combobox'
                  readOnly={!this.filterable}
                  spellcheck={false}
                  ariaActivedescendant={this.hoverOption?.id || ''}
                  ariaControls={this.contentId}
                  ariaExpanded={this.dropdownMenuVisible}
                  ariaLabel={this.ariaLabel}
                  ariaAutocomplete='none'
                  ariaHaspopup='listbox'
                  onKeyDown={this.handleKeyDown}
                  onCompositionstart={this.handleCompositionStart}
                  onCompositionupdate={this.handleCompositionUpdate}
                  onCompositionend={this.handleCompositionEnd}
                  onInput={this.handleInput}
                  onChange={(e) => e.stopPropagation()}
                  onClick={this.handleClick}
                  onFocus={this.handleFocus}
                  onBlur={this.handleBlur}
                />
                {
                  this.filterable && (
                    <span
                      ref={(el) => this.calculatorRef = el}
                      ariaHidden="true"
                      class={ns.e('input-calculator')}
                    >
                      {this.inputValue}
                    </span>
                  )
                }
              </div>
              {
                this.shouldShowPlaceholder && (<div
                  class={classNames(
                    ns.e('selected-item'),
                    ns.e('placeholder'),
                    ns.is('transparent', !hasValue || (this.expanded && !this.inputValue)),
                  )}
                >
                  {currentPlaceholder}
                </div>)
              }
            </div>
            <div
              ref={(el) => this.suffixRef = el}
              class={ns.e('suffix')}
            >
              {
                (iconComponent && !showClearBtn) && (
                  <zane-icon
                    class={classNames(
                      ns.e('caret'),
                      nsInput.e('icon'),
                      iconReverse,
                    )}
                    name={iconComponent}
                  ></zane-icon>
                )
              }
              {
                (showClearBtn && this.clearIcon) && (
                  <zane-icon
                    class={classNames(
                      ns.e('caret'),
                      ns.e('icon'),
                      ns.e('clear')
                    )}
                    onClick={this.handleClearClick}
                    name={this.clearIcon}
                  ></zane-icon>
                )
              }
              {
                (validateState && validateIcon && needStatusIcon) && (
                  <zane-icon
                    class={classNames(
                      nsInput.e('icon'),
                      nsInput.e('validateIcon'),
                      nsInput.is('loading', validateState === 'validating')
                    )}
                    name={validateIcon}
                  ></zane-icon>
                )
              }
            </div>
          </div>
          <div slot='content'>
            <zane-select-dropdown ref={(el) => (this.menuRef = el)}>
              {
                this.hasHeaderSlot && (<div
                  class={ns.be('dropdown', 'header')}
                  onClick={(e) => e.stopPropagation()}
                >
                  <slot name='header'></slot>
                </div>)
              }
              <zane-scrollbar
                id={this.contentId}
                ref={(el) => (this.scrollbarRef = el)}
                tag="ul"
                role="listbox"
                wrapClass={ns.be('dropdown', 'wrap')}
                viewClass={ns.be('dropdown', 'list')}
                class={ns.is('empty', this.filteredOptionsCount === 0)}
                ariaLabel={this.ariaLabel}
                ariaOrientation="vertical"
                style={{
                  display: (this.optionElements.length > 0 && !this.loading) ? undefined : 'none'
                }}
                onZScroll={this.popupScroll}
              >
                {
                  showNewOption && (
                    <zane-select-option
                      value={this.inputValue}
                      created={true}
                    ></zane-select-option>
                  )
                }
                <zane-select-options>
                  <slot>
                    {
                      this.options?.map((option) => this.getOptions(option)?.length
                        ? (
                          <zane-select-option-group
                            label={this.getLabel(option)}
                            disabled={this.getDisabled(option)}
                          >
                            {
                              this.getOptions(option).map((item: any) => (
                                <zane-select-option
                                  {
                                    ...this.getOptionProps(item)
                                  }
                                ></zane-select-option>
                              ))
                            }
                          </zane-select-option-group>)
                        : (
                          <zane-select-option
                            { ...this.getOptionProps(option) }
                          ></zane-select-option>
                        )
                      )
                    }
                  </slot>
                </zane-select-options>
              </zane-scrollbar>
              {
                (this.hasLoadingSlot && this.loading)
                  ? (
                      <div class={ns.be('dropdown', 'loading')}>
                        <slot name='loading'></slot>
                      </div>
                    )
                  : (this.loading || this.filteredOptionsCount === 0)
                    ? (
                      <div class={ns.be('dropdown', 'empty')}>
                        <slot name='empty'>
                          <span>{ emptyText }</span>
                        </slot>
                      </div>
                    )
                    : null
              }
              {
                this.hasFooterSlot && (<div
                  class={ns.be('dropdown', 'footer')}
                  onClick={(e) => e.stopPropagation()}
                >
                  <slot name='footer'></slot>
                </div>)
              }
            </zane-select-dropdown>
          </div>
        </zane-tippy>
      </div>
    );
  }
}
