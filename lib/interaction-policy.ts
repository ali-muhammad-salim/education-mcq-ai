/** Document readers are intentionally outside the site-wide motion layer. */
export function isMotionRoute(pathname: string): boolean {
  return !/^\/(?:past-papers|materials)\//.test(pathname)
    && !/\/model-papers\/[^/]+\/?$/.test(pathname);
}

export interface ActivationContext {
  reducedMotion: boolean;
  disabled: boolean;
  protectedContent: boolean;
  defaultPrevented: boolean;
  button: number;
  modified: boolean;
}

export function shouldAnimateActivation(context: ActivationContext): boolean {
  return !context.reducedMotion && !context.disabled && !context.protectedContent
    && !context.defaultPrevented && context.button === 0 && !context.modified;
}
