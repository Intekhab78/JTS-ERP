import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * FloatingMenu
 * ------------
 * Drop-in replacement for an `absolute` dropdown placed inside a `relative` wrapper
 * (e.g. a Three-Dot "⋮" action menu).
 *
 * The menu is rendered in a portal on `document.body` with `position: fixed`, so it is
 * never hidden behind sibling cards, never clipped by `overflow-hidden` parents and is
 * not affected by ancestor CSS transforms / animations.
 *
 * Positioning is anchored to the parent element of the placeholder (the `relative`
 * wrapper around the trigger button). It aligns to the right edge of the trigger and
 * automatically flips upward when there is not enough room below.
 *
 * Elements inside carry `data-floating-menu="true"` so outside-click handlers can ignore them.
 */
export const FloatingMenu = ({ width = 240, className = '', style = {}, onClose, children }) => {
  const anchorRef = useRef(null);
  const menuRef = useRef(null);
  const [pos, setPos] = useState(null);

  const computePosition = () => {
    const anchor = anchorRef.current?.parentElement;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight || 240;
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;

    const spaceBelow = viewportH - rect.bottom;
    const openUp = spaceBelow < menuHeight + 12 && rect.top > spaceBelow;

    const left = Math.max(8, Math.min(rect.right - width, viewportW - width - 8));
    let top = openUp ? rect.top - menuHeight - 6 : rect.bottom + 6;
    top = Math.max(8, Math.min(top, viewportH - menuHeight - 8));

    setPos({ top, left, openUp });
  };

  useLayoutEffect(() => {
    computePosition();
    const raf = requestAnimationFrame(computePosition);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleReposition = () => computePosition();
    const handleKey = (e) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    const handleOutside = (e) => {
      if (!onClose) return;
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      const anchor = anchorRef.current?.parentElement;
      if (anchor && anchor.contains(e.target)) return; // trigger button handles its own toggle
      onClose();
    };
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleOutside);
    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleOutside);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (typeof document === 'undefined') return null;

  return (
    <>
      <span ref={anchorRef} aria-hidden="true" style={{ display: 'none' }} />
      {createPortal(
        <div
          ref={menuRef}
          data-floating-menu="true"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className={`${className} ${pos?.openUp ? 'origin-bottom-right' : 'origin-top-right'}`}
          style={{
            position: 'fixed',
            top: pos ? pos.top : -9999,
            left: pos ? pos.left : -9999,
            width,
            maxHeight: 'calc(100vh - 16px)',
            overflowY: 'auto',
            zIndex: 9990,
            visibility: pos ? 'visible' : 'hidden',
            ...style
          }}
        >
          {children}
        </div>,
        document.body
      )}
    </>
  );
};

export default FloatingMenu;
