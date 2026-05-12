import type { ReactiveObject } from "../../utils/reactive/ReactiveObject";
import { carouselContexts } from "./constants";
import type { CarouselContext } from "./types";

export const getCarouselContext = (el: HTMLElement): ReactiveObject<CarouselContext> | undefined => {
  let parent: any = el.parentElement;
  let context = undefined;
  while (parent) {
    if (parent.tagName === "ZANE-CAROUSEL") {
      context = carouselContexts.get(parent);
      break;
    }
    parent = parent.rawParent ?? parent.parentElement;
  }
  return context;
}
