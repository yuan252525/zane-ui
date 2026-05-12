import type { ReactiveObject } from "../../utils/reactive/ReactiveObject";
import { descriptionsContexts } from "./constants";
import type { DescriptionsContext } from "./types";

export const getDescriptionsContext = (el: HTMLElement): ReactiveObject<DescriptionsContext> | undefined => {
  let parent: any = el.parentElement;
  let context = undefined;
  while (parent) {
    if (parent.tagName === "ZANE-DESCRIPTIONS") {
      context = descriptionsContexts.get(parent);
      break;
    }
    parent = parent.rawParent ?? parent.parentElement;
  }
  return context;
}
