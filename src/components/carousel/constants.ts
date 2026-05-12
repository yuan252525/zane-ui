import type { ReactiveObject } from "../../utils/reactive/ReactiveObject";
import type { CarouselContext } from "./types";

export const carouselContexts = new WeakMap<
  HTMLElement,
  ReactiveObject<CarouselContext>
>();
