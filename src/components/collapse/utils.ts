import type { ReactiveObject } from "../../utils/reactive/ReactiveObject";
import type { CollapseContext } from "./types";
import { collapseContexts } from "./constants";

export const getCollapseContext = (el: HTMLElement): ReactiveObject<CollapseContext> | undefined => {
  let parent: any = el.parentElement;
  let context = undefined;
  while (parent) {
    if (parent.tagName === 'ZANE-COLLAPSE') {
      context = collapseContexts.get(parent);
      break;
    }
    parent = parent.rawParent ?? parent.parentElement;
  }
  return context;
}
