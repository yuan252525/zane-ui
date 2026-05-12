import { Component, Element, h, Method, Prop, State, Watch, Event, type EventEmitter, Host } from '@stencil/core';
import { addClass, div, normalizeStyle, removeClass } from '../../utils';
import tippy, {
  Instance,
  Props,
  animateFill as animateFillPlug,
  followCursor as followCursorPlug,
  inlinePositioning as inlinePositioningPlug,
  sticky as stickyPlug
} from 'tippy.js';
import { getChildren } from './utils';
import type { TippyProps } from './types';
import { setElementStyleValue } from '../../utils/dom/style/setElementStyleValue';

@Component({
  tag: 'zane-tippy',
  styleUrl: 'zane-tippy.css'
})
export class ZaneTippy {

  @Element() el!: HTMLElement;

  @Prop() to?: string | 'parent' | HTMLElement;

  @Prop() tag: string = 'span';

  @Prop() contentTag: string = 'span';

  @Prop() boxClass: string = '';

  @Prop() boxStyle?: Record<string, any> = undefined;

  @Prop() contentClass: string = '';

  @Prop() contentStyle?: Record<string, any> = undefined;

  @Prop() disabled: boolean = false;

  @Prop() appendTo = tippy.defaultProps.appendTo;

  @Prop() aria = tippy.defaultProps.aria;

  @Prop() delay = tippy.defaultProps.delay;

  @Prop() duration = tippy.defaultProps.duration;

  @Prop() getReferenceClientRect = tippy.defaultProps.getReferenceClientRect;

  @Prop() hideOnClick = tippy.defaultProps.hideOnClick;

  @Prop() ignoreAttributes = tippy.defaultProps.ignoreAttributes;

  @Prop() interactive = tippy.defaultProps.interactive;

  @Prop() interactiveBorder = tippy.defaultProps.interactiveBorder;

  @Prop() interactiveDebounce = tippy.defaultProps.interactiveDebounce;

  @Prop() moveTransition = tippy.defaultProps.moveTransition;

  @Prop() offset = tippy.defaultProps.offset;

  @Prop() placement = tippy.defaultProps.placement;

  @Prop() plugins = tippy.defaultProps.plugins;

  @Prop() popperOptions = tippy.defaultProps.popperOptions;

  @Prop() tippyRender = tippy.defaultProps.render;

  @Prop() showOnCreate = tippy.defaultProps.showOnCreate;

  @Prop() touch = tippy.defaultProps.touch;

  @Prop() trigger = tippy.defaultProps.trigger;

  @Prop() triggerTarget = tippy.defaultProps.triggerTarget;

  @Prop() animateFill = tippy.defaultProps.animateFill;

  @Prop() followCursor = tippy.defaultProps.followCursor;

  @Prop() inlinePositioning = tippy.defaultProps.inlinePositioning;

  @Prop() sticky = tippy.defaultProps.sticky;

  @Prop() allowHTML = tippy.defaultProps.allowHTML;

  @Prop() animation = tippy.defaultProps.animation;

  @Prop() arrow = tippy.defaultProps.arrow;

  @Prop() inertia = tippy.defaultProps.inertia;

  @Prop() maxWidth = tippy.defaultProps.maxWidth;

  @Prop() role = tippy.defaultProps.role;

  @Prop() theme = tippy.defaultProps.theme;

  @Prop() zIndex = tippy.defaultProps.zIndex;

  /**
   * 内容支持字符串（直接作为 HTML 或文本）
   */
  @Prop() content?: string;

  @State() internalContent: HTMLElement | string = '';

  @Event({ eventName: 'afterUpdate', bubbles: false })
  afterUpdateEvent?: EventEmitter<[Instance<Props>, Partial<Props>]>

  @Event({ eventName: 'beforeUpdate', bubbles: false })
  beforeUpdateEvent?: EventEmitter<[Instance<Props>, Partial<Props>]>

  @Event({ eventName: 'create', bubbles: false })
  createEvent?: EventEmitter<Instance<Props>>

  @Event({ eventName: 'destroy', bubbles: false })
  destroyEvent?: EventEmitter<Instance<Props>>

  @Event({ eventName: 'hidden', bubbles: false })
  hiddenEvent?: EventEmitter<Instance<Props>>

  @Event({ eventName: 'zHide', bubbles: false })
  hideEvent?: EventEmitter<Instance<Props>>

  @Event({ eventName: 'mount', bubbles: false })
  mountEvent?: EventEmitter<Instance<Props>>

  @Event({ eventName: 'zShow', bubbles: false })
  showEvent?: EventEmitter<Instance<Props>>

  @Event({ eventName: 'shown', bubbles: false })
  shownEvent?: EventEmitter<Instance<Props>>

  @Event({ eventName: 'trigger', bubbles: false })
  triggerEvent?: EventEmitter<[Instance<Props>, Event]>

  @Event({ eventName: 'untrigger', bubbles: false })
  untriggerEvent?: EventEmitter<[Instance<Props>, Event]>

  @Event({ eventName: 'clickOutside', bubbles: false })
  clickOutsideEvent?: EventEmitter<[Instance<Props>, Event]>

  @Event({ eventName: 'state', bubbles: false })
  stateEvent?: EventEmitter<{
    isEnabled: boolean
    isVisible: boolean
    isDestroyed: boolean
    isMounted: boolean
    isShown: boolean
  }>;

  private hasContentSlot: boolean = false;

  private tippyInstance?: Instance;

  private contentEl?: HTMLElement;

  private state = {
    isEnabled: false,
    isVisible: false,
    isDestroyed: false,
    isMounted: false,
    isShown: false,
  }

  componentWillLoad() {
    this.hasContentSlot = !!this.el.querySelector('[slot="content"]');
    if (this.content) {
      this.internalContent = this.content;
    }
  }

  componentDidLoad() {
    this.initializeTippy();
    this.updateDisabled();
    this.updateContent();
  }

  componentWillRender() {
    if (this.contentEl) {
      const contentSlot = this.el.querySelector('[slot="content"]') as HTMLElement;
      // 直接循环 childNodes
      while (this.contentEl.firstChild) {
        contentSlot.append(this.contentEl.firstChild);
      }
    }
  }

  componentDidRender() {
    this.updateContent();
  }

  disconnectedCallback() {
    this.destroyTippy();
  }

  @Watch('to')
  @Watch('tag')
  @Watch('contentTag')
  @Watch('contentClass')
  @Watch('content')
  @Watch('disabled')
  @Watch('aria')
  @Watch('delay')
  @Watch('duration')
  @Watch('getReferenceClientRect')
  @Watch('hideOnClick')
  @Watch('ignoreAttributes')
  @Watch('interactive')
  @Watch('interactiveBorder')
  @Watch('interactiveDebounce')
  @Watch('moveTransition')
  @Watch('offset')
  @Watch('placement')
  @Watch('plugins')
  @Watch('popperOptions')
  @Watch('render')
  @Watch('showOnCreate')
  @Watch('touch')
  @Watch('trigger')
  @Watch('triggerTarget')
  @Watch('animateFill')
  @Watch('followCursor')
  @Watch('inlinePositioning')
  @Watch('sticky')
  @Watch('allowHTML')
  @Watch('animation')
  @Watch('arrow')
  @Watch('inertia')
  @Watch('maxWidth')
  @Watch('role')
  @Watch('theme')
  @Watch('zIndex')
  handlePropsChanged() {
    if (this.tippyInstance) {
      this.updateTippyProps();
    }
    if (this.content) {
      this.internalContent = this.content;
      this.updateContent();
    }
    this.updateDisabled();
  }

  private getTargetElement = (): HTMLElement | Element | null => {
    if (this.to === 'parent') {
      return this.el.parentElement;
    } else if (this.to instanceof HTMLElement) {
      return this.to;
    } else if (typeof this.to === 'string') {
      return document.querySelector(this.to);
    } else {
      return this.el;
    }
  }

  private getContentValue = (): HTMLElement | string => {
    // 优先试用 contentElement（来自 slot）
    const contentSlot = this.el.querySelector('[slot="content"]') as HTMLElement;
    if (contentSlot) {
      // 如果内容容器不存在则创建，否则复用
      if (!this.contentEl) {
        this.contentEl = div();
      }
      (this.contentEl as any).rawParent = contentSlot.parentElement;
      // 更新 class
      this.contentEl.className = this.contentClass || '';
      // 清空旧内容
      this.contentEl.innerHTML = '';
      // 直接循环 childNodes
      while (contentSlot.firstChild) {
        this.contentEl.append(contentSlot.firstChild);
      }
      return this.contentEl;
    }
    // 否则试用 content 属性字符串
    return this.internalContent || this.content || '';
  }

  private getTippyProps = (): Partial<TippyProps> => {
    // 收集所有 props 中属于 tippy 的选项，排除自定义的属性

    const tippyProps: Partial<TippyProps> = {
      boxClass: this.boxClass,
      boxStyle: this.boxStyle,
      contentClass: this.contentClass,
      contentStyle: this.contentStyle,
      appendTo: this.appendTo,
      aria: this.aria,
      delay: this.delay,
      duration: this.duration,
      getReferenceClientRect: this.getReferenceClientRect,
      hideOnClick: this.hideOnClick,
      ignoreAttributes: this.ignoreAttributes,
      interactive: this.interactive,
      interactiveBorder: this.interactiveBorder,
      interactiveDebounce: this.interactiveDebounce,
      moveTransition: this.moveTransition,
      offset: this.offset,
      placement: this.placement,
      plugins: this.plugins,
      popperOptions: this.popperOptions,
      render: this.tippyRender,
      showOnCreate: this.showOnCreate,
      touch: this.touch,
      trigger: this.trigger,
      triggerTarget: this.triggerTarget,
      animateFill: this.animateFill,
      followCursor: this.followCursor,
      inlinePositioning: this.inlinePositioning,
      sticky: this.sticky,
      allowHTML: this.allowHTML,
      animation: this.animation,
      arrow: this.arrow,
      inertia: this.inertia,
      maxWidth: this.maxWidth,
      role: this.role,
      theme: this.theme,
      zIndex: this.zIndex,
      onAfterUpdate: (instance, partialProps) => {
        this.afterUpdateEvent?.emit([instance, partialProps]);
      },
      onBeforeUpdate: (instance, partialProps) => {
        this.beforeUpdateEvent?.emit([instance, partialProps]);
      },
      onCreate: (instance) => {
        this.createEvent?.emit(instance);
      },
      onDestroy: (instance) => {
        this.destroyEvent?.emit(instance);
      },
      onHidden: (instance) => {
        this.hiddenEvent?.emit(instance);
      },
      onHide: (instance) => {
        this.hideEvent?.emit(instance);
      },
      onMount: (instance) => {
        this.mountEvent?.emit(instance);
      },
      onShow: (instance) => {
        this.showEvent?.emit(instance);
      },
      onShown: (instance) => {
        this.shownEvent?.emit(instance);
      },
      onTrigger: (instance, event) => {
        this.triggerEvent?.emit([instance, event]);
      },
      onUntrigger: (instance, event) => {
        this.untriggerEvent?.emit([instance, event]);
      },
      onClickOutside: (instance, event) => {
        this.clickOutsideEvent?.emit([instance, event]);
      }
    };

    return {
      ...tippyProps,
      // 添加内置插件以更新内部状态
      plugins: [
        ...(tippyProps.plugins || []),
        animateFillPlug,
        followCursorPlug,
        inlinePositioningPlug,
        stickyPlug,
        {
          name: 'boxClass',
          fn: (instance: Instance) => {
            const { box } = getChildren(instance.popper);
            const render: any = instance.props.render;
            const isDefaultRenderFn = () => !!render?.$$tippy;

            function add() {
              if (!isDefaultRenderFn()) {
                return;
              }

              const instanceProps: any = instance.props;
              if (instanceProps.boxClass) {
                addClass(box, instanceProps.boxClass);
              }
            }

            function remove() {
              if (!isDefaultRenderFn()) {
                return;
              }

              const instanceProps: any = instance.props;
              if (instanceProps.boxClass) {
                removeClass(box, instanceProps.boxClass);
              }
            }

            return {
              onCreate: add,
              onBeforeUpdate: remove,
              onAfterUpdate: add,
            };
          }
        },
        {
          name: 'boxStyle',
          fn: (instance: Instance) => {
            const { box } = getChildren(instance.popper);
            const render: any = instance.props.render;
            const isDefaultRenderFn = () => !!render?.$$tippy;

            const oldBoxStyle = normalizeStyle(box.style);

            function add() {
              if (!isDefaultRenderFn()) {
                return;
              }

              const instanceProps: any = instance.props;

              if (instanceProps.boxStyle) {
                setElementStyleValue(box, instanceProps.boxStyle);
              }
            }

            function remove() {
              if (!isDefaultRenderFn()) {
                return;
              }

              const instanceProps: any = instance.props;

              if (instanceProps.boxStyle) {
                Object.keys(instanceProps.boxStyle).forEach((key) => {
                  setElementStyleValue(box, key, oldBoxStyle[key]);
                });
              }
            }

            return {
              onCreate: add,
              onBeforeUpdate: remove,
              onAfterUpdate: add,
            };
          }
        },
        {
          name: 'contentClass',
          fn: (instance: Instance) => {
            const { content } = getChildren(instance.popper);
            const render: any = instance.props.render;
            const isDefaultRenderFn = () => !!render?.$$tippy;

            function add() {
              if (!isDefaultRenderFn()) {
                return;
              }

              const instanceProps: any = instance.props;
              if (instanceProps.contentClass) {
                addClass(content, instanceProps.contentClass);
              }
            }

            function remove() {
              if (!isDefaultRenderFn()) {
                return;
              }

              const instanceProps: any = instance.props;
              if (instanceProps.contentClass) {
                removeClass(content, instanceProps.contentClass);
              }
            }

            return {
              onCreate: add,
              onBeforeUpdate: remove,
              onAfterUpdate: add,
            };
          }
        },
        {
          name: 'contentStyle',
          fn: (instance: Instance) => {
            const { content } = getChildren(instance.popper);
            const render: any = instance.props.render;
            const isDefaultRenderFn = () => !!render?.$$tippy;

            const oldContentStyle = normalizeStyle(content.style);

            function add() {
              if (!isDefaultRenderFn()) {
                return;
              }

              const instanceProps: any = instance.props;
              if (instanceProps.contentStyle) {
                setElementStyleValue(content, instanceProps.contentStyle);
              }
            }

            function remove() {
              if (!isDefaultRenderFn()) {
                return;
              }

              const instanceProps: any = instance.props;
              if (instanceProps.contentStyle) {
                Object.keys(instanceProps.contentStyle).forEach((key) => {
                  setElementStyleValue(content, key, oldContentStyle[key]);
                });
              }
            }

            return {
              onCreate: add,
              onBeforeUpdate: remove,
              onAfterUpdate: add,
            };
          }
        },
        {
          name: 'tippyReactiveState',
          fn: () => ({
            onCreate: () => {
              this.state.isEnabled = true;
              this.stateEvent?.emit(this.state);
            },
            onMount: () => {
              this.state.isMounted = true;
              this.stateEvent?.emit(this.state);
            },
            onShow: () => {
              this.state.isMounted = true;
              this.state.isVisible = true;
              this.stateEvent?.emit(this.state);
            },
            onShown: () => {
              this.state.isShown = true;
              this.stateEvent?.emit(this.state);
            },
            onHide: () => {
              this.state.isMounted = false;
              this.state.isVisible = false;
              this.stateEvent?.emit(this.state);
            },
            onHidden: () => {
              this.state.isShown = false;
              this.stateEvent?.emit(this.state);
            },
            onDestroy: () => {
              this.state.isMounted = false;
              this.state.isDestroyed = true;
              this.stateEvent?.emit(this.state);
            }
          })
        }
      ]
    }
  }

  @Method()
  async show() {
    this.tippyInstance?.show();
  }

  @Method()
  async hide() {
    this.tippyInstance?.hide();
  }

  @Method()
  async disable() {
    this.tippyInstance?.disable();
  }

  @Method()
  async enable() {
    this.tippyInstance?.enable();
  }

  @Method()
  async destroy() {
    this.tippyInstance?.destroy();
  }

  @Method()
  async setContent(newContent: string | HTMLElement) {
    this.internalContent = newContent;
    this.updateContent();
  }

  @Method()
  async updateTippyProps() {
    if (this.tippyInstance) {
      this.tippyInstance.setProps(this.getTippyProps());
    }
  }

  @Method()
  async isFocusInsideContent(event?: FocusEvent) {
    const popperContent: HTMLElement | undefined = this.tippyInstance?.popper;
    const activeElement =
      (event?.relatedTarget as Node) || document.activeElement;
    return popperContent?.contains(activeElement);
  }

  @Method()
  async isVisible() {
    return this.tippyInstance?.state.isVisible;
  }

  private initializeTippy = () => {
    const target = this.getTargetElement();
    if (!target) return;

    const props = this.getTippyProps();
    this.tippyInstance = tippy(target, props);
  }

  private destroyTippy = () => {
    if (this.tippyInstance) {
      this.tippyInstance.destroy();
      this.tippyInstance = undefined;
    }
  }

  private updateContent = () => {
    if (this.tippyInstance) {
      const content = this.getContentValue();
      this.tippyInstance.setContent(content);
    }
  }

  private updateDisabled = () => {
    // 更新禁用状态
    if (this.disabled) {
      this.tippyInstance?.disable();
    } else {
      this.tippyInstance?.enable();
    }
  }

  render() {

    return (
      <Host>
        <slot></slot>
        {
          this.hasContentSlot && (
            <span
              style={{
                display: 'none'
              }}
            >
              <slot name="content"></slot>
            </span>
          )
        }
      </Host>
    );
  }
}
