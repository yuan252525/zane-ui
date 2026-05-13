import {
  Component,
  h,
  Host,
  Prop,
  Element,
} from '@stencil/core';
import { useNamespace } from '../../hooks';

const ns = useNamespace('timeline-item');

export type TimelineItemType = '' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
export type TimelineItemSize = 'normal' | 'large';
export type TimelineItemPlacement = 'top' | 'bottom';

@Component({
  tag: 'zane-timeline-item',
  styleUrl: 'zane-timeline.scss',
})
export class ZaneTimelineItem {
  @Element() el!: HTMLElement;

  /** 时间戳内容 */
  @Prop() timestamp: string = '';

  /** 是否隐藏时间戳 */
  @Prop() hideTimestamp: boolean = false;

  /** 是否垂直居中 */
  @Prop() center: boolean = false;

  /** 时间戳位置 */
  @Prop() placement: TimelineItemPlacement = 'bottom';

  /** 节点类型 */
  @Prop() type: TimelineItemType = '';

  /** 节点颜色 */
  @Prop() color: string = '';

  /** 节点尺寸 */
  @Prop() size: TimelineItemSize = 'normal';

  /** 自定义图标名称（@zanejs/icons） */
  @Prop() icon?: string;

  /** 是否空心点 */
  @Prop() hollow: boolean = false;

  private hasDotSlot(): boolean {
    return !!this.el.querySelector('[slot="dot"]');
  }

  render() {
    const defaultNodeKls = {
      [ns.e('node')]: true,
      [ns.em('node', this.size || '')]: !!this.size,
      [ns.em('node', this.type || '')]: !!this.type,
      [ns.is('hollow', this.hollow)]: this.hollow,
    };

    return (
      <Host
        class={{
          [ns.b()]: true,
          [ns.e('center')]: this.center,
        }}
      >
        {/* 尾部竖线 */}
        <div class={ns.e('tail')}></div>

        {/* 默认节点 */}
        {!this.hasDotSlot() && (
          <div
            class={defaultNodeKls}
            style={this.color ? { backgroundColor: this.color } : {}}
          >
            {this.icon && (
              <zane-icon name={this.icon} class={ns.e('icon')} />
            )}
          </div>
        )}

        {/* 自定义节点插槽 */}
        {this.hasDotSlot() && (
          <div class={ns.e('dot')}>
            <slot name="dot" />
          </div>
        )}

        {/* 内容包裹层 */}
        <div class={ns.e('wrapper')}>
          {/* 时间戳在顶部 */}
          {!this.hideTimestamp && this.placement === 'top' && (
            <div class={[ns.e('timestamp'), ns.is('top')].join(' ')}>
              {this.timestamp}
            </div>
          )}

          {/* 内容区 */}
          <div class={ns.e('content')}>
            <slot />
          </div>

          {/* 时间戳在底部 */}
          {!this.hideTimestamp && this.placement === 'bottom' && (
            <div class={[ns.e('timestamp'), ns.is('bottom')].join(' ')}>
              {this.timestamp}
            </div>
          )}
        </div>
      </Host>
    );
  }
}
