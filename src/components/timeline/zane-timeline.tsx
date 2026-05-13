import {
  Component,
  h,
  Host,
  Prop,
} from '@stencil/core';
import { useNamespace } from '../../hooks';

const ns = useNamespace('timeline');

export type TimelineMode = 'start' | 'alternate' | 'alternate-reverse' | 'end';

@Component({
  tag: 'zane-timeline',
  styleUrl: 'zane-timeline.scss',
})
export class ZaneTimeline {
  /** 时间线与内容的相对位置 */
  @Prop() mode: TimelineMode = 'start';

  /** 是否逆序排序 */
  @Prop() reverse: boolean = false;

  render() {
    return (
      <Host
        class={{
          [ns.b()]: true,
          [ns.is(this.mode)]: !!this.mode,
          [ns.is('reverse')]: this.reverse,
        }}
      >
        <slot />
      </Host>
    );
  }
}
