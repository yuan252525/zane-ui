import type { ReactiveObject } from "../../utils/reactive/ReactiveObject";
import type { DescriptionsContext } from "./types";

export const descriptionsContexts = new WeakMap<
  HTMLElement,
  ReactiveObject<DescriptionsContext>
>();
