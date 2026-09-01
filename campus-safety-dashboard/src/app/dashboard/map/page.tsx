"use client";

import { useState } from "react";
import { categoryLabels, categoryColors, severityLabels, type HazardCategory, type Severity } from "@/types";
import { Filter, Layers, Map } from "lucide-react";
import { cn } from "@/lib/utils";

const categories = Object.keys(categoryLabels) as HazardCategory[];
const severities = Object.keys(severityLabels) as Severity[];

export default function DashboardMapPage() {
  const [selectedCategories, setSelectedCategories] = useState<HazardCategory[]>([]);
  const [selectedSeverities, setSelectedSeverities] = useState<Severity[]>([]);

  const toggleCategory = (cat: HazardCategory) => {
    setSelectedCategories((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
  };

  const toggleSeverity = (sev: Severity) => {
    setSelectedSeverities((prev) => prev.includes(sev) ? prev.filter((s) => s !== sev) : [...prev, sev]);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-4">
      {/* Sidebar Filters */}
      <div className="w-full lg:w-64 bg-card border border-border rounded-xl p-5 flex-shrink-0 flex flex-col gap-6 overflow-y-auto">
        <div className="flex items-center gap-2 text-foreground font-semibold">
          <Filter className="w-4 h-4" />
          Map Filters
        </div>

        <div>
          <h4 className="text-xs font-semibold text-muted uppercase mb-3">Categories</h4>
          <div className="space-y-2">
            {categories.map((cat) => (
              <label key={cat} className="flex items-center gap-2.5 cursor-pointer text-sm text-foreground hover:text-primary transition-colors">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(cat)}
                  onChange={() => toggleCategory(cat)}
                  className="w-4 h-4 rounded border-border bg-input accent-primary"
                />
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: categoryColors[cat] }} />
                {categoryLabels[cat]}
              </label>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-muted uppercase mb-3">Severity</h4>
          <div className="space-y-2">
            {severities.map((sev) => (
              <label key={sev} className="flex items-center gap-2.5 cursor-pointer text-sm text-foreground hover:text-primary transition-colors">
                <input
                  type="checkbox"
                  checked={selectedSeverities.includes(sev)}
                  onChange={() => toggleSeverity(sev)}
                  className="w-4 h-4 rounded border-border bg-input accent-primary"
                />
                {severityLabels[sev]}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-border flex flex-col gap-2">
          <button className="flex items-center justify-center gap-2 w-full py-2 bg-input border border-border rounded-lg text-sm text-foreground hover:bg-card-hover transition-colors">
            <Layers className="w-4 h-4" /> Toggle Heatmap
          </button>
          <button 
            onClick={() => { setSelectedCategories([]); setSelectedSeverities([]); }}
            className="text-xs text-muted hover:text-foreground hover:underline py-1"
          >
            Clear all filters
          </button>
        </div>
      </div>

      {/* Map Area — placeholder, will be built separately */}
      <div className="flex-1 bg-card border border-border rounded-xl overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <Map className="w-12 h-12 text-muted/30 mx-auto mb-3" />
          <p className="text-sm font-semibold text-muted">Map coming soon</p>
          <p className="text-xs text-muted/60 mt-1">Interactive GIS view will be integrated here</p>
        </div>
      </div>
    </div>
  );
}
