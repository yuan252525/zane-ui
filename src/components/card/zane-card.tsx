import { Component, Element, h, Host, Prop, State } from '@stencil/core';

import { useNamespace } from '../../hooks';
import type { ConfigProviderContext } from '../config-provider/types';
import { getConfigProviderContext } from '../config-provider/utils';
import type { ReactiveObject } from '../../utils';

const ns = useNamespace('card');

@Component({
  styleUrl: 'zane-card.scss',
  tag: 'zane-card',
})
export class ZaneCard {
  @Prop() bodyClass: string = '';

  @Prop() bodyStyle: Record<string, string> = {};

  @Element() el: HTMLElement | undefined;

  @Prop() footer: string = '';

  @Prop() footerClass: string = '';

  @State() hasFooterContent: boolean = false;

  @State() hasHeaderContent: boolean = false;

  @Prop() header: string = '';

  @Prop() headerClass: string = '';

  @Prop() shadow?: 'always' | 'hover' | 'never';

  private configProviderContext: ReactiveObject<ConfigProviderContext> | undefined;


  checkSlotContent() {
    this.hasHeaderContent = !!this.el?.querySelector('[slot="header"]');
    this.hasFooterContent = !!this.el?.querySelector('[slot="footer"]');
  }

  componentWillLoad() {
    this.configProviderContext = getConfigProviderContext(this.el!);
    
    this.checkSlotContent();
  }

  render() {
    return (
      <Host>
        <div
          class={[
            ns.b(),
            ns.is(
              `${this.shadow || this.configProviderContext?.value.card?.shadow || 'always'}-shadow`,
            ),
          ].join(' ')}
        >
          {(this.hasHeaderContent || this.header) && (
            <div class={[ns.e('header'), this.headerClass].join(' ')}>
              <slot name="header">{this.header}</slot>
            </div>
          )}
          <div
            class={[ns.e('body'), this.bodyClass].join(' ')}
            style={this.bodyStyle}
          >
            <slot />
          </div>
          {(this.hasFooterContent || this.footer) && (
            <div class={[ns.e('footer'), this.footerClass].join(' ')}>
              <slot name="footer">{this.footer}</slot>
            </div>
          )}
        </div>
      </Host>
    );
  }
}
