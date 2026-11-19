'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { isMotionRoute, shouldAnimateActivation } from '@/lib/interaction-policy';

/** Progressive enhancement only: never capture, cancel or delay native actions. */
export default function SiteInteractions() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || !isMotionRoute(pathname)) return;
    const body = document.body;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const running = new Map<Element, Animation>();
    body.dataset.riseMotion = 'on';

    const cancelAnimations = () => {
      for (const animation of running.values()) animation.cancel();
      running.clear();
    };
    const onPreference = () => { if (preference.matches) cancelAnimations(); };
    const activate = (event: MouseEvent) => {
      const source = event.target instanceof Element ? event.target : null;
      const target = source?.closest('a[href], button, summary, [role="button"], [role="tab"], input[type="checkbox"], input[type="radio"]');
      if (!(target instanceof HTMLElement) || typeof target.animate !== 'function') return;
      if (!shouldAnimateActivation({
        reducedMotion: preference.matches,
        disabled: target.matches(':disabled') || !!target.closest('[aria-disabled="true"], [inert]'),
        protectedContent: !!document.querySelector('[data-paper-page]') || !!target.closest('[data-motion="off"], [contenteditable="true"]'),
        defaultPrevented: event.defaultPrevented,
        button: event.button,
        modified: event.metaKey || event.ctrlKey || event.shiftKey || event.altKey,
      })) return;
      running.get(target)?.cancel();
      const style = getComputedStyle(target);
      const ink = style.getPropertyValue('--r-emerald').trim() || '#0b5e4a';
      // An ink wash also works on tiny inline links without changing their box.
      const animation = target.animate([
        { backgroundColor: `color-mix(in srgb, ${ink} 22%, ${style.backgroundColor})` },
        { backgroundColor: style.backgroundColor },
      ], { duration: 320, easing: 'cubic-bezier(.16,1,.3,1)' });
      running.set(target, animation);
      const clear = () => { if (running.get(target) === animation) running.delete(target); };
      animation.addEventListener('finish', clear, { once: true });
      animation.addEventListener('cancel', clear, { once: true });
    };

    document.addEventListener('click', activate);
    preference.addEventListener('change', onPreference);
    return () => {
      document.removeEventListener('click', activate);
      preference.removeEventListener('change', onPreference);
      cancelAnimations();
      delete body.dataset.riseMotion;
    };
  }, [pathname]);

  return null;
}
