import type { ReactiveObject } from "../../utils/reactive/ReactiveObject";
import type { AvatarGroupContext } from "./types";

export const avatarGroupContexts = new WeakMap<
  HTMLElement,
  ReactiveObject<AvatarGroupContext>
>();
