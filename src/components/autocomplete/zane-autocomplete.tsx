import type { EventEmitter } from '@stencil/core';

import type { AnyNormalFunction, ComponentSize } from '../../types';
import type {
  AutocompleteData,
  AutocompleteFetchFunc,
  AutocompleteFetchSuggestions,
} from './types';

import {
  Component,
  Element,
  Event,
  h,
  Host,
  Method,
  Prop,
  State,
} from '@stencil/core';

import { EVENT_CODE } from '../../constants';
import { useNamespace } from '../../hooks';
import { mutable } from '../../types';
import {
  buildUUID,
  getEventCode,
  nextFrame,
  NOOP,
  throwError,
  type ReactiveObject,
} from '../../utils';
import { debounce, isArray } from 'lodash-es';
import type { FormContext } from '../form/types';
import { getFormContext } from '../form/utils';

const ns = useNamespace('autocomplete');

const SCOPE = 'zane-autocomplete';

@Component({
  styleUrl: 'zane-autocomplete.scss',
  tag: 'zane-autocomplete',
})
export class ZaneComplete {

  @Prop() ariaLabel: string | undefined;

  @Prop() autosize: boolean | { maxRows?: number; minRows?: number } = false;

  @Event({ eventName: 'zBlur', bubbles: false })
  blurEvent: EventEmitter<FocusEvent> | undefined;

  @Event({ eventName: 'zChange', bubbles: false })
  changeEvent: EventEmitter<number | string> | undefined;

  @Prop() clearable: boolean | undefined;

  @Event({ eventName: 'zClear', bubbles: false })
  clearEvent: EventEmitter<void> | undefined;

  @Prop() clearIcon: string = 'close-circle-line';

  @Prop() debounce: number = 300;

  @Prop() disabled: boolean | undefined = undefined;

  @State() dropdownWidth: string = '';

  @Element() el: HTMLElement | undefined;

  @Prop()
  fetchSuggestions: AutocompleteFetchSuggestions = NOOP;

  @Prop() fitInputWidth: boolean | undefined;

  @Event({ eventName: 'zFocus', bubbles: false })
  focusEvent: EventEmitter<FocusEvent> | undefined;

  @Prop() form: string | undefined;

  @Prop() formatter: AnyNormalFunction<any, string> | undefined;

  @Prop() hideLoading: boolean | undefined;

  @State() highlightedIndex: number = -1;

  @Prop() highlightFirstItem: boolean | undefined;

  @Event({ eventName: 'zInput', bubbles: false })
  inputEvent: EventEmitter<string> | undefined;

  @Prop() inputStyle: Record<string, string> | string = mutable({} as const);

  @State() loading: boolean = false;

  @Prop() loadingRender: (() => HTMLElement) | undefined;

  @Prop() loopNavigation: boolean = true;

  @Prop() max: number | undefined;

  @Prop() maxLength: number | string | undefined;

  @Prop() min: number | undefined;

  @Prop() minLength: number | string | undefined;

  @Prop() name: string | undefined;

  @Prop() parser: AnyNormalFunction<any, any> | undefined;

  @Prop() placeholder: string | undefined;

  @Prop() placement: 'bottom-start' | 'top-start' = 'bottom-start';

  @Prop() popperTheme: string = 'autocomplete';

  @Prop() prefixIcon: string | undefined;

  @Prop() resize: 'both' | 'horizontal' | 'none' | 'vertical' | undefined;

  @Prop() rows: number = 2;

  @Event({ eventName: 'zSelect', bubbles: false })
  selectEvent: EventEmitter<number | string | null | undefined> | undefined;

  @Prop() selectWhenUnmatched: boolean | undefined;

  @Prop() showPassword: boolean | undefined;

  @Prop() showWordLimit: boolean | undefined;

  @Prop() size: ComponentSize | undefined;

  @Prop() step: number | undefined;

  @Prop() suffixIcon: string | undefined;

  @State() suggestionDisabled: boolean = false;

  @Prop() suggestionRender: ((item: any) => HTMLElement) | undefined;

  @State() suggestions: AutocompleteData = [];

  @Prop({ reflect: true }) triggerOnFocus: boolean = true;

  @Prop() type: string = 'text';

  @Prop() validateEvent: boolean = true;

  @Prop({ mutable: true }) value: null | number | string | undefined = '';

  @Prop() valueKey: string = 'value';

  @Prop() wordLimitPosition: 'inside' | 'outside' = 'inside';

  @Prop({ attribute: 'inputmode' }) zInputMode:
    'decimal' |
    'email' |
    'none' |
    'numeric' |
    'search' |
    'tel' |
    'text' |
    'url' | undefined;

  @Prop({ attribute: 'tabindex' }) zTabindex: number | string = 0;

  private formContext: ReactiveObject<FormContext> | undefined | null;

  private debouncedGetData = debounce(this.getData, this.debounce);

  private ignoreFocusEvent: boolean = false;

  private inputRef: HTMLZaneInputElement | undefined;

  private listboxId = buildUUID();

  private popperRef: HTMLZaneTippyElement | undefined;

  private readonly: boolean = false;

  private regionRef: HTMLElement | undefined;

  private hasFooter: boolean = false;

  private hasHeader: boolean = false;

  private hasAppend: boolean | undefined;

  private hasPrefix: boolean | undefined;

  private hasPrepend: boolean | undefined;

  private hasSuffix: boolean | undefined;

  @Method()
  async close() {
    this.popperRef?.hide();
  }

  componentWillLoad() {
    // console.log(this.fetchSuggestions);
    this.hasFooter = !!this.el?.querySelector('[slot="footer"]');
    this.hasHeader = !!this.el?.querySelector('[slot="header"]');
    this.hasAppend = !!this.el?.querySelector('[slot="append"]');
    this.hasPrefix = !!this.el?.querySelector('[slot="prefix"]');
    this.hasPrepend = !!this.el?.querySelector('[slot="prepend"]');
    this.hasSuffix = !!this.el?.querySelector('[slot="suffix"]');

    this.formContext = getFormContext(this.el!);
  }

  @Method()
  async getData(queryString: string) {
    if (this.suggestionDisabled) {
      return;
    }

    const cb = (suggestionList: AutocompleteData) => {
      this.loading = false;
      if (this.suggestionDisabled) return;

      if (isArray(suggestionList)) {
        this.suggestions = suggestionList;
        this.highlightedIndex = this.highlightFirstItem ? 0 : -1;
      } else {
        throwError(SCOPE, 'autocomplete suggestions must be an array');
      }
    };

    this.loading = true;
    if (isArray(this.fetchSuggestions)) {
      cb(this.fetchSuggestions as AutocompleteData);
    } else {
      const result = await (this.fetchSuggestions as AutocompleteFetchFunc)(
        queryString,
        cb,
      );
      if (isArray(result)) cb(result!);
    }
  }

  @Method()
  async handleKeyEnter() {
    if (this.inputRef?.isComposing) {
      return;
    }

    if (
      this.highlightedIndex >= 0 &&
      this.highlightedIndex < this.suggestions.length
    ) {
      this.handleSelect(this.suggestions[this.highlightedIndex]);
    } else {
      if (this.selectWhenUnmatched) {
        this.selectEvent?.emit(this.value);
        this.suggestions = [];
        this.highlightedIndex = -1;
      }
      this.debouncedGetData(String(this.value));
    }
  }

  @Method()
  async handleSelect(item: any) {
    this.inputEvent?.emit(item[this.valueKey]);
    this.value = item[this.valueKey];
    this.selectEvent?.emit(item);
    this.suggestions = [];
    this.highlightedIndex = -1;
    this.popperRef?.hide();
  }

  @Method()
  async highlight(index: number) {
    if (this.loading) return;

    if (index < 0) {
      if (!this.loopNavigation) {
        this.highlightedIndex = -1;
        return;
      }
      index = this.suggestions.length - 1;
    }

    if (index >= this.suggestions.length) {
      index = this.loopNavigation ? 0 : this.suggestions.length - 1;
    }
    const [suggestion, suggestionList] = this.getSuggestionContext();
    const highlightItem = suggestionList?.[index];
    const scrollTop = suggestion?.scrollTop ?? 0;
    const { offsetTop = 0, scrollHeight = 0 } = highlightItem ?? {};

    if (offsetTop + scrollHeight > scrollTop + suggestion!.clientHeight) {
      suggestion!.scrollTop = offsetTop + scrollHeight - suggestion!.clientHeight;
    }
    if (offsetTop < scrollTop) {
      suggestion!.scrollTop = offsetTop;
    }
    this.highlightedIndex = index;
    this.inputRef?.setAttribute(
      'aria-activedescendant',
      `${this.listboxId}-item-${this.highlightedIndex}`,
    );
  }

  @Method()
  async inputBlur() {
    this.inputRef?.blur();
  }

  @Method()
  async inputFocus() {
    this.inputRef?.focus();
  }

  render() {
    return (
      <Host>
        <zane-tippy
          appendTo={document.body}
          arrow={false}
          hideOnClick={false}
          interactive={true}
          maxWidth={this.dropdownWidth}
          boxClass={ns.b('tippy-box')}
          contentClass={ns.b('tippy-content')}
          onClickOutside={this.handleClickOutside}
          onZHide={this.handleHide}
          onZShow={this.handleShow}
          placement={this.placement}
          ref={(el) => (this.popperRef = el)}
          role="listbox"
          theme={this.popperTheme}
          trigger="manual"
        >
          <div
            class={{
              [ns.b()]: true,
              [ns.is('loading', !this.hideLoading && this.loading)]: true,
              [this.el?.className!]: true,
            }}
            style={{
              outline: 'none',
              [this.fitInputWidth ? 'width' : 'minWidth']: this.dropdownWidth,
            }}
          >
            <zane-input
              ariaLabel={this.ariaLabel}
              autosize={this.autosize}
              clearable={this.clearable}
              clearIcon={this.clearIcon}
              disabled={this.getInputDisabled()}
              form={this.form}
              formatter={this.formatter}
              inputStyle={this.inputStyle}
              max={this.max}
              maxLength={this.maxLength}
              min={this.min}
              minLength={this.minLength}
              name={this.name}
              onKeyDown={this.handleKeydown}
              onZBlur={this.handleBlur}
              onZChange={this.handleChange}
              onZClear={this.handleClear}
              onZFocus={this.handleFocus}
              onZInput={this.handleInput}
              parser={this.parser}
              placeholder={this.placeholder}
              prefixIcon={this.prefixIcon}
              readonly={this.readonly}
              ref={(el) => (this.inputRef = el)}
              resize={this.resize}
              rows={this.rows}
              showPassword={this.showPassword}
              showWordLimit={this.showWordLimit}
              size={this.size}
              step={this.step}
              suffixIcon={this.suffixIcon}
              type={this.type}
              validateEvent={this.validateEvent}
              value={this.value}
              wordLimitPosition={this.wordLimitPosition}
              zInputMode={this.zInputMode}
              zTabindex={this.zTabindex}
            >
              {
                this.hasPrepend && (<slot name="prepend" slot="prepend"></slot>)
              }
              {
                this.hasAppend && (<slot name="append" slot="append"></slot>)
              }
              {
                this.hasPrefix && (<slot name="prefix" slot="prefix"></slot>)
              }
              {
                this.hasSuffix && (<slot name="suffix" slot="suffix"></slot>)
              }
            </zane-input>
          </div>
          <div slot="content">
            <div
              class={{
                [ns.b('suggestion')]: true,
                [ns.is('loading', !this.hideLoading && this.loading)]: true,
              }}
              ref={(el) => (this.regionRef = el)}
              role="region"
              style={{
                outline: 'none',
                [this.fitInputWidth ? 'width' : 'minWidth']: this.dropdownWidth,
              }}
            >
              {this.hasHeader && (
                <div
                  class={ns.be('suggestion', 'header')}
                  onClick={(e) => e.stopPropagation()}
                >
                  <slot name="header" />
                </div>
              )}
              <zane-scrollbar
                id={this.listboxId}
                role="listbox"
                viewClass={ns.be('suggestion', 'list')}
                wrapClass={ns.be('suggestion', 'wrap')}
              >
                <ul>
                  {!this.hideLoading && this.loading ? (
                    <li id={`${this.listboxId}-loading`}>
                      {this.loadingRender ? (
                        this.handleLoadingRender()
                      ) : (
                        <zane-icon
                          class={ns.is('loading')}
                          name="loader-2-line"
                          spin={true}
                        ></zane-icon>
                      )}
                    </li>
                  ) : (
                    this.handleSuggestionsRender(this.suggestions)
                  )}
                </ul>
              </zane-scrollbar>
              {this.hasFooter && (
                <div
                  class={ns.be('suggestion', 'footer')}
                  onClick={(e) => e.stopPropagation()}
                >
                  <slot name="footer" />
                </div>
              )}
            </div>
          </div>
        </zane-tippy>
      </Host>
    );
  }

  private getInputDisabled() {
    return this.disabled ?? this.formContext?.value.disabled ?? false;
  }

  private getSuggestionContext = () => {
    const suggestion = this.regionRef?.querySelector(
      `.${ns.be('suggestion', 'wrap')}`,
    );
    const suggestionList = suggestion?.querySelectorAll<HTMLElement>(
      `.${ns.be('suggestion', 'list')} li`,
    );
    return [suggestion, suggestionList] as const;
  };

  private handleBlur = (e: CustomEvent<FocusEvent>) => {
    nextFrame(() => {
      this.blurEvent?.emit(e.detail);
    });
  };

  private handleChange = (e: CustomEvent<number | string>) => {
    this.changeEvent?.emit(e.detail);
  };

  private handleClear = () => {
    this.value = '';
    this.changeEvent?.emit('');
    this.clearEvent?.emit();
  };

  private handleClickOutside = () => {
    this.popperRef?.hide();
  };

  private handleFocus = (e: CustomEvent<FocusEvent>) => {
    if (this.ignoreFocusEvent) {
      this.ignoreFocusEvent = false;
    } else {
      this.focusEvent?.emit(e.detail);

      const queryString = this.value ?? '';
      if (this.triggerOnFocus && !this.readonly) {
        this.suggestions = [];
        this.popperRef?.show();
        this.debouncedGetData(String(queryString));
      }
    }
  };

  private handleHide = () => {
    this.highlightedIndex = -1;
  };

  private handleInput = (e: CustomEvent<string>) => {
    const value = e.detail;

    this.inputEvent?.emit(value);

    this.suggestionDisabled = false;

    if (!this.triggerOnFocus && !value) {
      this.suggestionDisabled = true;
      this.suggestions = [];
      return;
    }

    this.popperRef?.isVisible().then((v) => {
      if (!v) {
        this.popperRef?.show();
      }
    });
    this.debouncedGetData(value);
  };

  private handleKeydown = (e: Event | KeyboardEvent) => {
    const code = getEventCode(e as KeyboardEvent);
    switch (code) {
      case EVENT_CODE.down: {
        e.preventDefault();
        this.highlight(this.highlightedIndex + 1);
        break;
      }
      case EVENT_CODE.end: {
        e.preventDefault();
        this.highlight(this.suggestions.length - 1);
        break;
      }
      case EVENT_CODE.enter:
      case EVENT_CODE.numpadEnter: {
        e.preventDefault();
        this.handleKeyEnter();
        break;
      }
      case EVENT_CODE.esc: {
        this.handleKeyEscape(e);
        break;
      }
      case EVENT_CODE.home: {
        e.preventDefault();
        this.highlight(0);
        break;
      }
      case EVENT_CODE.pageDown: {
        e.preventDefault();
        this.highlight(
          Math.min(this.suggestions.length - 1, this.highlightedIndex + 10),
        );
        break;
      }
      case EVENT_CODE.pageUp: {
        e.preventDefault();
        this.highlight(Math.max(0, this.highlightedIndex - 10));
        break;
      }
      case EVENT_CODE.tab: {
        this.close();
        break;
      }
      case EVENT_CODE.up: {
        e.preventDefault();
        this.highlight(this.highlightedIndex - 1);
        break;
      }
    }
  };

  private handleKeyEscape = (evt: Event) => {
    evt.preventDefault();
    evt.stopPropagation();
    this.popperRef?.hide();
  };

  private handleLoadingRender = () => {
    nextFrame(() => {
      const loadingChildEl = this.loadingRender?.();
      const loadingEL = document.querySelector(
        `[id="${this.listboxId}-loading"]`,
      );
      if (loadingEL && loadingChildEl) {
        loadingEL.innerHTML = loadingChildEl.innerHTML;
      }
    });
  };

  private handleShow = () => {
    this.dropdownWidth = `${this.inputRef?.offsetWidth ?? 0}px`;
  };

  private handleSuggestionItemRender = (
    item: Record<string, any>,
    index: number,
  ) => {
    nextFrame(() => {
      const suggestionEL = this.suggestionRender?.(item);
      const itemEL = document.querySelector(
        `[id="${this.listboxId}-item-${index}"]`,
      );
      if (itemEL && suggestionEL) {
        itemEL.append(suggestionEL);
      }
    });
  };

  private handleSuggestionsRender(suggestions: AutocompleteData) {
    return suggestions.map((item, index) => (
      <li
        aria-selected={this.highlightedIndex === index}
        class={{
          highlighted: this.highlightedIndex === index,
        }}
        id={`${this.listboxId}-item-${index}`}
        key={`${this.listboxId}-item-${index}`}
        onClick={() => this.handleSelect(item)}
        role="option"
      >
        {this.suggestionRender
          ? this.handleSuggestionItemRender(item, index)
          : item[this.valueKey]}
      </li>
    ));
  }
}
