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

              {/* Shutter Menu Button */}
              <button
                data-menu-trigger
                onClick={triggerMenu}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.09] hover:border-emerald-500/40 text-zinc-300 hover:text-white text-xs font-medium tracking-wide transition-all duration-200 active:scale-95 group cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                title="Toggle Navigation Menu"
                aria-label="Toggle Navigation Menu"
                type="button"
              >
                {/* 3-Tier Shutter Icon */}
                <span className="flex flex-col justify-center gap-[3px] w-3.5 h-3" aria-hidden="true">
                  <span className="block h-[1.5px] w-full bg-emerald-400 rounded-full transition-transform duration-200 group-hover:translate-x-0.5" />
                  <span className="block h-[1.5px] w-2.5 bg-zinc-300 rounded-full transition-all duration-200 group-hover:w-full group-hover:bg-emerald-300" />
                  <span className="block h-[1.5px] w-full bg-zinc-400 rounded-full transition-all duration-200 group-hover:bg-emerald-400" />
                </span>
                <span className="font-medium text-zinc-200 group-hover:text-white tracking-wide">
                  Menu
                </span>
              </button>
            </div>
          </div>
        </div>
      </nav>

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
