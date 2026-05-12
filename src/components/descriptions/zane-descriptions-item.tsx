import { Component, h, Prop } from '@stencil/core';


@Component({
  tag: 'zane-descriptions-item',
  styleUrl: 'zane-descriptions-item.scss'
})
export class ZaneDescriptionsItem {
  @Prop() label: string = '';

  @Prop() span: number = 1;

  @Prop() rowspan: number = 1;

  @Prop() width: string | number = '';

  @Prop() minWidth: string | number = '';

  @Prop() labelWidth?: string | number;

  @Prop() align: 'left' | 'center' | 'right' = 'left';

  @Prop() labelAlign: 'left' | 'center' | 'right' = 'left';

  @Prop() contentClassName: string = '';

  @Prop() labelClassName: string = '';
  
  render() {
    return (
      <slot></slot>
    );
  }
}
