"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Bell, User, Shield } from "lucide-react";
import { usePathname } from "next/navigation";
import StaggeredMenu, { StaggeredMenuItem, StaggeredMenuSocialItem } from "@/components/ui/StaggeredMenu";

const breadcrumbMap: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/speed": "Speed Tracker",
  "/dashboard/enforcement": "Traffic Enforcement",
  "/dashboard/reports": "Hazard Reports",
  "/dashboard/map": "Map View",
  "/dashboard/analytics": "Analytics",
  "/dashboard/settings": "Settings",
};

const dashboardMenuItems: StaggeredMenuItem[] = [
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

const dashboardSocialItems: StaggeredMenuSocialItem[] = [
  { label: "IIT Mandi", link: "https://iitmandi.ac.in" },
  { label: "API Docs (/docs)", link: "http://127.0.0.1:8000/docs" },
  { label: "Public Site (:3000)", link: "http://localhost:3000" },
  { label: "GitHub", link: "https://github.com/devanshyadav0001/ROAD-SENTINEL" },
];

export default function DashboardHeader() {
  const pathname = usePathname();
  const title = breadcrumbMap[pathname] || "Dashboard";
  const [menuOpen, setMenuOpen] = useState(false);

  const triggerMenu = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("toggle-staggered-menu"));
    }
  };

  return (
    <>
      <header className="h-14 shrink-0 border-b border-white/[0.07] flex items-center justify-between px-3 sm:px-6 bg-[#0a0a0b]/95 backdrop-blur-xl z-30 sticky top-0 w-full">
        {/* Left: Brand Logo & Section Breadcrumb */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center group-hover:bg-emerald-500 transition-colors shadow-sm">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-white tracking-tight whitespace-nowrap">
              SafeRoads <span className="text-emerald-400 font-bold">Admin</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1.5 pl-3 border-l border-white/[0.08] text-sm text-zinc-500">
            <span>/</span>
            <span className="font-medium text-zinc-300 truncate">{title}</span>
          </div>
        </div>

        {/* Right: Actions & Shutter Menu Trigger */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
          {/* Search Input */}
          <div className="relative hidden lg:block mr-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search reports..."
              className="pl-8 pr-3 py-1.5 bg-white/[0.04] border border-white/[0.07] rounded-lg text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 focus:border-emerald-500/40 w-40 xl:w-52 transition-all"
            />
          </div>

          {/* Quick Notification Bell */}
          <button
            className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.05] transition-colors text-zinc-400 hover:text-zinc-200"
            title="Notifications"
            aria-label="Notifications"
            type="button"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
          </button>

          {/* User Profile Pill - hidden on small mobile */}
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-white/[0.08]">
            <div className="w-7 h-7 bg-emerald-500/15 border border-emerald-500/30 rounded-full flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="text-xs font-medium text-zinc-300">Admin</span>
          </div>

          {/* Elevated Shutter Menu Trigger */}
          <button
            data-menu-trigger
            onClick={triggerMenu}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.1] hover:border-emerald-500/40 text-zinc-300 hover:text-white text-xs font-medium tracking-wide transition-all duration-200 active:scale-95 group cursor-pointer ml-1 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
            title="Toggle Navigation Menu"
            aria-label="Open Navigation Menu"
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
      </header>

      {/* React Bits Staggered Shutter Menu Overlay */}
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
    </>
  );
}
