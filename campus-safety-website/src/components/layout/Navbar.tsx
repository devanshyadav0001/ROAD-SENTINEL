"use client";

import Link from "next/link";
import { Shield } from "lucide-react";
import StaggeredMenu, { StaggeredMenuItem, StaggeredMenuSocialItem } from "@/components/ui/StaggeredMenu";

const menuItems: StaggeredMenuItem[] = [
  { label: "Home", ariaLabel: "Go to home page", link: "/" },
  { label: "Report Hazard", ariaLabel: "Report a road safety hazard", link: "/report" },
  { label: "Track Report", ariaLabel: "Track your report resolution status", link: "/track" },
  { label: "Live Map", ariaLabel: "View campus hazard heatmap and pins", link: "/map" },
  { label: "Admin Portal", ariaLabel: "Access IIT Mandi administration dashboard", link: "http://localhost:3001/dashboard" },
];

const socialItems: StaggeredMenuSocialItem[] = [
  { label: "IIT Mandi", link: "https://iitmandi.ac.in" },
  { label: "Campus Security", link: "tel:01905267000" },
  { label: "Emergency: 112", link: "tel:112" },
  { label: "GitHub", link: "https://github.com/devanshyadav0001/ROAD-SENTINEL" },
];

export default function Navbar() {
  return (
    <>
      <nav className="sticky top-0 z-40 bg-white/90 dark:bg-[#07130d]/90 backdrop-blur-md border-b border-border/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center group-hover:bg-primary-dark transition-all shadow-sm">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-foreground tracking-tight">
                SafeRoads <span className="text-primary font-extrabold">IIT Mandi</span>
              </span>
            </Link>

            {/* Spacer for Staggered Menu Toggle Button */}
            <div className="w-24 sm:w-28 flex justify-end" />
          </div>
        </div>
      </nav>

      {/* React Bits StaggeredMenu is the Primary Navigation */}
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
      />
    </>
  );
}
