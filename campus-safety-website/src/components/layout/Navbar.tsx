"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Shield, ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamically import StaggeredMenu so gsap never blocks the navbar render
const StaggeredMenu = dynamic(
  () => import("@/components/ui/StaggeredMenu"),
  { ssr: false }
);

const menuItems = [
  {
    label: "Home",
    ariaLabel: "Go to home page",
    link: "/",
    description: "Live observatory feed & activity radar",
  },
  {
    label: "Report Hazard",
    ariaLabel: "Report a road safety hazard",
    link: "/report",
    description: "Submit geotagged photos & safety risks",
  },
  {
    label: "Live Map",
    ariaLabel: "View campus hazard heatmap and pins",
    link: "/map",
    description: "Spatial cluster layers & hazard pins",
  },
  {
    label: "Track Report",
    ariaLabel: "Track your report resolution status",
    link: "/track",
    description: "Real-time authority resolution timeline",
  },
];

const socialItems = [
  { label: "IIT Mandi", link: "https://iitmandi.ac.in" },
  { label: "Security: 01905-267000", link: "tel:01905267000" },
  { label: "Emergency: 112", link: "tel:112" },
  { label: "GitHub", link: "https://github.com/devanshyadav0001/ROAD-SENTINEL" },
];

// Error boundary to prevent menu crashes from killing the navbar
class MenuErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn("[StaggeredMenu] Failed to render:", error.message);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const triggerMenu = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("toggle-staggered-menu"));
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-40 w-full bg-[#07130d]/95 backdrop-blur-xl border-b border-white/[0.07] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
              <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center group-hover:bg-emerald-500 transition-colors shadow-sm">
                <Shield className="w-[18px] h-[18px] text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-[15px] font-semibold text-white leading-tight tracking-tight">
                  SafeRoads
                </span>
                <span className="text-[10px] font-medium text-emerald-400/85 uppercase tracking-[0.14em] leading-none">
                  IIT Mandi
                </span>
              </div>
            </Link>

            {/* Right Actions: Primary CTA + Elevated Shutter Menu Trigger */}
            <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
              <Link
                href="/report"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-all shadow-sm active:scale-95"
              >
                <span>Report Hazard</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>

              {/* Elevated Shutter Menu Trigger */}
              <button
                data-menu-trigger
                onClick={triggerMenu}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold tracking-wide transition-all active:scale-95 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-sm flex-shrink-0"
                title="Toggle Navigation Menu"
                aria-label="Toggle Navigation Menu"
                type="button"
              >
                {/* 3-Tier Shutter Icon */}
                <span className="flex flex-col justify-center gap-[3px] w-3.5 h-3" aria-hidden="true">
                  <span className="block h-[1.5px] w-full bg-white rounded-full transition-transform duration-200 group-hover:translate-x-0.5" />
                  <span className="block h-[1.5px] w-2.5 bg-emerald-100 rounded-full transition-all duration-200 group-hover:w-full group-hover:bg-white" />
                  <span className="block h-[1.5px] w-full bg-white rounded-full" />
                </span>
                <span className="font-semibold text-white tracking-wide text-xs">
                  Menu
                </span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Floating Persistent Quick Menu Button — Available on BOTH Desktop and Mobile */}
      <aside className="fixed bottom-6 right-6 z-40 pointer-events-auto">
        <button
          onClick={triggerMenu}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-950/40 active:scale-95 transition-all text-xs font-bold tracking-wider border border-emerald-400/30 cursor-pointer hover:shadow-emerald-500/20"
          title="Open Navigation Menu"
          aria-label="Open Navigation Menu"
          type="button"
        >
          <span className="flex flex-col justify-center gap-[2.5px] w-3.5 h-2.5" aria-hidden="true">
            <span className="block h-[1.5px] w-full bg-white rounded-full" />
            <span className="block h-[1.5px] w-2 bg-emerald-100 rounded-full" />
            <span className="block h-[1.5px] w-full bg-white rounded-full" />
          </span>
          <span>MENU</span>
        </button>
      </aside>

      {/* Staggered Shutter Menu — loaded dynamically so gsap never blocks the navbar */}
      {mounted && (
        <MenuErrorBoundary>
          <StaggeredMenu
            isFixed={true}
            position="right"
            items={menuItems}
            socialItems={socialItems}
            displaySocials={true}
            displayItemNumbering={true}
            colors={["#064e3b", "#059669", "#10b981"]}
            accentColor="#10b981"
            logoUrl="/shield-logo.svg"
            menuButtonColor="#ffffff"
            openMenuButtonColor="#10b981"
            changeMenuColorOnOpen={true}
            onMenuOpen={() => setMenuOpen(true)}
            onMenuClose={() => setMenuOpen(false)}
          />
        </MenuErrorBoundary>
      )}
    </>
  );
}
