import { isLeaf } from "../../utils";
import type { ReactiveObject } from "../../utils/reactive/ReactiveObject";
import { cascaderPanelContexts } from "./constants";
import type { CascaderNode } from "./node";
import type { CascaderPanelContext } from "./types";

export const getCascaderPanelContext = (el: HTMLElement): ReactiveObject<CascaderPanelContext> | undefined => {
  let parent: any = el.parentElement;
  let context = undefined;
  while (parent) {
    if (parent.tagName === "ZANE-CASCADER-PANEL") {
      context = cascaderPanelContexts.get(parent);
      break;
    }
    parent = parent.rawParent ?? parent.parentElement;
  }
  return context;
}

export const sortByOriginalOrder = (
  oldNodes: CascaderNode[],
  newNodes: CascaderNode[]
) => {
  const newNodesCopy = newNodes.slice(0)
  const newIds = newNodesCopy.map((node) => node.uid)
  const res = oldNodes.reduce((acc, item) => {
    const index = newIds.indexOf(item.uid)
    if (index > -1) {
      acc.push(item)
      newNodesCopy.splice(index, 1)
      newIds.splice(index, 1)
    }
    return acc
  }, [] as CascaderNode[])

  res.push(...newNodesCopy)

  return res
}

export const getMenuIndex = (el: HTMLElement) => {
  if (!el) return 0
  const pieces = el.id.split('-')
  return Number(pieces[pieces.length - 2])
}

export const checkNode = (el: HTMLElement) => {
  if (!el) return

  const input = el.querySelector('input')
  if (input) {
    input.click()
  } else if (isLeaf(el)) {
    el.click()
  }
}
