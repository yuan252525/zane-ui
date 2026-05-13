import { Component, Element, h, Host, Method, Prop, State } from '@stencil/core';
import { useNamespace } from '../../hooks/useNamespace';
import classNames from 'classnames';
import type { ReactiveObject } from '../../utils/reactive/ReactiveObject';
import type { CarouselContext } from './types';
import { getCarouselContext } from './utils';
import { isUndefined } from 'lodash-es';

const ns = useNamespace('carousel');

@Component({
  tag: 'zane-carousel-item',
  styleUrl: 'zane-carousel-item.scss'
})
export class ZaneCarouselItem {
  @Element() el!: HTMLElement;

  @Prop() name: string = '';

  @Prop() label: string | number = '';

  @State() ready: boolean = false;

  @State() active: boolean = false;

  @State() inStage: boolean = false;

  @State() hover: boolean = false;

  @State() animating: boolean = false;

  @State() isCardType: boolean = false;

  @State() isVertical: boolean = false;

  @State() cardScale: number = 0.83;

  @State() translate: number = 0;

  @State() scale: number = 1;

  private carouselContext?: ReactiveObject<CarouselContext>;

  @Method()
  async getInStage() {
    return this.inStage;
  }

  @Method()
  async getActive() {
    return this.active;
  }

  @Method()
  async setHover(hover: boolean) {
    this.hover = hover;
  }

  @Method()
  async translateItem(index: number, activeIndex: number, oldIndex?: number) {
    const carouselItemLength = this.carouselContext?.value.items.length ?? Number.NaN;
    const isActive = index === activeIndex;
    if (!this.isCardType && !isUndefined(oldIndex)) {
      this.animating = isActive || index === oldIndex;
    }

    if (!isActive && carouselItemLength > 2 && this.carouselContext?.value.loop) {
      index = this.processIndex(index, activeIndex, carouselItemLength);
    }

    this.active = isActive;

    if (this.isCardType) {
      this.inStage = Math.round(Math.abs(index - activeIndex)) <= 1;
      this.translate = this.calcCardTranslate(index, activeIndex);
      this.scale = this.active ? 1 : this.cardScale;
    } else {
      this.translate = this.calcTranslate(index, activeIndex, this.isVertical);
    }

    this.ready = true;

    if (isActive && this.el) {
      this.carouselContext?.value.setContaninerHeight(this.el.offsetHeight);
    }
  }

  private processIndex = (index: number, activeIndex: number, length: number) => {
    const lastItemIndex = length - 1;
    const prevItemIndex = activeIndex - 1;
    const nextItemIndex = activeIndex + 1;
    const halfItemIndex = length / 2;

    if (activeIndex === 0 && index === lastItemIndex) {
      return -1;
    } else if (activeIndex === lastItemIndex && index === 0) {
      return length;
    } else if (index < prevItemIndex && activeIndex - index >= halfItemIndex) {
      return length + 1;
    } else if (index > nextItemIndex && index - activeIndex >= halfItemIndex) {
      return -2;
    }
    return index;
  }

  private calcCardTranslate = (index: number, activeIndex: number) => {
    const parentWidth = this.isVertical
      ? this.carouselContext?.value.rootRef?.offsetHeight || 0
      : this.carouselContext?.value.rootRef?.offsetWidth || 0;
    
    if (this.inStage) {
      return (parentWidth * ((2 - this.cardScale) * (index - activeIndex) + 1)) / 4;
    } else if (index < activeIndex) {
      return (-(1 + this.cardScale) * parentWidth) / 4;
    } else {
      return ((3 + this.cardScale) * parentWidth) / 4;
    }
  }

  private calcTranslate = (index: number, activeIndex: number, isVertical: boolean) => {
    const rootRef = this.carouselContext?.value.rootRef;
    if (!rootRef) {
      return 0;
    }

    const distance = (isVertical ? rootRef.offsetHeight : rootRef.offsetWidth) || 0;
    return distance * (index - activeIndex);
  }

  componentWillLoad() {
    this.carouselContext = getCarouselContext(this.el);
    this.isCardType = this.carouselContext?.value.isCardType ?? false;
    this.isVertical = this.carouselContext?.value.isVertical ?? false;
    this.cardScale = this.carouselContext?.value.cardScale ?? 0.83;

    this.carouselContext?.change$.subscribe(({ key, value }) => {
      if (key === 'isCardType') {
        this.isCardType = value;
      }
      if (key === 'isVertical') {
        this.isVertical = value;
      }
      if (key === 'cardScale') {
        this.cardScale = value;
      }
    });
  }

  private handleItemClick = () => {
    if (this.carouselContext && this.isCardType) {
      const index = this.carouselContext.value.items.findIndex(item => item === this.el);
      this.carouselContext.value.setActiveItem(index);
    }
  }

  render() {
    const translateType = `translate${this.isVertical ? 'Y' : 'X'}`;
    const translateValue = `${translateType}(${this.translate}px)`;
    const scaleValue = `scale(${this.scale})`;
    const transform = `${translateValue} ${scaleValue}`;

    return (
      <Host
        class={classNames(
          ns.e('item'),
          ns.is('active', this.active),
          ns.is('in-stage', this.inStage),
          ns.is('hover', this.hover),
          ns.is('animating', this.animating),
          {
            [ns.em('item', 'card')]: this.isCardType,
            [ns.em('item', 'card-vertical')]: this.isCardType && this.isVertical,
          }
        )}
        style={{
          display: this.ready ? 'block' : 'none',
          transform,
        }}
        onClick={this.handleItemClick}
      >
        {
          this.isCardType && (
            <div
              class={ns.e('mask')}
              style={{display: this.active ? 'none' : 'block'}}
            ></div>
          )
        }
        <slot></slot>
      </Host>
    );
  }
}
