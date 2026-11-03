"use client";

import { Search, Bell, User, Sparkles } from "lucide-react";
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
  { label: "Enforcement", ariaLabel: "Edge radar & camera enforcement", link: "/dashboard/enforcement" },
  { label: "Reports", ariaLabel: "Citizen hazard reports", link: "/dashboard/reports" },
  { label: "Map View", ariaLabel: "Campus spatial hazard map", link: "/dashboard/map" },
  { label: "Analytics", ariaLabel: "Trends and resolution performance", link: "/dashboard/analytics" },
  { label: "Public Portal", ariaLabel: "Citizen hazard reporting portal", link: "http://localhost:3000" },
];

const dashboardSocialItems: StaggeredMenuSocialItem[] = [
  { label: "IIT Mandi", link: "https://iitmandi.ac.in" },
  { label: "API Docs (/docs)", link: "http://127.0.0.1:8000/docs" },
  { label: "Public Portal (:3000)", link: "http://localhost:3000" },
  { label: "GitHub Repository", link: "https://github.com/devanshyadav0001/ROAD-SENTINEL" },
];

export default function DashboardHeader() {
  const pathname = usePathname();
  const title = breadcrumbMap[pathname] || "Dashboard";

  const triggerStaggeredMenu = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("toggle-staggered-menu"));
    }
  };

  return (
    <>
      <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm z-30 relative">
        {/* Breadcrumb */}
        <div>
          <p className="text-xs text-muted">Dashboard</p>
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mr-24">
          {/* Quick Header Staggered Menu Trigger */}
          <button
            onClick={triggerStaggeredMenu}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 hover:border-emerald-300 transition-all font-semibold text-xs shadow-[0_0_12px_rgba(16,185,129,0.2)]"
            title="Open React Bits Staggered Menu"
            type="button"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Menu</span>
            <span className="text-[10px] bg-emerald-500/30 px-1 rounded text-emerald-300 font-mono">GSAP</span>
          </button>

          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search reports..."
              className="pl-9 pr-4 py-2 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary w-60"
            />
          </div>

          {/* Notifications */}
          <button className="relative p-2 rounded-lg hover:bg-card-hover transition-colors">
            <Bell className="w-5 h-5 text-muted" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
          </button>

          {/* User */}
          <div className="flex items-center gap-2 pl-3 border-l border-border">
            <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground hidden sm:block">Admin</span>
          </div>
        </div>
      </header>

      {/* React Bits StaggeredMenu Overlay for Admin Dashboard */}
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
