/**
 * GiuPay — useReveal hook (Step 16)
 * IntersectionObserver-based scroll entry animation.
 * Extract từ HomePage — dùng chung toàn app.
 *
 * Usage:
 *   const { ref, visible } = useReveal();
 *   <div ref={ref} style={revealStyle(visible, 100)}>...</div>
 */

"use client";

import { useRef, useState, useEffect } from "react";

export function useReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect(); // fire once only
        }
      },
      { threshold }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

/**
 * Inline style helper — pair with useReveal.
 * @param visible - từ useReveal()
 * @param delay   - stagger delay ms (e.g. index * 80)
 */
export function revealStyle(visible: boolean, delay = 0): React.CSSProperties {
  return {
    opacity:   visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(12px)",
    transition: `opacity 600ms cubic-bezier(0.16,1,0.3,1) ${delay}ms,
                 transform 600ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  };
}