"use client";

import { dashboardStats } from "@/lib/mock-data";
import DashboardKPICard from "@/components/ui/DashboardKPICard";

// Generate mock sparkline data
function genSparkline(base: number, variance: number): { value: number }[] {
  return Array.from({ length: 7 }, () => ({
    value: base + Math.floor(Math.random() * variance - variance / 2),
  }));
}

export default function StatsCards() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div className="lg:col-span-1">
        <DashboardKPICard
          title="Total Hazards Logged"
          value={dashboardStats.totalReports}
          trendPercentage={12}
          sparklineData={genSparkline(30, 10)}
          isHero
        />
      </div>
      <div className="lg:col-span-1">
        <DashboardKPICard
          title="Pending Review"
          value={dashboardStats.pending}
          trendPercentage={-5}
          sparklineData={genSparkline(dashboardStats.pending, 4)}
        />
      </div>
      <div className="lg:col-span-1">
        <DashboardKPICard
          title="In Progress"
          value={dashboardStats.inProgress}
          trendPercentage={8}
          sparklineData={genSparkline(dashboardStats.inProgress, 3)}
        />
      </div>
      <div className="lg:col-span-1">
        <DashboardKPICard
          title="Resolved Issues"
          value={dashboardStats.resolved}
          trendPercentage={18}
          sparklineData={genSparkline(dashboardStats.resolved, 5)}
        />
      </div>
    </div>
  );
}
