import { Component, Element, h, Host, Prop, State } from '@stencil/core';

import { useNamespace } from '../../hooks';

const ns = useNamespace('empty');

@Component({
  styleUrl: 'zane-empty.scss',
  tag: 'zane-empty',
})
export class ZaneEmpty {
  @Prop() image: string = '';

  @Prop() imageSize: number;

  @Prop() description: string = '';

  @Element() el: HTMLElement;

  @State() hasDescriptionSlot: boolean = false;

  @State() hasDefaultSlot: boolean = false;

  componentWillLoad() {
    this.hasDescriptionSlot = !!this.el.querySelector('[slot="description"]');
    this.hasDefaultSlot = Array.from(this.el.children).some(
      child => !child.hasAttribute('slot') || child.getAttribute('slot') === 'default',
    );
  }

  private onDescriptionSlotChange = (e: Event) => {
    const slot = e.target as HTMLSlotElement;
    this.hasDescriptionSlot = slot.assignedNodes().length > 0;
  };

  private onDefaultSlotChange = (e: Event) => {
    const slot = e.target as HTMLSlotElement;
    this.hasDefaultSlot = slot.assignedNodes().length > 0;
  };

  render() {
    const imageStyle = this.imageSize ? { width: `${this.imageSize}px` } : {};
    const descriptionText = this.description || '暂无数据';

    return (
      <Host>
        <div class={ns.b()}>
          <div class={ns.e('image')} style={imageStyle}>
            {this.image ? (
              <img
                src={this.image}
                onDragStart={e => e.preventDefault()}
              />
            ) : (
              <slot name="image">
                <zane-img-empty />
              </slot>
            )}
          </div>
          <div class={ns.e('description')}>
            <slot
              name="description"
              onSlotchange={this.onDescriptionSlotChange}
            />
            {!this.hasDescriptionSlot && <p>{descriptionText}</p>}
          </div>
          <div
            class={ns.e('bottom')}
            style={{ display: this.hasDefaultSlot ? undefined : 'none' }}
          >
            <slot onSlotchange={this.onDefaultSlotChange} />
          </div>
        </div>
      </Host>
    );
  }
}
