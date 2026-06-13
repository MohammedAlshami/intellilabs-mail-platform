"use client";

import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth-context";

type Action = {
  label: string;
  onClick: () => void;
  className?: string;
  permission?: { page: string; action: string };
};

export function RowActions({ actions }: { actions: Action[] }) {
  const { can } = useAuth();
  const visible = actions.filter(a => !a.permission || can(a.permission.page, a.permission.action));
  if (visible.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition">
          <MoreHorizontal className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        {visible.map((a) => (
          <DropdownMenuItem key={a.label} onClick={a.onClick} className={a.className}>
            {a.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
