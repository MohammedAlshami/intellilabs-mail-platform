"use client"

import { useEffect } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

interface ModalProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
}

export function Modal({ open, onClose, children, footer }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    if (open) window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ backgroundColor: "#FAFAFA" }}>
      <div className="flex items-center justify-end px-5 py-4">
        <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="mx-auto w-full max-w-2xl py-6">
          {children}
        </div>
      </div>
      {footer && (
        <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-6 pointer-events-none">
          <div className="pointer-events-auto">
            {footer}
          </div>
        </div>
      )}
    </div>,
    document.body
  )
}
