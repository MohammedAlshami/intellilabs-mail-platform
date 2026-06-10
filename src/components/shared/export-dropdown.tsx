"use client";

import { useState, useMemo } from "react";
import { Download, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format as formatDate, subDays, subWeeks, subMonths, startOfDay, endOfDay } from "date-fns";

type DatePreset = "all" | "yesterday" | "lastWeek" | "lastMonth" | "custom";

interface ExportDropdownProps {
  data: Record<string, any>[];
  filename?: string;
  columnOrder?: string[];
}

export function ExportDropdown({ data, filename = "export", columnOrder }: ExportDropdownProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState("csv");
  const [preset, setPreset] = useState<DatePreset>("all");
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();

  const now = useMemo(() => new Date(), []);

  const getDateRange = () => {
    switch (preset) {
      case "yesterday": {
        const d = subDays(now, 1);
        return { start: startOfDay(d), end: endOfDay(d) };
      }
      case "lastWeek": {
        const end = subDays(now, 1);
        return { start: subWeeks(end, 1), end: endOfDay(end) };
      }
      case "lastMonth": {
        const end = subDays(now, 1);
        return { start: subMonths(end, 1), end: endOfDay(end) };
      }
      case "custom":
        return { start: customStart, end: customEnd };
      default:
        return { start: undefined, end: undefined };
    }
  };

  const filteredData = useMemo(() => {
    const { start, end } = getDateRange();
    if (!start && !end) return data;
    return data.filter((row) => {
      const dateStr = row.date || row.createdAt || row.created_at || row.Date || "";
      if (!dateStr) return true;
      const d = new Date(dateStr);
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  }, [data, preset, customStart, customEnd]);

  const handleExport = () => {
    const rows = filteredData;
    if (rows.length === 0) return;

    let processed = rows;
    if (columnOrder) {
      processed = rows.map((row) => {
        const ordered: Record<string, any> = {};
        for (const key of columnOrder) {
          if (key in row) ordered[key] = row[key];
        }
        return ordered;
      });
    }

    if (format === "csv") {
      const headers = Object.keys(processed[0]);
      const csv = [headers.join(","), ...processed.map((r) => headers.map((h) => `"${(r[h] ?? "").toString().replace(/"/g, '""')}"`).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${filename}.csv`; a.click();
      URL.revokeObjectURL(url);
    } else if (format === "txt") {
      const headers = Object.keys(processed[0]);
      const lines = processed.map((r) => headers.map((h) => r[h] ?? "").join(" | "));
      const txt = [headers.join(" | "), ...lines].join("\n");
      const blob = new Blob([txt], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${filename}.txt`; a.click();
      URL.revokeObjectURL(url);
    }
    setOpen(false);
  };

  const displayRange = preset === "all" ? "All time" :
    preset === "yesterday" ? "Yesterday" :
    preset === "lastWeek" ? "Last 7 days" :
    preset === "lastMonth" ? "Last 30 days" :
    customStart && customEnd ? `${formatDate(customStart, "MMM d")} - ${formatDate(customEnd, "MMM d")}` :
    customStart ? `From ${formatDate(customStart, "MMM d")}` : "Custom";

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Download className="size-3.5" /> Export
      </Button>
      <Dialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold">Export Data</DialogTitle>
            <DialogDescription className="text-[12px] text-gray-500">Choose format and date range</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-1 py-2">
            <div>
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1.5">Format</label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger className="w-full text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="txt">TXT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1.5">Date Range</label>
              <div className="flex gap-1.5 flex-wrap">
                {(["all", "yesterday", "lastWeek", "lastMonth", "custom"] as DatePreset[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => { setPreset(p); if (p !== "custom") { setCustomStart(undefined); setCustomEnd(undefined); } }}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors",
                      preset === p ? "bg-primary text-primary-foreground border-primary" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    )}
                  >
                    {p === "all" ? "All" : p === "yesterday" ? "Yesterday" : p === "lastWeek" ? "Last Week" : p === "lastMonth" ? "Last Month" : "Custom"}
                  </button>
                ))}
              </div>
            </div>
            {preset === "custom" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1.5">Start Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-[13px]", !customStart && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customStart ? formatDate(customStart, "MMM d, yyyy") : "Pick start"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={customStart} onSelect={setCustomStart} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1.5">End Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-[13px]", !customEnd && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customEnd ? formatDate(customEnd, "MMM d, yyyy") : "Pick end"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={customEnd} onSelect={setCustomEnd} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
            <div className="text-[11px] text-gray-400">
              {displayRange} &middot; {filteredData.length} row{filteredData.length !== 1 ? "s" : ""}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleExport} disabled={filteredData.length === 0}>
              <Download className="size-3.5" /> Export ({filteredData.length} rows)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
