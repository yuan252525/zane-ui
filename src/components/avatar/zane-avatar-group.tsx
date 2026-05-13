import { Component, Element, h, Host, Prop, Watch } from '@stencil/core';
import { useNamespace } from '../../hooks';
import { hasRawParent, ReactiveObject } from '../../utils';
import type { Props } from 'tippy.js';
import { avatarGroupContexts } from './constants';
import type { AvatarGroupContext } from './types';

const ns = useNamespace('avatar-group');

@Component({
  tag: 'zane-avatar-group',
  styleUrl: 'zane-avatar-group.scss',
})
export class ZaneAvatarGroup {

  @Element() el: HTMLElement | undefined;

  @Prop({ attribute: 'size', reflect: true })
  size: 'default' | 'large' | 'small' | number = 'default';

  @Prop({ attribute: 'shape', reflect: true })
  shape: 'circle' | 'square' = 'circle';

  @Prop() collapseAvatars: boolean = false;

  @Prop() collapseAvatarsTooltip: boolean = false;

  @Prop() maxCollapseAvatars: number = 1;

  @Prop() effect: 'dark' | 'light' = 'light';

  @Prop() placement: Props['placement'] = 'bottom-start';

  @Prop() popperTheme: string | undefined;

  @Prop() popperOptions: Props['popperOptions'] = {};
  
  @Prop() popperBoxClass: string | undefined;
  
  @Prop() popperContentClass: string | undefined;

  @Prop() collapseClass: string | undefined;

  @Prop() collapseStyle: Record<string, any> | undefined;

  @Prop() avatars?: string[];

  private context: ReactiveObject<AvatarGroupContext> | undefined;

  componentWillLoad() {
    this.context = new ReactiveObject<AvatarGroupContext>({
      size: this.size,
      shape: this.shape,
    });
    avatarGroupContexts.set(this.el!, this.context);
  }

  disconnectedCallback() {
    if (!hasRawParent(this.el!)) {
      avatarGroupContexts.delete(this.el!);
    }
  }

  @Watch('size')
  handleWatchSize() {
    this.context!.value.size = this.size;
  }

  @Watch('shape')
  handleWatchShape() {
    this.context!.value.shape = this.shape;
  }

  private renderAvatar(avatar: string, index: number) {
    const isImg = /^.*\|img$/i.test(avatar);
    const isIcon = /^.*\|icon$/i.test(avatar);
    if (isImg) {
      const src = avatar.replace('|img', '');
      return <zane-avatar key={index} size={this.size} shape={this.shape} src={src}></zane-avatar>;
    } else if (isIcon) {
      const icon = avatar.replace('|icon', '');
      return <zane-avatar key={index} size={this.size} shape={this.shape} icon={icon}></zane-avatar>;
    } else {
      return <zane-avatar key={index} size={this.size} shape={this.shape}>{avatar}</zane-avatar>;
    }
  }

  private renderAvatars() {
    if (this.avatars && this.avatars.length > 0) {
      let visibleAvatars = this.avatars;

      const showCollapseAvatar = this.collapseAvatars && this.avatars.length > this.maxCollapseAvatars;
      if (showCollapseAvatar) {
        visibleAvatars = this.avatars.slice(0, this.maxCollapseAvatars);
      }

      const nodes = visibleAvatars.map((avatar, index) => {
        return this.renderAvatar(avatar, index);
      });

      if (showCollapseAvatar) {
        const hiddenAvatars = this.avatars.slice(this.maxCollapseAvatars);
        nodes.push(<zane-tippy
          disabled={!this.collapseAvatarsTooltip}
          theme={this.popperTheme}
          class={ns.b('tippy')}
          placement={this.placement}
          popperOptions={this.popperOptions}
          boxClass={this.popperBoxClass || ns.b('tippy-box')}
          contentClass={this.popperContentClass || ns.b('tippy-content')}
          interactive={true}
        >
          <zane-avatar size={this.size} shape={this.shape} class={this.collapseClass} style={this.collapseStyle}>
            +{hiddenAvatars.length}
          </zane-avatar>
          <div slot='content'>
            {hiddenAvatars.map((avatar, index) => this.renderAvatar(avatar, index))}
          </div>
        </zane-tippy>);
      }

      return nodes;
    }

    return null;
  }

  render() {
    return (
      <Host class={ns.b()}>
        { this.renderAvatars() }
      </Host>
    );
  }
}
