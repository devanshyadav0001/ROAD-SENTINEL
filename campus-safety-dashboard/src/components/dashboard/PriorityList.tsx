"use client";

import { mockReports } from "@/lib/mock-data";
import PriorityAlertRow from "@/components/ui/PriorityAlertRow";
import { AlertTriangle } from "lucide-react";

export default function PriorityList() {
  const prioritized = [...mockReports]
    .filter((r) => r.status !== "resolved")
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 5);

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-foreground">Priority Alerts</h3>
      </div>
      <div className="space-y-3 flex-1">
        {prioritized.map((report) => {
          const nowTime = new Date("2026-08-28T00:00:00Z").getTime();
          const daysAgo = Math.max(
            1,
            Math.floor((nowTime - new Date(report.reportedAt).getTime()) / 86400000)
          );
          return (
            <PriorityAlertRow
              key={report.id}
              title={report.title}
              description={report.location.address}
              timestamp={`${daysAgo}d ago`}
              isUnresolvedFor48h={daysAgo >= 2 && (report.severity === "critical" || report.severity === "high")}
              severity={report.severity}
            />
          );
        })}
      </div>
    </div>
  );
}
