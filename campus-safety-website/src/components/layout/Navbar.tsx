"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import StaggeredMenu, { StaggeredMenuItem, StaggeredMenuSocialItem } from "@/components/ui/StaggeredMenu";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/report", label: "Report Hazard" },
  { href: "/track", label: "Track Report" },
  { href: "/map", label: "View Map" },
];

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
  const pathname = usePathname();

  return (
    <>
      <nav className="sticky top-0 z-40 bg-white/85 dark:bg-[#07130d]/85 backdrop-blur-md border-b border-border/80 transition-colors">
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

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-1.5 mr-28">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    pathname === link.href
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted hover:text-foreground hover:bg-gray-100 dark:hover:bg-zinc-800/60"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/report"
                className="ml-2 px-4 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-all shadow-sm hover:shadow"
              >
                Report Now
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* React Bits StaggeredMenu Overlay Navigation */}
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
