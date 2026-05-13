import type { ReactiveObject } from "../../utils/reactive/ReactiveObject";
import type { Arrayable } from "../../types"
import { formContexts, formItemContexts } from "./constants"
import type { FormContext, FormItemContext, FormItemProp } from "./types"
import { castArray } from 'lodash-es';

export const filterFields = (
  fields: ReactiveObject<FormItemContext>[],
  props: Arrayable<FormItemProp>
) => {
  const normalized = castArray(props).map((prop) =>
    Array.isArray(prop) ? prop.join('.') : prop
  )
  return normalized.length > 0
    ? fields.filter(
        (field) => field.value.propString && normalized.includes(field.value.propString)
      )
    : fields
}

export const getFormContext = (el: HTMLElement): ReactiveObject<FormContext> | undefined => {
  let parent: any = el.parentElement, context = undefined;
  while (parent) {
    if (parent.tagName === 'ZANE-FORM') {
      context = formContexts.get(parent);
      break;
    }
    parent = parent.rawParent ?? parent.parentElement;
  }
  return context;
}

export const getFormItemContext = (el: HTMLElement): ReactiveObject<FormItemContext> | undefined => {
  let parent: any = el.parentElement, context = undefined;
  while (parent) {
    if (parent.tagName === 'ZANE-FORM-ITEM') {
      context = formItemContexts.get(parent);
      break;
    }
    parent = parent.rawParent ?? parent.parentElement;
  }
  return context;
}
