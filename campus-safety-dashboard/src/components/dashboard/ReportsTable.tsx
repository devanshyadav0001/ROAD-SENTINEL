"use client";

import { useState, useMemo } from "react";
import { mockReports } from "@/lib/mock-data";
import { categoryLabels, type HazardCategory, type Status, type Severity } from "@/types";
import StatusBadge from "@/components/shared/StatusBadge";
import SeverityBadge from "@/components/shared/SeverityBadge";
import { Search, ChevronLeft, ChevronRight, MapPin, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ReportsTable() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<HazardCategory | "">("");
  const [statusFilter, setStatusFilter] = useState<Status | "">("");
  const [sevFilter, setSevFilter] = useState<Severity | "">("");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const perPage = 10;

  const filtered = useMemo(() => {
    return mockReports.filter((r) => {
      if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.location.address.toLowerCase().includes(search.toLowerCase())) return false;
      if (catFilter && r.category !== catFilter) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      if (sevFilter && r.severity !== sevFilter) return false;
      return true;
    });
  }, [search, catFilter, statusFilter, sevFilter]);

  const paged = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);
  const selected = selectedId ? mockReports.find((r) => r.id === selectedId) : null;

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search by title or location..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-4 py-2 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => { setCatFilter(e.target.value as HazardCategory | ""); setPage(0); }}
          className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">All Categories</option>
          {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as Status | ""); setPage(0); }}
          className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">All Status</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
        <select
          value={sevFilter}
          onChange={(e) => { setSevFilter(e.target.value as Severity | ""); setPage(0); }}
          className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">All Severity</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      <p className="text-xs text-muted mb-3">Showing {filtered.length} reports</p>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase">ID</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase">Title</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase">Category</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase">Location</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase">Severity</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase">Date</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((report) => (
                <tr
                  key={report.id}
                  onClick={() => setSelectedId(report.id)}
                  className="border-b border-border/50 hover:bg-card-hover cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-primary">{report.id}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{report.title}</td>
                  <td className="px-4 py-3 text-muted">{categoryLabels[report.category]}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-muted">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate max-w-[150px]">{report.location.address}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><SeverityBadge severity={report.severity} /></td>
                  <td className="px-4 py-3"><StatusBadge status={report.status} /></td>
                  <td className="px-4 py-3 text-muted text-xs">{new Date(report.reportedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <span className="text-xs text-muted">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className={cn("p-1.5 rounded-lg", page === 0 ? "text-muted/30" : "text-muted hover:text-foreground hover:bg-card-hover")}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className={cn("p-1.5 rounded-lg", page >= totalPages - 1 ? "text-muted/30" : "text-muted hover:text-foreground hover:bg-card-hover")}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelectedId(null)}>
          <div className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">{selected.title}</h2>
              <button onClick={() => setSelectedId(null)} className="p-1 rounded-lg hover:bg-card-hover"><X className="w-5 h-5 text-muted" /></button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex gap-2">
                <StatusBadge status={selected.status} />
                <SeverityBadge severity={selected.severity} />
              </div>
              <div>
                <p className="text-xs text-muted">ID</p>
                <p className="font-mono text-primary">{selected.id}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Category</p>
                <p className="text-foreground">{categoryLabels[selected.category]}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Location</p>
                <p className="text-foreground">{selected.location.address}</p>
                <p className="text-xs text-muted">{selected.location.lat.toFixed(5)}, {selected.location.lng.toFixed(5)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Description</p>
                <p className="text-foreground">{selected.description}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Reported By</p>
                <p className="text-foreground">{selected.reportedBy}</p>
              </div>
              <div className="flex gap-4">
                <div>
                  <p className="text-xs text-muted">Reported</p>
                  <p className="text-foreground">{new Date(selected.reportedAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Updated</p>
                  <p className="text-foreground">{new Date(selected.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
