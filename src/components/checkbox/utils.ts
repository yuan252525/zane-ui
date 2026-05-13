import type { ReactiveObject } from "../../utils";
import type { CheckboxGroupContext } from "./types";
import { checkboxGroupContexts } from "./constants";

export const getCheckboxGroupContext = (el: HTMLElement): ReactiveObject<CheckboxGroupContext> | undefined => {
  let parent: any = el.parentElement;
  let context = undefined;
  while (parent) {
    if (parent.tagName === "ZANE-CHECKBOX-GROUP") {
      context = checkboxGroupContexts.get(parent);
      break;
    }
    parent = parent.rawParent ?? parent.parentElement;
  }
  return context;
}
