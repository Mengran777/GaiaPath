"use client";

// With scrollbars hidden, an inner scroll area fades its top or bottom edge only
// while there is more content that way. Pair with the `scroll-fade` class
// (globals.css), which reads the data-fade-top / data-fade-bottom attributes.
import { useCallback, useRef } from "react";

export function useScrollFade<T extends HTMLElement>() {
  const cleanup = useRef<(() => void) | null>(null);

  return useCallback((el: T | null) => {
    cleanup.current?.();
    cleanup.current = null;
    if (!el) return;

    const update = () => {
      const more = el.scrollHeight - el.clientHeight > 2;
      el.dataset.fadeTop = more && el.scrollTop > 2 ? "1" : "";
      el.dataset.fadeBottom = more && el.scrollTop + el.clientHeight < el.scrollHeight - 2 ? "1" : "";
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    // Content can grow or shrink (photos load, drawers open)
    const resize = new ResizeObserver(update);
    resize.observe(el);
    Array.from(el.children).forEach((c) => resize.observe(c));
    const mutate = new MutationObserver(update);
    mutate.observe(el, { childList: true, subtree: true });

    cleanup.current = () => {
      el.removeEventListener("scroll", update);
      resize.disconnect();
      mutate.disconnect();
    };
  }, []);
}
