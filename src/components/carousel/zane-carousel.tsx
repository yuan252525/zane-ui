import { Component, Element, Event, h, Prop, State, Watch, type EventEmitter } from '@stencil/core';
import { useNamespace } from '../../hooks';
import state from '../../global/store';
import classNames from 'classnames';
import { isString, throttle } from 'lodash-es';
import type { CarouselContext } from './types';
import { ReactiveObject } from '../../utils/reactive/ReactiveObject';
import { carouselContexts } from './constants';
import { hasRawParent } from '../../utils/dom/element/hasRawParent';
import { debugWarn } from '../../utils';

const ns = useNamespace('carousel');

const THROTTLE_TIME = 300;

const SCOPE = 'zane-carousel';

@Component({
  tag: 'zane-carousel',
  styleUrl: 'zane-carousel.scss'
})
export class ZaneCarousel {
  @Element() el!: HTMLElement;

  @Prop() initialIndex: number = 0;

  @Prop() height: string = '';

  @Prop() trigger: 'hover' | 'click' = 'hover';

  @Prop() autoplay: boolean = true;

  @Prop() interval: number = 3000;

  @Prop() indicatorPosition: '' | 'none' | 'outside' = '';

  @Prop() arrow: 'always' | 'hover' | 'never' = 'hover';

  @Prop() type: '' | 'card' = '';

  @Prop() cardScale: number = 0.83;

  @Prop() loop: boolean = true;

  @Prop() direction: 'horizontal' | 'vertical' = 'horizontal';

  @Prop() pauseOnHover: boolean = true;

  @Event({ eventName: "zChange", bubbles: false })
  changeEvent?: EventEmitter<{ current: number; prev: number }>;

  @State() arrowDisplay: boolean = false;

  @State() isCardType: boolean = false;

  @State() isVertical: boolean = false;

  @State() hover: boolean = false;

  @State() activeIndex: number = -1;

  @State() containerHeight: number = 0;

  @State() isItemsTwoLength: boolean = true;

  private timer: ReturnType<typeof setInterval> | null = null;

  private rootRef!: HTMLElement;

  private items: HTMLZaneCarouselItemElement[] = [];

  private context?: ReactiveObject<CarouselContext>;

  @Watch('arrow')
  @Watch('isVertical')
  updateArrowDisplay() {
    this.arrowDisplay = this.arrow !== 'never' && !this.isVertical;
  }

  @Watch('type')
  updateIsCardType() {
    this.isCardType = this.type === 'card';
  }

  @Watch('direction')
  updateIsVertical() {
    this.isVertical = this.direction === 'vertical';
  }

  @Watch('activeIndex')
  updateActiveIndex(current: number, prev: number) {
    this.resetItemPosition(prev);
    if (prev > -1) {
      this.changeEvent?.emit({ current, prev });
    }
  }

  @Watch('autoplay')
  handleAutoplayChange() {
    this.autoplay ? this.startTimer() : this.pauseTimer();
  }

  @Watch('loop')
  handleLoopChange() {
    this.setActiveItem(this.activeIndex);
  }

  @Watch('interval')
  handleIntervalChange() {
    this.resetTimer();
  }

  private playSlides = () => {
    if (this.activeIndex < this.items.length - 1) {
      this.activeIndex += 1;
    } else if (this.loop) {
      this.activeIndex = 0;
    }
  }

  private startTimer = () => {
    if (this.interval <= 0 || !this.autoplay || this.timer) {
      return;
    }
    this.timer = setInterval(() => this.playSlides(), this.interval);
  }

  private pauseTimer = () => {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private resetTimer = () => {
    this.pauseTimer();
    if (!this.pauseOnHover || !this.hover) {
      this.startTimer();
    }
  }

  private itemInStage = async (item: HTMLZaneCarouselItemElement, index: number) => {
    const itemCount = this.items.length;
    const itemInStage = await item.getInStage();
    if (itemCount === 0 || !itemInStage) {
      return false;
    }

    const nextItemIndex = index + 1;
    const prevItemIndex = index - 1;
    const lastItemIndex = itemCount - 1;
    const isLastItemActive = await this.items[lastItemIndex].getActive();
    const isFirstItemActive = this.items[0].getActive();
    const isNextItemActive = this.items[nextItemIndex]?.getActive();
    const isPrevItemActive = this.items[prevItemIndex]?.getActive();

    if ((index === lastItemIndex && !!isFirstItemActive) || !!isNextItemActive) {
      return 'left';
    } else if ((index === 0 && isLastItemActive) || !!isPrevItemActive) {
      return 'right';
    }
    return false;
  }

  private setActiveItem = (index: number | string) => {
    if (isString(index)) {
      const filteredItems = this.items.filter(item => item.name === index);
      if (filteredItems.length > 0) {
        index = this.items.indexOf(filteredItems[0]);
      }
    }
    index = Number(index);
    if (Number.isNaN(index) || index !== Math.floor(index)) {
      debugWarn(SCOPE, 'index must be integer.');
      return;
    }
    const itemCount = this.items.length;
    if (index < 0) {
      this.activeIndex = this.loop ? itemCount - 1 : 0;
    } else if (index >= itemCount) {
      this.activeIndex = this.loop ? 0 : itemCount - 1;
    } else {
      this.activeIndex = index;
    }

    const oldIndex = this.activeIndex;
    if (oldIndex === this.activeIndex) {
      this.resetItemPosition(oldIndex);
    }
    this.resetTimer();
  }

  private resetItemPosition = (oldIndex?: number) => {
    this.items.forEach((item, index) => {
      item.translateItem(index, this.activeIndex, oldIndex);
    });

  }

  private handleMouseEnter = () => {
    this.hover = true;
    if (this.pauseOnHover) {
      this.pauseTimer();
    }
  }

  private handleMouseLeave = () => {
    this.hover = false;
    this.startTimer();
  }

  private handleButtonEnter = (arrow: 'left' | 'right') => {
    if (this.isVertical) {
      return;
    }
    this.items.forEach(async (item, index) => {
      const inStage = await this.itemInStage(item, index);
      if (arrow === inStage) {
        item.setHover(true);
      }
    });
  }

  private handleLeftButtonEneter = () => {
    this.handleButtonEnter('left');
  }

  private handleRightButtonEnter = () => {
    this.handleButtonEnter('right');
  }

  private handleButtonLeave = () => {
    if (this.isVertical) {
      return;
    }
    this.items.forEach((item) => {
      item.setHover(false);
    });
  }

  private handleIndicatorHover = (index: number) => {
    if (this.trigger === 'hover' && index !== this.activeIndex) {
      this.activeIndex = index;
    }
  }

  private handleIndicatorClick = (index: number) => {
    this.activeIndex = index;
  }

  private throttledArrowClick = throttle(
    (index: number) => {
      this.setActiveItem(index);
    },
    THROTTLE_TIME,
    { trailing: true }
  );

  private throttledIndicatorHover = throttle(
    (index: number) => {
      this.handleIndicatorHover(index);
    },
    THROTTLE_TIME,
  );

  private handleThrottledLeftArrowClick = (e: MouseEvent) => {
    e.stopPropagation();
    this.throttledArrowClick(this.activeIndex - 1);
  }

  private handleThrottledRightArrowClick = (e: MouseEvent) => {
    e.stopPropagation();
    this.throttledArrowClick(this.activeIndex + 1);
  }

  componentWillLoad() {
    this.items = Array.from(this.el.querySelectorAll('zane-carousel-item'));
    this.context = new ReactiveObject<CarouselContext>({
      items: this.items,
      rootRef: this.rootRef,
      isCardType: this.isCardType,
      isVertical: this.isVertical,
      loop: this.loop,
      cardScale: this.cardScale,
      setActiveItem: this.setActiveItem,
      setContaninerHeight: (height: number) => {
        if (this.height !== 'auto') {
          return;
        }
        this.containerHeight = height;
      }
    });
    carouselContexts.set(this.el, this.context);

    this.updateArrowDisplay();
    this.updateIsCardType();
    this.updateIsVertical();

    this.setActiveItem(this.initialIndex);
    this.startTimer();
  }

  componentDidLoad() {
    if (this.rootRef) {
      this.context!.value.rootRef = this.rootRef;
    }
  }

  disconnectedCallback() {
    if (!hasRawParent(this.el)) {
      carouselContexts.delete(this.el);
    }
    this.pauseTimer();
  }
  
  render() {
    const { t } = state.i18n;
    
    const carouselClasses = [ns.b(), ns.m(this.direction)];
    if (this.isCardType) {
      carouselClasses.push(ns.m('card'));
    }
    carouselClasses.push(
      ns.is('vertical-outside', this.isVertical && this.indicatorPosition === 'outside'),
    );

    const containerStyle = this.height !== 'auto'
      ? { height: this.height }
      : {
        height: `${this.containerHeight}px`,
        overflow: 'hidden',
      }

    const indicatorsClasses = [ns.e('indicators'), ns.em('indicators', this.direction)];

    const hasLabel = this.items.some(item => item.label && item.label.toString().length > 0);

    if (hasLabel) {
      indicatorsClasses.push(ns.em('indicators', 'labels'));
    }
    if (this.indicatorPosition === 'outside') {
      indicatorsClasses.push(ns.em('indicators', 'outside'));
    }
    if (this.isVertical) {
      indicatorsClasses.push(ns.em('indicators', 'right'));
    }

    return (
      <div
        ref={el => (this.rootRef = el!)}
        class={carouselClasses.join(' ')}
        onMouseEnter={this.handleMouseEnter}
        onMouseLeave={this.handleMouseLeave}
      >
        {
          this.arrowDisplay && ([
            <button
              type="button"
              style={{
                display: (this.arrow === 'always' || this.hover) && (this.loop || this.activeIndex > 0) 
                  ? 'block' : 'none'
              }}
              class={classNames(ns.e('arrow'), ns.em('arrow', 'left'))}
              aria-label={t('carousel.leftArrow')}
              onMouseEnter={this.handleLeftButtonEneter}
              onMouseLeave={this.handleButtonLeave}
              onClick={this.handleThrottledLeftArrowClick}
            >
              <zane-icon name="arrow-left-line"></zane-icon>
            </button>,
            <button
              type="button"
              style={{
                display: (this.arrow === 'always' || this.hover) && (this.loop || this.activeIndex < this.items.length - 1) 
                  ? 'block' : 'none'
              }}
              class={classNames(ns.e('arrow'), ns.em('arrow', 'right'))}
              aria-label={t('carousel.rightArrow')}
              onMouseEnter={this.handleRightButtonEnter}
              onMouseLeave={this.handleButtonLeave}
              onClick={this.handleThrottledRightArrowClick}
            >
              <zane-icon name="arrow-right-line"></zane-icon>
            </button>
          ])
        }
        <div
          class={classNames(
            ns.e('container'),
          )}
          style={containerStyle}
        >
          <slot></slot>
        </div>
        {
          this.indicatorPosition !== 'none' && (
            <ul class={indicatorsClasses.join(' ')}>
              {
                this.items.map((item, index) => (
                  <li
                    key={index}
                    class={classNames(
                      ns.e('indicator'),
                      ns.em('indicator', this.direction),
                      ns.is('active', this.activeIndex === index)
                    )}
                    onMouseEnter={() => this.throttledIndicatorHover(index)}
                    onClick={() => this.handleIndicatorClick(index)}
                  >
                    <button
                      class={ns.e('button')}
                      aria-label={t('carousel.indicator', { params: { index: index + 1 } })}
                    >
                      {
                        hasLabel && (<span>{item.label}</span>)
                      }
                    </button>
                  </li>
                ))
              }
            </ul>
          )
        }
      </div>
    );
  }
}
