import type { ReactiveObject } from "../../utils/reactive/ReactiveObject";
import { rowContexts } from "./constants";
import type { RowContext } from "./types";

export const getRowContext = (el: HTMLElement): ReactiveObject<RowContext> | undefined => {
  let parent: any = el.parentElement;
  let context = undefined;
  while (parent) {
    if (parent.tagName === "ZANE-ROW") {
      context = rowContexts.get(parent);
      break;
    }
    parent = parent.rawParent ?? parent.parentElement;
  }
  return context;
};
