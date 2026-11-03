"use client";

import Link from "next/link";
import { Search, Bell, User, Shield } from "lucide-react";
import { usePathname } from "next/navigation";
import StaggeredMenu, { StaggeredMenuItem, StaggeredMenuSocialItem } from "@/components/ui/StaggeredMenu";

const breadcrumbMap: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/speed": "Speed Tracker Observatory",
  "/dashboard/enforcement": "Edge Traffic Enforcement",
  "/dashboard/reports": "Hazard Reports",
  "/dashboard/map": "Map View",
  "/dashboard/analytics": "Analytics & Trends",
  "/dashboard/settings": "System Settings",
};

const dashboardMenuItems: StaggeredMenuItem[] = [
  { label: "Overview", ariaLabel: "Dashboard overview", link: "/dashboard" },
  { label: "Speed Tracker", ariaLabel: "Speed Tracker observatory", link: "/dashboard/speed" },
  { label: "Traffic Enforcement", ariaLabel: "Edge radar & camera enforcement", link: "/dashboard/enforcement" },
  { label: "Hazard Reports", ariaLabel: "Citizen hazard reports", link: "/dashboard/reports" },
  { label: "Map View", ariaLabel: "Campus spatial hazard map", link: "/dashboard/map" },
  { label: "Analytics", ariaLabel: "Trends and resolution performance", link: "/dashboard/analytics" },
  { label: "System Settings", ariaLabel: "System settings and calibration", link: "/dashboard/settings" },
  { label: "Public Portal", ariaLabel: "Citizen hazard reporting portal", link: "http://localhost:3000" },
];

const dashboardSocialItems: StaggeredMenuSocialItem[] = [
  { label: "IIT Mandi", link: "https://iitmandi.ac.in" },
  { label: "API Docs (/docs)", link: "http://127.0.0.1:8000/docs" },
  { label: "Public Website (:3000)", link: "http://localhost:3000" },
  { label: "GitHub Repository", link: "https://github.com/devanshyadav0001/ROAD-SENTINEL" },
];

export default function DashboardHeader() {
  const pathname = usePathname();
  const title = breadcrumbMap[pathname] || "Dashboard";

  return (
    <>
      <header className="h-16 border-b border-border flex items-center justify-between px-4 sm:px-6 bg-card/60 backdrop-blur-md z-30 relative">
        {/* Left: Brand Logo & Section Breadcrumb (Replaces static sidebar) */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Link href="/dashboard" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center group-hover:bg-primary-dark transition-all shadow-sm">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-base sm:text-lg text-foreground whitespace-nowrap">
              SafeRoads <span className="text-primary font-extrabold">Admin</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-2 pl-3 border-l border-border text-sm text-muted">
            <span className="text-zinc-600">/</span>
            <span className="font-semibold text-foreground truncate">{title}</span>
          </div>
        </div>

        {/* Right: Actions + Spacer for Floating Staggered Menu */}
        <div className="flex items-center gap-2.5 sm:gap-3 mr-24 sm:mr-28">
          {/* Search */}
          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search reports..."
              className="pl-9 pr-4 py-2 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary w-52"
            />
          </div>

          {/* Notifications */}
          <button className="relative p-2 rounded-lg hover:bg-card-hover transition-colors text-muted hover:text-foreground">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-2 pl-2 border-l border-border">
            <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground hidden sm:block">Admin</span>
          </div>
        </div>
      </header>

      {/* React Bits StaggeredMenu Overlay - Primary Navigation for Dashboard */}
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
      />
    </>
  );
}
