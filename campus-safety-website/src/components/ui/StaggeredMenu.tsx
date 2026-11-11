'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { gsap } from 'gsap';
import { X, ArrowUpRight } from 'lucide-react';

export interface StaggeredMenuItem {
  label: string;
  ariaLabel?: string;
  link: string;
  description?: string;
}

export interface StaggeredMenuSocialItem {
  label: string;
  link: string;
}

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export interface StaggeredMenuProps {
  position?: 'left' | 'right';
  colors?: string[];
  items?: StaggeredMenuItem[];
  socialItems?: StaggeredMenuSocialItem[];
  displaySocials?: boolean;
  displayItemNumbering?: boolean;
  className?: string;
  logoUrl?: string;
  menuButtonColor?: string;
  openMenuButtonColor?: string;
  changeMenuColorOnOpen?: boolean;
  isFixed?: boolean;
  accentColor?: string;
  closeOnClickAway?: boolean;
  onMenuOpen?: () => void;
  onMenuClose?: () => void;
}

export const StaggeredMenu: React.FC<StaggeredMenuProps> = ({
  position = 'right',
  colors = ['#064e3b', '#059669', '#10b981'],
  items = [],
  socialItems = [],
  displaySocials = true,
  displayItemNumbering = true,
  className,
  isFixed = true,
  accentColor = '#10b981',
  closeOnClickAway = true,
  onMenuOpen,
  onMenuClose,
}) => {
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const router = useRouter();

  const panelRef = useRef<HTMLElement | null>(null);
  const preLayersRef = useRef<HTMLDivElement | null>(null);
  const preLayerElsRef = useRef<HTMLElement[]>([]);

  const openTlRef = useRef<gsap.core.Timeline | null>(null);
  const closeTweenRef = useRef<gsap.core.Tween | null>(null);
  const toggleBtnRef = useRef<HTMLButtonElement | null>(null);
  const busyRef = useRef(false);

  const initLayers = useCallback(() => {
    const panel = panelRef.current;
    const preContainer = preLayersRef.current;
    if (!panel) return;

    let preLayers: HTMLElement[] = [];
    if (preContainer) {
      preLayers = Array.from(preContainer.querySelectorAll<HTMLElement>('.sm-prelayer'));
    }
    preLayerElsRef.current = preLayers;

    const offscreen = position === 'left' ? -100 : 100;
    gsap.set([panel, ...preLayers], { xPercent: offscreen, opacity: 1 });
    if (preContainer) {
      gsap.set(preContainer, { xPercent: 0, opacity: 1 });
    }
  }, [position]);

  const buildOpenTimeline = useCallback(() => {
    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return null;

    openTlRef.current?.kill();
    if (closeTweenRef.current) {
      closeTweenRef.current.kill();
      closeTweenRef.current = null;
    }

    const itemEls = Array.from(panel.querySelectorAll<HTMLElement>('.sm-panel-itemLabel'));
    const metaEls = Array.from(panel.querySelectorAll<HTMLElement>('.sm-panel-meta'));

    const offscreen = position === 'left' ? -100 : 100;
    const layerStates = layers.map((el) => ({ el, start: offscreen }));
    const panelStart = offscreen;

    if (itemEls.length) gsap.set(itemEls, { yPercent: 120, rotate: 4 });
    if (metaEls.length) gsap.set(metaEls, { opacity: 0, y: 8 });

    const tl = gsap.timeline({ paused: true });

    layerStates.forEach((ls, i) => {
      tl.fromTo(ls.el, { xPercent: ls.start }, { xPercent: 0, duration: 0.45, ease: 'power4.out' }, i * 0.06);
    });

    const lastTime = layerStates.length ? (layerStates.length - 1) * 0.06 : 0;
    const panelInsertTime = lastTime + (layerStates.length ? 0.06 : 0);
    const panelDuration = 0.55;

    tl.fromTo(
      panel,
      { xPercent: panelStart },
      { xPercent: 0, duration: panelDuration, ease: 'power4.out' },
      panelInsertTime
    );

    if (itemEls.length) {
      const itemsStart = panelInsertTime + panelDuration * 0.2;
      tl.to(
        itemEls,
        { yPercent: 0, rotate: 0, duration: 0.65, ease: 'power4.out', stagger: { each: 0.05, from: 'start' } },
        itemsStart
      );

      if (metaEls.length) {
        tl.to(
          metaEls,
          { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: { each: 0.05, from: 'start' } },
          itemsStart + 0.1
        );
      }
    }

    openTlRef.current = tl;
    return tl;
  }, [position]);

  const playOpen = useCallback(() => {
    initLayers();
    const tl = buildOpenTimeline();
    if (tl) {
      tl.eventCallback('onComplete', () => {
        busyRef.current = false;
      });
      tl.play(0);
    } else {
      busyRef.current = false;
    }
  }, [initLayers, buildOpenTimeline]);

  const playClose = useCallback(() => {
    openTlRef.current?.kill();
    openTlRef.current = null;

    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) {
      openRef.current = false;
      setOpen(false);
      busyRef.current = false;
      return;
    }

    const all = [...layers, panel];
    closeTweenRef.current?.kill();

    const offscreen = position === 'left' ? -100 : 100;

    closeTweenRef.current = gsap.to(all, {
      xPercent: offscreen,
      duration: 0.28,
      ease: 'power3.in',
      overwrite: 'auto',
      onComplete: () => {
        const itemEls = Array.from(panel.querySelectorAll<HTMLElement>('.sm-panel-itemLabel'));
        if (itemEls.length) gsap.set(itemEls, { yPercent: 120, rotate: 4 });

        openRef.current = false;
        setOpen(false);
        busyRef.current = false;
      },
    });
  }, [position]);

  const toggleMenu = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = true;

    if (!openRef.current) {
      openRef.current = true;
      setOpen(true);
      onMenuOpen?.();
      requestAnimationFrame(() => {
        playOpen();
      });
    } else {
      onMenuClose?.();
      playClose();
    }
  }, [playOpen, playClose, onMenuOpen, onMenuClose]);

  const closeMenu = useCallback(() => {
    if (openRef.current && !busyRef.current) {
      busyRef.current = true;
      onMenuClose?.();
      playClose();
    }
  }, [playClose, onMenuClose]);

  const handleLinkClick = useCallback(
    (e: React.MouseEvent, href: string) => {
      closeMenu();
      if (href.startsWith('/') && !href.startsWith('//')) {
        e.preventDefault();
        router.push(href);
      }
    },
    [closeMenu, router]
  );

  // External trigger event listener
  useEffect(() => {
    const handleTrigger = () => {
      toggleMenu();
    };
    window.addEventListener('toggle-staggered-menu', handleTrigger);
    return () => {
      window.removeEventListener('toggle-staggered-menu', handleTrigger);
    };
  }, [toggleMenu]);

  // Escape key support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openRef.current) {
        closeMenu();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeMenu]);

  // Click outside listener
  useEffect(() => {
    if (!closeOnClickAway || !open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (target instanceof Element && target.closest('[data-menu-trigger]')) {
        return;
      }
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        toggleBtnRef.current &&
        !toggleBtnRef.current.contains(target)
      ) {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [closeOnClickAway, open, closeMenu]);

  return (
    <div
      className={`sm-scope z-[9999] ${
        isFixed ? 'fixed inset-0 w-full h-full pointer-events-none' : 'w-full h-full'
      }`}
      style={{ display: open ? 'block' : 'none' }}
    >
      <div
        className={
          (className ? className + ' ' : '') +
          'staggered-menu-wrapper pointer-events-none relative w-full h-full'
        }
        style={accentColor ? ({ ['--sm-accent']: accentColor } as React.CSSProperties) : undefined}
        data-position={position}
        data-open={open || undefined}
      >
        {/* Backdrop overlay */}
        {open && (
          <div
            onClick={closeMenu}
            className="fixed inset-0 bg-black/80 backdrop-blur-md pointer-events-auto z-[80] transition-opacity duration-300"
            aria-hidden="true"
          />
        )}

        {/* Shutter Pre-layers (Staggered colored ribbons) */}
        <div
          ref={preLayersRef}
          className="sm-prelayers fixed top-0 right-0 bottom-0 pointer-events-none z-[90]"
          aria-hidden="true"
        >
          {(() => {
            const raw =
              colors && colors.length ? colors.slice(0, 3) : ['#064e3b', '#059669', '#10b981'];
            return raw.map((c, i) => (
              <div
                key={i}
                className="sm-prelayer absolute top-0 right-0 h-full w-full"
                style={{ background: c }}
              />
            ));
          })()}
        </div>

        {/* Main Navigation Panel */}
        <aside
          id="staggered-menu-panel"
          ref={panelRef}
          className="staggered-menu-panel pointer-events-auto"
          aria-hidden={!open}
          aria-label="Site Navigation"
        >
          <div className="sm-panel-inner">
            {/* Header bar */}
            <div className="flex items-center justify-between pb-5 border-b border-white/[0.08] mb-6 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-zinc-400">
                  Navigation
                </span>
              </div>
              <button
                ref={toggleBtnRef}
                onClick={closeMenu}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white text-xs transition-colors border border-white/[0.08] cursor-pointer"
                aria-label="Close menu (ESC)"
                type="button"
              >
                <X className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono tracking-wider text-zinc-400">ESC</span>
              </button>
            </div>

            {/* Menu List */}
            <ul className="sm-panel-list" role="list">
              {items.map((item, idx) => (
                <li className="sm-panel-itemWrap" key={idx}>
                  <a
                    className="sm-panel-item group flex items-start justify-between py-2.5 px-3 -mx-3 rounded-xl hover:bg-white/[0.04] transition-all duration-200 cursor-pointer"
                    href={item.link}
                    aria-label={item.ariaLabel}
                    data-index={idx + 1}
                    onClick={(e) => handleLinkClick(e, item.link)}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                      <div className="flex items-baseline gap-2.5">
                        {displayItemNumbering && (
                          <span className="sm-panel-meta text-[11px] font-mono text-emerald-400/75 select-none shrink-0">
                            {(idx + 1).toString().padStart(2, '0')}
                          </span>
                        )}
                        <span className="sm-panel-itemLabel text-xl sm:text-2xl font-semibold tracking-tight text-white group-hover:text-emerald-300 transition-colors">
                          {item.label}
                        </span>
                      </div>
                      {item.description && (
                        <span className="sm-panel-meta text-xs text-zinc-400 font-normal pl-6 tracking-normal line-clamp-1">
                          {item.description}
                        </span>
                      )}
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-emerald-400/60 group-hover:text-emerald-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all opacity-0 group-hover:opacity-100 mt-1 shrink-0" />
                  </a>
                </li>
              ))}
            </ul>

            {/* Footer with Campus Status & Links */}
            <div className="mt-auto pt-6 border-t border-white/[0.08] flex flex-col gap-3 flex-shrink-0">
              <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                <span>IIT MANDI • OBSERVATORY</span>
                <span className="text-emerald-400">STATUS: ACTIVE</span>
              </div>
              {displaySocials && socialItems && socialItems.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {socialItems.map((soc, idx) => (
                    <a
                      key={idx}
                      className="text-[11px] px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-emerald-500/10 text-zinc-300 hover:text-emerald-300 border border-white/[0.06] hover:border-emerald-500/30 transition-all font-medium"
                      href={soc.link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {soc.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      <style jsx global>{`
        .sm-scope .sm-panel-itemWrap {
          position: relative;
          overflow: hidden;
          line-height: 1.25;
        }
        .sm-scope .staggered-menu-panel {
          position: fixed;
          top: 0;
          right: 0;
          width: clamp(340px, 85vw, 440px);
          height: 100%;
          background: rgba(9, 13, 11, 0.98);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          display: flex;
          flex-direction: column;
          padding: 1.5rem 1.75rem 1.75rem 1.75rem;
          overflow-y: auto;
          overscroll-behavior: contain;
          z-index: 100;
          border-left: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: -16px 0 48px -12px rgba(0, 0, 0, 0.85);
          pointer-events: auto;
        }
        .sm-scope [data-position='left'] .staggered-menu-panel {
          right: auto;
          left: 0;
          border-left: none;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 16px 0 48px -12px rgba(0, 0, 0, 0.85);
        }
        .sm-scope .sm-prelayers {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: clamp(340px, 85vw, 440px);
          pointer-events: none;
          z-index: 90;
        }
        .sm-scope [data-position='left'] .sm-prelayers {
          right: auto;
          left: 0;
        }
        .sm-scope .sm-prelayer {
          position: absolute;
          top: 0;
          right: 0;
          height: 100%;
          width: 100%;
        }
        .sm-scope .sm-panel-inner {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 100%;
        }
        .sm-scope .sm-panel-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .sm-scope .sm-panel-itemLabel {
          display: inline-block;
          will-change: transform;
          transform-origin: 50% 100%;
        }
        @media (max-width: 640px) {
          .sm-scope .staggered-menu-panel {
            width: 100% !important;
            max-width: 100% !important;
            left: 0 !important;
            right: 0 !important;
            padding: 1.25rem 1.25rem 1.5rem 1.25rem !important;
          }
          .sm-scope .sm-prelayers {
            width: 100% !important;
            max-width: 100% !important;
            left: 0 !important;
            right: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default StaggeredMenu;
