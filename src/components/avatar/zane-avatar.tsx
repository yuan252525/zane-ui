import {
  Component,
  Element,
  Event,
  EventEmitter,
  h,
  Host,
  Prop,
  State,
  Watch,
} from '@stencil/core';

import { useNamespace } from '../../hooks';
import { addUnit, isNumber, isString } from '../../utils';

const ns = useNamespace('avatar');

@Component({
  styleUrl: 'zane-avatar.scss',
  tag: 'zane-avatar',
})
export class ZaneAvatar {
  @Prop({ attribute: 'alt', reflect: true })
  alt: string | undefined;

  @Element() el: HTMLElement | undefined;

  @Prop({ attribute: 'fit', reflect: true })
  fit: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down' = 'cover';

  @State() hasLoadError: boolean = false;

  @Prop({ attribute: 'icon', reflect: true })
  icon: string | undefined;

  @Event() imgError: EventEmitter<Event> | undefined;

  @Prop({ attribute: 'shape', reflect: true })
  shape: 'circle' | 'square' = 'circle';

  @Prop({ attribute: 'size', reflect: true })
  size: 'default' | 'large' | 'small' | number = 'default';

  @Prop({ attribute: 'src', reflect: true })
  src: string = '';

  @Prop({ attribute: 'srcSet', reflect: true })
  srcSet: string | undefined;

  get avatarClass(): string {
    const classList = [ns.b()];
    if (isString(this.size)) classList.push(ns.m(this.size as string));
    if (this.icon) classList.push(ns.m('icon'));
    if (this.shape) classList.push(ns.m(this.shape));
    return classList.join(' ');
  }

  get fitStyle() {
    return { objectFit: this.fit };
  }

  get sizeStyle() {
    return isNumber(this.size)
      ? ns.cssVarBlock({
          size: addUnit(this.size) || '',
        })
      : undefined;
  }

  handleError(e: Event) {
    this.hasLoadError = true;
    this.imgError?.emit(e);
  }

  render() {
    return (
      <Host class={this.avatarClass} style={this.sizeStyle}>
        {this.renderContent()}
      </Host>
    );
  }

  @Watch('src')
  watchSrcHandler() {
    this.hasLoadError = false;
  }

  private renderContent() {
    if ((this.src || this.srcSet) && !this.hasLoadError) {
      return (
        <img
          alt={this.alt}
          onError={(e) => this.handleError(e)}
          src={this.src}
          srcset={this.srcSet}
          style={this.fitStyle}
        />
      );
    }

    if (this.icon) {
      return <zane-icon name={this.icon}></zane-icon>;
    }

    return <slot />;
  }
}
