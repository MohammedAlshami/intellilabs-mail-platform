"use client";

import { useState, useCallback } from "react";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: Record<string, any>[];
  filename?: string;
  columnOrder?: string[];
}

export function ExportDialog({ open, onOpenChange, data, filename = "export", columnOrder }: ExportDialogProps) {
  const [exportFormat, setExportFormat] = useState("csv");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const filteredData = useCallback(() => {
    if (!startDate && !endDate) return data;
    return data.filter((row) => {
      const dateStr = row.date || row.createdAt || row.created_at || "";
      if (!dateStr) return true;
      const d = new Date(dateStr);
      if (startDate && d < startDate) return false;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    });
  }, [data, startDate, endDate]);

  const handleExport = () => {
    const rows = filteredData();
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

    if (exportFormat === "csv") {
      const headers = Object.keys(processed[0]);
      const csv = [headers.join(","), ...processed.map((r) => headers.map((h) => `"${(r[h] ?? "").toString().replace(/"/g, '""')}"`).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${filename}.csv`; a.click();
      URL.revokeObjectURL(url);
    } else if (exportFormat === "txt") {
      const headers = Object.keys(processed[0]);
      const lines = processed.map((r) => headers.map((h) => r[h] ?? "").join(" | "));
      const txt = [headers.join(" | "), ...lines].join("\n");
      const blob = new Blob([txt], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${filename}.txt`; a.click();
      URL.revokeObjectURL(url);
    } else if (exportFormat === "xlsx") {
      const ws = XLSX.utils.json_to_sheet(processed);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data");
      XLSX.writeFile(wb, `${filename}.xlsx`);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold text-[#111827]">Export Data</DialogTitle>
          <DialogDescription className="text-[12px] text-gray-500">Choose format and date range</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-1 py-2">
          <div>
            <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1.5">Format</label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger className="w-full text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="xlsx">XLSX</SelectItem>
                <SelectItem value="txt">TXT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1.5">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-[13px]", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1.5">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-[13px]", !endDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs">Cancel</Button>
          <Button onClick={handleExport} disabled={filteredData().length === 0} className="bg-[#111827] hover:bg-black text-white text-xs">
            <Download className="size-3.5 mr-1" /> Export ({filteredData().length} rows)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
