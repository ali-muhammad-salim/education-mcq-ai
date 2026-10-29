'use client';
import { useEffect, useRef } from 'react';
let openDialogCount = 0;
let previousBodyOverflow = '';
export function useDialog(open: boolean, label: string, close: () => void) {
  const ref = useRef<HTMLDivElement>(null), closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open || !ref.current) return;
    // Nested dialogs share one scroll lock; closing the inner dialog must not unlock the page.
    if (openDialogCount === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    openDialogCount += 1;
    const root = ref.current, previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () => Array.from(root.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex="0"]')).filter(el => !el.hasAttribute('disabled') && el.getClientRects().length);
    (focusable()[0] || root).focus();
    const key = (e: KeyboardEvent) => {
      const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
      if (dialogs.at(-1) !== root) return;
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current(); }
      if (e.key === 'Tab') { const items = focusable(), first = items[0], last = items.at(-1); if (!first) { e.preventDefault(); root.focus(); } else if (e.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) { e.preventDefault(); first.focus(); } }
    };
    document.addEventListener('keydown', key);
    return () => { openDialogCount -= 1; if (openDialogCount === 0) document.body.style.overflow = previousBodyOverflow; document.removeEventListener('keydown', key); if (previous?.isConnected) previous.focus(); };
  }, [open]);
  return { ref, role: 'dialog' as const, 'aria-modal': true as const, 'aria-label': label, tabIndex: -1 };
}
