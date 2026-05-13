'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * Wraps a section so the user's cursor acts as the sun.
 * Every text element inside gets a warm golden text-shadow
 * cast in the opposite direction — like a sundial.
 */
export default function SundialCursor({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0, active: false });

  const update = useCallback(() => {
    const container = containerRef.current;
    if (!container || !mouseRef.current.active) return;

    const { x: mx, y: my } = mouseRef.current;

    // Query all text-bearing elements inside the container
    const els = container.querySelectorAll<HTMLElement>(
      'h1, h2, h3, p, span, a, button, li'
    );

    els.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const elCenterX = rect.left + rect.width / 2;
      const elCenterY = rect.top + rect.height / 2;

      // Vector from cursor (sun) to element
      const dx = elCenterX - mx;
      const dy = elCenterY - my;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 1) {
        el.style.textShadow = 'none';
        return;
      }

      // Normalize direction
      const nx = dx / dist;
      const ny = dy / dist;

      // Shadow length — closer to cursor = longer shadow (sun low on horizon)
      // Further away = shorter shadow (sun high overhead)
      // Max distance ~800px, shadow range 2–18px
      const maxShadow = 16;
      const minShadow = 2;
      const proximity = Math.max(0, 1 - dist / 900);
      const shadowLen = minShadow + proximity * (maxShadow - minShadow);

      // Shadow offset (cast away from cursor)
      const sx = nx * shadowLen;
      const sy = ny * shadowLen;

      // Blur — tighter when close, softer when far
      const blur = 2 + (1 - proximity) * 6;

      // Opacity — stronger when close
      const opacity = 0.08 + proximity * 0.18;

      // Warm golden shadow color: #C9A84C with variable opacity
      el.style.textShadow =
        `${sx.toFixed(1)}px ${sy.toFixed(1)}px ${blur.toFixed(1)}px rgba(180, 150, 60, ${opacity.toFixed(3)})`;
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, active: true };
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(update);
    };

    const onLeave = () => {
      mouseRef.current.active = false;
      // Fade out shadows
      const els = container.querySelectorAll<HTMLElement>(
        'h1, h2, h3, p, span, a, button, li'
      );
      els.forEach((el) => {
        el.style.transition = 'text-shadow 0.6s ease-out';
        el.style.textShadow = 'none';
        // Remove transition after it completes so it doesn't slow down mousemove
        setTimeout(() => { el.style.transition = ''; }, 600);
      });
    };

    // Listen on window so cursor outside container still casts angled shadows
    window.addEventListener('mousemove', onMove);
    container.addEventListener('mouseleave', onLeave);

    return () => {
      window.removeEventListener('mousemove', onMove);
      container.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, [update]);

  return (
    <div ref={containerRef} className="contents">
      {children}
    </div>
  );
}
