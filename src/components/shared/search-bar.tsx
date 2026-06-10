"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  table: string;
  placeholder?: string;
  onResults: (data: any[], total: number, query: string) => void;
  onClear?: () => void;
}

export function SearchBar({ table, placeholder = "Search...", onResults, onClear }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim()) {
      onClear?.();
      return;
    }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?table=${table}&q=${encodeURIComponent(query)}&limit=100`);
        const data = await res.json();
        onResults(data.data, data.total, query);
      } catch {}
      setLoading(false);
    }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, table]);

  return (
    <div className="relative w-full max-w-xs">
      <Search className={cn("absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5", loading ? "text-primary animate-pulse" : "text-gray-400")} />
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full text-[13px] text-gray-700 bg-white border border-[#e5e7eb] rounded-[6px] pl-8 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-400"
      />
      {query && (
        <button onClick={() => { setQuery(""); onClear?.(); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
