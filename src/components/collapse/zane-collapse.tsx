import type {
  CollapseActiveName,
  CollapseContext,
  CollapseIconPositionType,
  CollapseModelValue,
} from './types';

import {
  Component,
  Element,
  Event,
  EventEmitter,
  h,
  Host,
  Method,
  Prop,
  State,
  Watch,
} from '@stencil/core';

import { collapseContexts } from './constants';
import { useNamespace } from '../../hooks';
import {
  debugWarn,
  isBoolean,
  isPromise,
  throwError,
  ReactiveObject,
  hasRawParent,
} from '../../utils';
import type { Awaitable } from '../../types';
import { castArray} from 'lodash-es';
import classNames from 'classnames';

const ns = useNamespace('collapse');

const SCOPE = 'zane-collapse';

@Component({
  styleUrl: 'zane-collapse.scss',
  tag: 'zane-collapse',
})
export class ZaneCollapse {
  @Prop() accordion: boolean = false;

  @Prop() beforeCollapse?: (name: CollapseActiveName) => Awaitable<boolean>;

  @Element() el!: HTMLElement;

  @Prop() expandIconPosition: CollapseIconPositionType = 'right';

  @Prop() value: CollapseModelValue = [];

  @Event({ eventName: 'zChange', bubbles: false })
  zaneChange?: EventEmitter<(number | string)[] | number | string>;

  @Event({ eventName: 'zUpdate', bubbles: false })
  zaneUpdate?: EventEmitter<(number | string)[] | number | string>;

  @State() activeNames: (number | string)[] = [];

  private context?: ReactiveObject<CollapseContext>;

  @Method()
  async getContext() {
    return this.context;
  }

  @Method()
  async setActiveNames(_activeNames: CollapseActiveName[]) {
    this.activeNames = _activeNames;
    const value = this.accordion ? this.activeNames[0] : this.activeNames;
    this.zaneUpdate?.emit(value);
    this.zaneChange?.emit(value);

    this.context!.value.activeNames = this.activeNames;
  }

  componentWillLoad() {
    this.activeNames = castArray(this.value);

    this.context = new ReactiveObject({
      handleItemClick: this.handleItemClick,
      activeNames: this.activeNames,
    });

    collapseContexts.set(this.el, this.context);
  }

  disconnectedCallback() {
    if (!hasRawParent(this.el)) {
      collapseContexts.delete(this.el);
      this.context = undefined;
    }
  }

  handleChange = (name: CollapseActiveName) => {
    if (this.accordion) {
      this.setActiveNames([this.activeNames[0] === name ? '' : name]);
    } else {
      const _activeNames = [...this.activeNames];
      const index = _activeNames.indexOf(name);

      if (index === -1) {
        _activeNames.push(name);
      } else {
        _activeNames.splice(index, 1);
      }
      this.setActiveNames(_activeNames);
    }
  };

  handleItemClick = async (name: CollapseActiveName) => {
    if (!this.beforeCollapse) {
      this.handleChange(name);
      return;
    }

    const shouldChange = this.beforeCollapse(name);
    const isPromiseOrBool = [
      isBoolean(shouldChange),
      isPromise(shouldChange),
    ].includes(true);
    if (!isPromiseOrBool) {
      throwError(
        SCOPE,
        'beforeCollapse must return type `Promise<boolean>` or `boolean`',
      );
    }

    if (isPromise(shouldChange)) {
      shouldChange
        .then((result) => {
          if (result !== false) {
            this.handleChange(name);
          }
        })
        .catch((error) => {
          debugWarn(SCOPE, `some error occurred: ${error}`);
        });
    } else if (shouldChange) {
      this.handleChange(name);
    }
  };

  @Watch('value')
  onModelValueChange() {
    this.activeNames = castArray(this.value);
    this.context!.value.activeNames = this.activeNames;
  }

  render() {
    return (
      <Host class={classNames(ns.b(), ns.b(`icon-position-${this.expandIconPosition}`))}>
        <slot></slot>
      </Host>
    );
  }
}
