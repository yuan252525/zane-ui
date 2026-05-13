import type { ReactiveObject } from "../../utils/reactive/ReactiveObject";
import type { ConfigProviderContext } from "./types";
import { configProviderContexts } from "./constants";

export const getConfigProviderContext = (el: HTMLElement): ReactiveObject<ConfigProviderContext> | undefined => {
  let parent: any = el.parentElement;
  let context = undefined;
  while (parent) {
    if (parent.tagName === 'ZANE-CONFIG-PROVIDER') {
      context = configProviderContexts.get(parent);
      break;
    }
    parent = parent.rawParent ?? parent.parentElement;
  }
  return context;
}
