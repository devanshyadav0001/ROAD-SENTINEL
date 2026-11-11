"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Bell, User, Shield } from "lucide-react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

// Dynamically import StaggeredMenu so gsap never blocks the header render
const StaggeredMenu = dynamic(
  () => import("@/components/ui/StaggeredMenu"),
  { ssr: false }
);

const breadcrumbMap: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/speed": "Speed Tracker",
  "/dashboard/enforcement": "Traffic Enforcement",
  "/dashboard/reports": "Hazard Reports",
  "/dashboard/map": "Map View",
  "/dashboard/analytics": "Analytics",
  "/dashboard/settings": "Settings",
};

const dashboardMenuItems = [
  {
    label: "Overview",
    ariaLabel: "Dashboard overview",
    link: "/dashboard",
    description: "Executive KPIs & real-time telemetry",
  },
  {
    label: "Speed Tracker",
    ariaLabel: "Speed Tracker observatory",
    link: "/dashboard/speed",
    description: "Velocity profile & 85th-percentile curve",
  },
  {
    label: "Traffic Enforcement",
    ariaLabel: "Edge radar & camera enforcement",
    link: "/dashboard/enforcement",
    description: "Over-speed triggers & radar cameras",
  },
  {
    label: "Hazard Reports",
    ariaLabel: "Citizen hazard reports",
    link: "/dashboard/reports",
    description: "Crowdsourced queue & priority triage",
  },
  {
    label: "Map View",
    ariaLabel: "Campus spatial hazard map",
    link: "/dashboard/map",
    description: "Interactive GIS heatmap & hazard pins",
  },
  {
    label: "Analytics",
    ariaLabel: "Trends and resolution performance",
    link: "/dashboard/analytics",
    description: "Resolution metrics & temporal analysis",
  },
  {
    label: "Settings",
    ariaLabel: "System settings and calibration",
    link: "/dashboard/settings",
    description: "Sensor thresholds & alert routing",
  },
  {
    label: "Public Portal",
    ariaLabel: "Citizen hazard reporting portal",
    link: "http://localhost:3000",
    description: "Switch to citizen-facing interface",
  },
];

const dashboardSocialItems = [
  { label: "IIT Mandi", link: "https://iitmandi.ac.in" },
  { label: "API Docs (/docs)", link: "http://127.0.0.1:8000/docs" },
  { label: "Public Site (:3000)", link: "http://localhost:3000" },
  { label: "GitHub", link: "https://github.com/devanshyadav0001/ROAD-SENTINEL" },
];

// Error boundary to prevent menu crashes from killing the header
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

export default function DashboardHeader() {
  const pathname = usePathname();
  const title = breadcrumbMap[pathname] || "Dashboard";
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
      <header className="fixed top-0 left-0 right-0 z-40 w-full h-16 bg-[#0a0a0b]/95 backdrop-blur-xl border-b border-white/[0.08] flex items-center justify-between px-4 sm:px-6 shadow-sm">
        {/* Left: Brand Logo & Section Breadcrumb */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center group-hover:bg-emerald-500 transition-colors shadow-sm">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm sm:text-base font-bold text-white tracking-tight whitespace-nowrap">
              SafeRoads <span className="text-emerald-400 font-extrabold">Admin</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1.5 pl-3 border-l border-white/[0.08] text-sm text-zinc-500">
            <span>/</span>
            <span className="font-medium text-zinc-300 truncate">{title}</span>
          </div>
        </div>

        {/* Right: Actions & Shutter Menu Trigger */}
        <div className="flex items-center gap-1.5 sm:gap-3 ml-auto flex-shrink-0">
          {/* Search Input - Desktop only */}
          <div className="relative hidden lg:block mr-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search reports..."
              className="pl-8 pr-3 py-1.5 bg-white/[0.04] border border-white/[0.07] rounded-lg text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 focus:border-emerald-500/40 w-40 xl:w-52 transition-all"
            />
          </div>

          {/* Quick Notification Bell - hidden on small mobile, visible sm+ */}
          <button
            className="hidden sm:flex relative w-8 h-8 items-center justify-center rounded-lg hover:bg-white/[0.05] transition-colors text-zinc-400 hover:text-zinc-200"
            title="Notifications"
            aria-label="Notifications"
            type="button"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
          </button>

          {/* User Profile Pill - hidden on mobile */}
          <div className="hidden md:flex items-center gap-2 pl-2 border-l border-white/[0.08]">
            <div className="w-7 h-7 bg-emerald-500/15 border border-emerald-500/30 rounded-full flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="text-xs font-medium text-zinc-300">Admin</span>
          </div>

          {/* Elevated Shutter Menu Trigger — ALWAYS VISIBLE ON ALL SCREENS */}
          <button
            data-menu-trigger
            onClick={triggerMenu}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold tracking-wide transition-all active:scale-95 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-sm flex-shrink-0"
            title="Toggle Navigation Menu"
            aria-label="Open Navigation Menu"
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
      </header>

      {/* Floating Persistent Quick Menu Button — VISIBLE ON BOTH DESKTOP AND MOBILE */}
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

      {/* Staggered Shutter Menu — loaded dynamically so gsap never blocks the header */}
      {mounted && (
        <MenuErrorBoundary>
          <StaggeredMenu
            isFixed={true}
            position="right"
            items={dashboardMenuItems}
            socialItems={dashboardSocialItems}
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
