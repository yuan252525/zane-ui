import {
  Component,
  h,
  Host,
  Prop,
  Event,
  EventEmitter,
  Watch,
  State,
  Element,
} from '@stencil/core';
import type { ComponentSize } from '../../types';
import type { PaginationPageSize } from './types';
import { useNamespace } from '../../hooks';
import classNames from 'classnames';

const ns = useNamespace('pagination');

const DEFAULT_PAGE_SIZES: PaginationPageSize[] = [10, 20, 30, 40, 50, 100];
const DEFAULT_PAGE_COUNT = 7;
const DEFAULT_LAYOUT = 'prev, pager, next, jumper, ->, total';

interface PagerItem {
  type: 'page' | 'prev-more' | 'next-more';
  value: number;
  active?: boolean;
}

@Component({
  tag: 'zane-pagination',
  styleUrl: 'zane-pagination.scss',
})
export class ZanePagination {
  @Element() el!: HTMLElement;

  /** 总记录数 */
  @Prop() total?: number;

  /** 每页条数（受控） */
  @Prop() pageSize?: number;

  /** 默认每页条数 */
  @Prop() defaultPageSize: number = 10;

  /** 当前页码（受控） */
  @Prop() currentPage?: number;

  /** 默认当前页码 */
  @Prop() defaultCurrentPage: number = 1;

  /** 总页数（优先于 total） */
  @Prop() pageCount?: number;

  /** 显示的页码按钮数量（必须为大于4的奇数） */
  @Prop() pagerCount: number = DEFAULT_PAGE_COUNT;

  /** 布局配置，逗号分隔 */
  @Prop() layout: string = DEFAULT_LAYOUT;

  /** 每页条数选项列表 — 支持数组或逗号分隔字符串 */
  @Prop({ mutable: true }) pageSizes: PaginationPageSize[] | string = [...DEFAULT_PAGE_SIZES];

  /** 解析后的每页条数选项（保证返回数组） */
  get _resolvedPageSizes(): PaginationPageSize[] {
    if (Array.isArray(this.pageSizes)) {
      return this.pageSizes;
    }
    if (typeof this.pageSizes === 'string' && this.pageSizes.trim()) {
      const raw = this.pageSizes.trim();
      // 兼容 JSON 数组格式：page-sizes="[10,20,50,100]"
      if (raw.startsWith('[') && raw.endsWith(']')) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return parsed
              .map((v) => Number(v))
              .filter((n) => !Number.isNaN(n) && n > 0);
          }
        } catch {
          // JSON 解析失败，走下面的逗号分隔逻辑
        }
      }
      // 兼容逗号分隔格式：page-sizes="10,20,50,100"
      return raw
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => !Number.isNaN(n) && n > 0);
    }
    return [...DEFAULT_PAGE_SIZES];
  }

  /** 组件尺寸 */
  @Prop() size?: ComponentSize;

  /** 是否带背景色 */
  @Prop({ reflect: true }) background: boolean = false;

  /** 是否禁用 */
  @Prop() disabled: boolean = false;

  /** 只有一页时是否隐藏 */
  @Prop() hideOnSinglePage: boolean = false;

  /** 上一页按钮文字 */
  @Prop() prevText: string = '';

  /** 下一页按钮文字 */
  @Prop() nextText: string = '';

  /** 上一页按钮图标 */
  @Prop() prevIcon: string = 'arrow-left-s-line';

  /** 下一页按钮图标 */
  @Prop() nextIcon: string = 'arrow-right-s-line';

  /** 每页条数变化事件 */
  @Event({ eventName: 'zSizeChange' }) sizeChangeEvent!: EventEmitter<number>;

  /** 当前页变化事件 */
  @Event({ eventName: 'zCurrentChange' }) currentChangeEvent!: EventEmitter<number>;

  /** 综合变化事件（currentPage + pageSize） */
  @Event({ eventName: 'zChange' }) changeEvent!: EventEmitter<{
    currentPage: number;
    pageSize: number;
  }>;

  /** 点击上一页按钮事件 */
  @Event({ eventName: 'zPrevClick' }) prevClickEvent!: EventEmitter<number>;

  /** 点击下一页按钮事件 */
  @Event({ eventName: 'zNextClick' }) nextClickEvent!: EventEmitter<number>;

  // ===== Internal State =====

  @State() _innerCurrentPage: number = 1;
  @State() _innerPageSize: number = 10;
  @State() _showPrevMore: boolean = false;
  @State() _showNextMore: boolean = false;
  @State() _quickPrevHover: boolean = false;
  @State() _quickNextHover: boolean = false;
  @State() _jumperValue: string = '';

  // ===== Computed Getters =====

  get internalCurrentPage(): number {
    return this.currentPage ?? this._innerCurrentPage;
  }

  set internalCurrentPage(v: number) {
    this._innerCurrentPage = v;
  }

  get internalPageSize(): number {
    return this.pageSize ?? this._innerPageSize;
  }

  set internalPageSize(v: number) {
    this._innerPageSize = v;
  }

  /** 计算总页数：优先使用 props.pageCount，其次从 total / pageSize 计算 */
  get _computedPageCount(): number {
    if (this.pageCount != null && !Number.isNaN(this.pageCount)) {
      return Math.max(1, this.pageCount);
    }
    if (this.total != null && !Number.isNaN(this.total)) {
      return Math.max(1, Math.ceil(this.total / this.internalPageSize));
    }
    return 1;
  }

  get shouldHide(): boolean {
    return this.hideOnSinglePage && this._computedPageCount <= 1;
  }

  // ===== Lifecycle =====

  componentWillLoad() {
    this._innerCurrentPage = this.defaultCurrentPage ?? 1;
    this._innerPageSize = this.defaultPageSize ?? 10;
  }

  // ===== Watchers =====

  @Watch('defaultCurrentPage', { immediate: true })
  onDefaultCurrentPageChange() {
    if (this.currentPage == null) {
      this._innerCurrentPage = this.defaultCurrentPage ?? 1;
    }
  }

  @Watch('defaultPageSize', { immediate: true })
  onDefaultPageSizeChange() {
    if (this.pageSize == null) {
      this._innerPageSize = this.defaultPageSize ?? 10;
    }
  }

  // ===== Core Methods =====

  private handleCurrentChange(page: number): void {
    if (this.disabled) return;

    const newPage = this.getValidCurrentPage(page);
    if (newPage === this.internalCurrentPage) return;

    if (this.currentPage == null) {
      this.internalCurrentPage = newPage;
    }
    this.currentChangeEvent.emit(newPage);
    this.changeEvent.emit({
      currentPage: newPage,
      pageSize: this.internalPageSize,
    });
  }

  private handleSizeChange(size: number): void {
    if (this.disabled) return;

    const newSize = Math.max(1, size);
    if (this.pageSize == null) {
      this.internalPageSize = newSize;
    }

    // 切换 pageSize 后，需要重新计算 current 是否超出范围
    const maxPage = this._getPageCountByTotal(newSize);
    let newCurrent = this.internalCurrentPage;
    if (newCurrent > maxPage) {
      newCurrent = maxPage;
      if (this.currentPage == null) {
        this.internalCurrentPage = newCurrent;
      }
    }

    this.sizeChangeEvent.emit(newSize);
    this.changeEvent.emit({
      currentPage: newCurrent,
      pageSize: newSize,
    });
  }

  private getValidCurrentPage(value: number): number {
    value = Math.trunc(value);
    if (Number.isNaN(value) || value < 1) return 1;
    if (value > this._computedPageCount) return this._computedPageCount;
    return value;
  }

  private _getPageCountByTotal(pageSize: number): number {
    if (this.total != null && !Number.isNaN(this.total)) {
      return Math.ceil(this.total / pageSize);
    }
    return this._computedPageCount;
  }

  // ===== Pager Logic (Element Plus 折叠算法) =====

  /** 在每次 render 前计算折叠状态，避免在 render 中修改 @State() */
  componentWillRender() {
    const pCount = this._computedPageCount;
    const currentPager = this.internalCurrentPage;
    let showPrevMore = false;
    let showNextMore = false;

    if (pCount > this.pagerCount) {
      const halfPagerCount = Math.floor(this.pagerCount / 2);
      // 注意：两个条件是独立的（不是 if/else），允许同时显示两侧省略号
      if (currentPager > this.pagerCount - halfPagerCount) {
        showPrevMore = true;
      }
      if (currentPager < pCount - halfPagerCount) {
        showNextMore = true;
      }
    }

    this._showPrevMore = showPrevMore;
    this._showNextMore = showNextMore;
  }

  private getPagers(): PagerItem[] {
    const pagerArray: PagerItem[] = [];
    const pCount = this._computedPageCount;
    const currentPager = this.internalCurrentPage;

    if (this._showPrevMore && !this._showNextMore) {
      const startPage = Math.max(2, pCount - this.pagerCount + 2);
      for (let i = startPage; i <= pCount; i++) {
        pagerArray.push({
          type: 'page',
          value: i,
          active: i === currentPager,
        });
      }
    } else if (!this._showPrevMore && this._showNextMore) {
      for (let i = 2; i < this.pagerCount; i++) {
        pagerArray.push({
          type: 'page',
          value: i,
          active: i === currentPager,
        });
      }
    } else if (this._showPrevMore && this._showNextMore) {
      const offset = Math.floor(this.pagerCount / 2) - 1;
      for (let i = currentPager - offset; i <= currentPager + offset; i++) {
        pagerArray.push({
          type: 'page',
          value: i,
          active: i === currentPager,
        });
      }
    } else {
      for (let i = 2; i < pCount; i++) {
        pagerArray.push({
          type: 'page',
          value: i,
          active: i === currentPager,
        });
      }
    }

    return pagerArray;
  }

  // ===== Render Helpers =====

  /** 渲染上一页按钮 — 对应 SCSS .btn-prev */
  private renderPrev() {
    const disabled = this.disabled || this.internalCurrentPage <= 1;
    const kls = classNames(
      'btn-prev',
      ns.is('disabled', disabled),
    );

    return (
      <button
        type="button"
        class={kls}
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            this.handleCurrentChange(this.internalCurrentPage - 1);
            this.prevClickEvent.emit(this.internalCurrentPage - 1);
          }
        }}
      >
        {this.prevText ? (
          <span>{this.prevText}</span>
        ) : (
          <zane-icon name={this.prevIcon}></zane-icon>
        )}
      </button>
    );
  }

  /** 渲染页码列表 — 使用 <ul> + <li> 结构，对齐 Element Plus */
  private renderPager() {
    const pagers = this.getPagers();
    const pCount = this._computedPageCount;
    const items: any[] = [];

    // First page (<li>)
    items.push(
      <li
        key="1"
        class={classNames(
          ns.is('active', this.internalCurrentPage === 1),
          ns.is('disabled', this.disabled),
        )}
        onClick={() => !this.disabled && this.handleCurrentChange(1)}
      >
        1
      </li>,
    );

    // Prev more (left ellipsis, <li>)
    if (this._showPrevMore) {
      items.push(
        <li
          key="prev-more"
          class={classNames(ns.e('more'), ns.is('disabled', this.disabled))}
          onMouseEnter={() => {
            this._quickPrevHover = true;
          }}
          onMouseLeave={() => {
            this._quickPrevHover = false;
          }}
          onClick={() =>
            !this.disabled &&
            this.handleCurrentChange(
              this.internalCurrentPage - (this.pagerCount - 2),
            )
          }
        >
          <zane-icon name={this._quickPrevHover ? 'double-arrow-left-line' : 'more-fill'}></zane-icon>
        </li>,
      );
    }

    // Middle pages (<li>)
    pagers.forEach((item) => {
      items.push(
        <li
          key={String(item.value)}
          class={classNames(
            ns.is('active', item.active),
            ns.is('disabled', this.disabled),
          )}
          onClick={() => !this.disabled && this.handleCurrentChange(item.value)}
        >
          {item.value}
        </li>,
      );
    });

    // Next more (right ellipsis, <li>)
    if (this._showNextMore) {
      items.push(
        <li
          key="next-more"
          class={classNames(ns.e('more'), ns.is('disabled', this.disabled))}
          onMouseEnter={() => {
            this._quickNextHover = true;
          }}
          onMouseLeave={() => {
            this._quickNextHover = false;
          }}
          onClick={() =>
            !this.disabled &&
            this.handleCurrentChange(
              this.internalCurrentPage + (this.pagerCount - 2),
            )
          }
        >
          <zane-icon name={this._quickNextHover ? 'double-arrow-right-line' : 'more-fill'}></zane-icon>
        </li>,
      );
    }

    // Last page (>1, <li>) — 仅当中间页码未包含最后一页时才渲染，避免重复
    const lastPageInPagers = pagers.some((item) => item.value === pCount);
    if (pCount > 1 && !lastPageInPagers) {
      items.push(
        <li
          key={String(pCount)}
          class={classNames(
            ns.is('active', this.internalCurrentPage === pCount),
            ns.is('disabled', this.disabled),
          )}
          onClick={() => !this.disabled && this.handleCurrentChange(pCount)}
        >
          {pCount}
        </li>,
      );
    }

    return <ul class={ns.e('pager')}>{items}</ul>;
  }

  /** 渲染下一页按钮 — 对应 SCSS .btn-next */
  private renderNext() {
    const pCount = this._computedPageCount;
    const disabled =
      this.disabled ||
      pCount === 0 ||
      this.internalCurrentPage >= pCount;
    const kls = classNames(
      'btn-next',
      ns.is('disabled', disabled),
    );

    return (
      <button
        type="button"
        class={kls}
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            this.handleCurrentChange(this.internalCurrentPage + 1);
            this.nextClickEvent.emit(this.internalCurrentPage + 1);
          }
        }}
      >
        {this.nextText ? (
          <span>{this.nextText}</span>
        ) : (
          <zane-icon name={this.nextIcon}></zane-icon>
        )}
      </button>
    );
  }

  private renderJumper() {
    const pCount = this._computedPageCount;
    return (
      <span class={ns.b('jump')}>
        前往
        <input
          class={ns.e('editor')}
          type="text"
          min={1}
          max={pCount}
          value={this._jumperValue || ''}
          disabled={this.disabled}
          onInput={(e: Event) => {
            const target = e.target as HTMLInputElement;
            this._jumperValue = target.value.replace(/[^\d]/g, '');
          }}
          onKeyDown={(e: KeyboardEvent) => {
            if (e.key === 'Enter') {
              const val = parseInt(this._jumperValue, 10);
              if (!Number.isNaN(val)) {
                this.handleCurrentChange(val);
              }
              this._jumperValue = '';
            }
          }}
        />
        页
      </span>
    );
  }

  private renderTotal() {
    return (
      <span class={ns.b('total')}>
        共 {this.total ?? 0} 条
      </span>
    );
  }

  private renderSizes() {
    return (
      <span class={ns.b('sizes')}>
        <select
          class="zane-pagination__size-select"
          // @ts-ignore Stencil JSX 原生 select 支持 value 属性
          value={this.internalPageSize}
          disabled={this.disabled}
          onChange={(e: Event) => {
            const val = parseInt((e.target as HTMLSelectElement).value, 10);
            if (!Number.isNaN(val)) {
              this.handleSizeChange(val);
            }
          }}
        >
          {this._resolvedPageSizes.map((size) => (
            <option key={String(size)} value={size}>
              {size} 条/页
            </option>
          ))}
        </select>
      </span>
    );
  }

  // ===== Main Render =====

  render() {
    if (this.shouldHide) {
      return null;
    }

    const rootKls = classNames(
      ns.b(),
      ns.m(this.size),
      ns.is('background', this.background),
      ns.is('disabled', this.disabled),
    );

    const layoutItems = this.layout.split(',').map((item) => item.trim());
    const leftChildren: any[] = [];
    const rightChildren: any[] = [];
    let isRightSide = false;

    const renderMap: Record<string, () => any> = {
      prev: () => this.renderPrev(),
      pager: () => this.renderPager(),
      next: () => this.renderNext(),
      jumper: () => this.renderJumper(),
      total: () => this.renderTotal(),
      sizes: () => this.renderSizes(),
      slot: () => <slot />,
    };

    layoutItems.forEach((key, index) => {
      if (key === '->') {
        isRightSide = true;
        return;
      }

      const renderer = renderMap[key];
      if (renderer) {
        const element = renderer();
        const wrapperClass =
          index === 0
            ? [ns.is('first', true)]
            : index === layoutItems.length - 1
              ? [ns.is('last', true)]
              : [];

        if (wrapperClass.length > 0) {
          const wrapped = (
            <span class={classNames(...wrapperClass)}>{element}</span>
          );

          if (isRightSide) {
            rightChildren.push(wrapped);
          } else {
            leftChildren.push(wrapped);
          }
        } else {
          if (isRightSide) {
            rightChildren.push(element);
          } else {
            leftChildren.push(element);
          }
        }
      }
    });

    return (
      <Host class={rootKls} role="navigation" aria-label="Pagination">
        {leftChildren.length > 0 && leftChildren}
        {rightChildren.length > 0 && (
          <div class={ns.b('rightwrapper')}>{rightChildren}</div>
        )}
      </Host>
    );
  }
}
