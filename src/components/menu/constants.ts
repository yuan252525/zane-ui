import type { ReactiveObject } from '../../utils/reactive/ReactiveObject';
import type { MenuContext, SubMenuContext } from './types';

export const menuContexts = new WeakMap<
  HTMLElement,
  ReactiveObject<MenuContext>
>();

export const subMenuContexts = new WeakMap<
  HTMLElement,
  ReactiveObject<SubMenuContext>
>();
