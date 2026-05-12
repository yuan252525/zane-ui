import type { ReactiveObject } from '../../utils/reactive/ReactiveObject';
import { menuContexts, subMenuContexts } from './constants';
import type { MenuContext, SubMenuContext } from './types';

export const getMenuContext = (el: HTMLElement): ReactiveObject<MenuContext> | null => {
  let parent: any = el.parentElement;
  let context = null;
  while (parent) {
    if (parent.tagName === 'ZANE-MENU') {
      context = menuContexts.get(parent);
      break;
    }
    parent = parent.rawParent ?? parent.parentElement;
  }
  return context;
};

export const getSubMenuContext = (el: HTMLElement): ReactiveObject<SubMenuContext> | null => {
  let parent: any = el.parentElement;
  let context = null;
  while (parent) {
    if (parent.tagName === 'ZANE-SUB-MENU') {
      context = subMenuContexts.get(parent);
      break;
    }
    parent = parent.rawParent ?? parent.parentElement;
  }
  return context;
};
