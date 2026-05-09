import type { ReactiveObject } from "../../utils";
import type { ButtonGroupContext } from "./types";
import { buttonGroupContexts } from "./constants";

export const getButtonGroupContext = (el: HTMLElement): ReactiveObject<ButtonGroupContext> | undefined => {
  let parent: any = el.parentElement;
  let context = undefined;
  while (parent) {
    if (parent.tagName === 'ZANE-BUTTON-GROUP') {
      context = buttonGroupContexts.get(parent);
      break;
    }
    parent = parent.rawParent ?? parent.parentElement;
  }
  return context;
}
