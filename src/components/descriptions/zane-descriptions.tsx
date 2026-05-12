import { Component, Element, h, Prop, State, Watch } from '@stencil/core';
import type { ComponentSize } from '../../types';
import { ReactiveObject } from '../../utils/reactive/ReactiveObject';
import type { FormContext, FormItemContext } from '../form/types';
import type { ConfigProviderContext } from '../config-provider/types';
import { getConfigProviderContext } from '../config-provider/utils';
import { getFormContext, getFormItemContext } from '../form/utils';
import type { DescriptionsContext } from './types';
import { descriptionsContexts } from './constants';
import { hasRawParent } from '../../utils/dom/element/hasRawParent';
import { useNamespace } from '../../hooks/useNamespace';
import classNames from 'classnames';
import { addUnit } from '../../utils';
import { isNil } from 'lodash-es';

const ns = useNamespace('descriptions');

@Component({
  tag: 'zane-descriptions',
  styleUrl: 'zane-descriptions.scss'
})
export class ZaneDescriptions {
  @Element() el!: HTMLElement;

  @Prop() border: boolean = false;

  @Prop() column: number = 3;

  @Prop() direction: 'horizontal' | 'vertical' = 'horizontal';

  @Prop() size?: ComponentSize;

  @Prop({ attribute: 'title' }) zTitle: string = '';

  @Prop() extra: string = '';

  @Prop() labelWidth?: string | number;

  @State() descriptionsSize?: ComponentSize;

  private formContext?: ReactiveObject<FormContext>;

  private formItemContext?: ReactiveObject<FormItemContext>;

  private configProviderContext?: ReactiveObject<ConfigProviderContext>;

  private context?: ReactiveObject<DescriptionsContext>;

  private hasTitleSlot: boolean = false;

  private hasExtraSlot: boolean = false;

  @Watch('size')
  handleUpdateDescriptionsSize() {
    this.descriptionsSize = this.size ||
      this.formItemContext?.value.size ||
      this.formContext?.value.size ||
      this.configProviderContext?.value.size ||
      "";
  }

  private filledNode = (node: HTMLZaneDescriptionsItemElement, span: number, count: number, isLast = false) => {
    if (span > count) {
      node.span = count;
    }
    if (isLast) {
      node.span = span;
    }
    return node;
  }

  private getRows = () => {
    const children = Array.from(this.el.querySelectorAll('zane-descriptions-item')) as HTMLZaneDescriptionsItemElement[];
    const rows: HTMLZaneDescriptionsItemElement[][] = [];
    const rowspanTemp: number[] = [];

    let temp: HTMLZaneDescriptionsItemElement[] = [];
    let count = this.column;
    let totalSpan = 0;

    children.forEach((node, index) => {
      const span = node.span || 1;
      const rowspan = node.rowspan || 1;
      const rowNo = rows.length;
      rowspanTemp[rowNo] ||= 0;

      if (rowspan > 1) {
        for (let i = 1; i < rowspan; i++) {
          rowspanTemp[rowNo + i] ||= 0;
          rowspanTemp[rowNo + i]++;
          totalSpan++;
        }
      }

      if (rowspanTemp[rowNo] > 0) {
        count -= rowspanTemp[rowNo];
        rowspanTemp[rowNo] = 0;
      }

      if (index < children.length - 1) {
        totalSpan += (span > count ? count : span);
      }

      if (index === children.length - 1) {
        const lastSpan = this.column - (totalSpan % this.column);
        temp.push(this.filledNode(node, lastSpan, count, true));
        rows.push(temp);
        return;
      }

      if (span < count) {
        count -= span;
        temp.push(node);
      } else {
        temp.push(this.filledNode(node, span, count));
        rows.push(temp);
        count = this.column;
        temp = [];
      }
    });

    return rows;
  }

  componentWillLoad() {
    this.configProviderContext = getConfigProviderContext(this.el);
    this.formContext = getFormContext(this.el);
    this.formItemContext = getFormItemContext(this.el);

    this.hasTitleSlot = !!this.el.querySelector('[slot="title"]');
    this.hasExtraSlot = !!this.el.querySelector('[slot="extra"]');

    this.context = new ReactiveObject({
      column: this.column,
      direction: this.direction,
      title: this.zTitle,
      extra: this.extra,
      border: this.border,
    });

    descriptionsContexts.set(this.el, this.context);

    this.handleUpdateDescriptionsSize();
  }

  disconnectedCallback() {
    if (!hasRawParent(this.el)) {
      descriptionsContexts.delete(this.el);
      this.context = undefined;
    }
  }
  
  render() {
    return (
      <div class={classNames(ns.b(), ns.m(this.descriptionsSize))}>
        {
          (this.zTitle || this.extra || this.hasTitleSlot || this.hasExtraSlot) && (
            <div class={ns.e('header')}>
              <div class={ns.e('title')}>
                <slot name="title">{ this.zTitle }</slot>
              </div>
              <div class={ns.e('extra')}>
                <slot name="extra">{ this.extra }</slot>
              </div>
            </div>
          )
        }
        <div class={ns.e('body')}>
          <table class={classNames(ns.e('table'), ns.is('bordered', this.border))}>
            <tbody>
              {
                this.getRows().map((row) => {
                  if (this.direction === 'vertical') {
                    return [
                      <tr>
                        {
                          row.map((cell) => (
                            <th
                              colSpan={cell.span}
                              rowSpan={1}
                              style={{
                                width: addUnit(cell.labelWidth ?? this.labelWidth ?? cell.width),
                                minWidth: addUnit(cell.minWidth)
                              }}
                              class={classNames(
                                ns.e('cell'),
                                ns.e('label'),
                                ns.is('bordered-label', this.border),
                                ns.is('vertical-label', this.direction === 'vertical'),
                                cell.labelAlign ? `is-${cell.labelAlign}` : cell.align ? `is-${cell.align}` : '',
                                cell.labelClassName,
                              )}
                            >
                              { cell.label }
                            </th>
                          ))
                        }
                      </tr>,
                      <tr>
                        {
                          row.map((cell) => (
                            <td
                              colSpan={cell.span}
                              rowSpan={cell.rowspan * 2 - 1}
                              style={{
                                width: addUnit(cell.width),
                                minWidth: addUnit(cell.minWidth)
                              }}
                              class={classNames(
                                ns.e('cell'),
                                ns.e('content'),
                                ns.is('bordered-content', this.border),
                                ns.is('vertical-content', this.direction === 'vertical'),
                                cell.align ? `is-${cell.align}` : '',
                                cell.contentClassName,
                              )}
                              innerHTML={cell.innerHTML}
                            >
                            </td>
                          ))
                        }
                      </tr>
                    ]
                  } else {
                    <tr>
                      {
                        row.map((cell) => {
                          if (this.border) {
                            return [
                              <td
                                colSpan={1}
                                rowSpan={cell.rowspan}
                                style={{
                                  width: addUnit(cell.labelWidth ?? this.labelWidth ?? cell.width),
                                  minWidth: addUnit(cell.minWidth)
                                }}
                                class={classNames(
                                  ns.e('cell'),
                                  ns.e('label'),
                                  ns.is('bordered-label', this.border),
                                  ns.is('vertical-label', this.direction === 'vertical'),
                                  cell.labelAlign ? `is-${cell.labelAlign}` : cell.align ? `is-${cell.align}` : '',
                                  cell.labelClassName,
                                )}
                              >
                                { cell.label }
                              </td>,
                              <td
                                colSpan={cell.span * 2 - 1}
                                rowSpan={cell.rowspan}
                                style={{
                                  width: addUnit(cell.width),
                                  minWidth: addUnit(cell.minWidth)
                                }}
                                class={classNames(
                                  ns.e('cell'),
                                  ns.e('content'),
                                  ns.is('bordered-content', this.border),
                                  ns.is('vertical-content', this.direction === 'vertical'),
                                  cell.align ? `is-${cell.align}` : '',
                                  cell.contentClassName,
                                )}
                                innerHTML={cell.innerHTML}
                              >
                              </td>
                            ];
                          } else {
                            return (
                              <td
                                colSpan={cell.span}
                                rowSpan={cell.rowspan}
                                style={{
                                  width: addUnit(cell.width),
                                  minWidth: addUnit(cell.minWidth)
                                }}
                                class={classNames(ns.e('cell'), cell.align ? `is-${cell.align}` : '')}
                              >
                                {
                                  !isNil(cell.label) && (
                                    <span
                                      style={{
                                        width: addUnit(cell.labelWidth ?? this.labelWidth),
                                        display: 'inline-block',
                                      }}
                                      class={classNames(ns.e('label'), cell.labelClassName)}
                                    >
                                      { cell.label }
                                    </span>
                                  )
                                }
                                <span
                                  class={classNames(ns.e('content'), cell.contentClassName)}
                                  innerHTML={cell.innerHTML}
                                >
                                </span>
                              </td>
                            );
                          }
                        })
                      }
                    </tr>
                  }
                })
              }
            </tbody>
          </table>
        </div>
        <div style={{ display: 'none' }}><slot></slot></div>
      </div>
    );
  }
}
