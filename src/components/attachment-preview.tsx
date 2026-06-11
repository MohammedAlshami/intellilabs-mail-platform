"use client"

import * as React from "react"
import { Download, FileIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Attachment } from "../app/data"

interface AttachmentPreviewProps {
  attachment: Attachment & { messageId: string }
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AttachmentPreview({ attachment, open, onOpenChange }: AttachmentPreviewProps) {
  const isImage = attachment.contentType?.startsWith("image/")
  const [imageUrl, setImageUrl] = React.useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = React.useState(false)
  const downloadUrl = `/api/mails/${attachment.messageId}/attachments/${attachment.attachmentId}`

  React.useEffect(() => {
    if (!open || !isImage) return
    setLoadingPreview(true)
    fetch(downloadUrl)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch attachment")
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        setImageUrl(url)
      })
      .catch(console.error)
      .finally(() => setLoadingPreview(false))
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl)
    }
  }, [open, isImage, downloadUrl])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={isImage ? "sm:max-w-[90vw] sm:max-h-[90vh]" : "sm:max-w-[500px]"}>
        <DialogHeader>
          <DialogTitle className="truncate">{attachment.filename ?? "Attachment"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          {isImage ? (
            loadingPreview ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Loading preview...
              </div>
            ) : imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={attachment.filename ?? "preview"}
                className="max-w-full max-h-[60vh] rounded-md object-contain"
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Failed to load preview
              </div>
            )
          ) : (
            <div className="flex flex-col items-center gap-2 py-8">
              <FileIcon className="h-16 w-16 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {attachment.contentType ?? "Unknown type"}
              </p>
            </div>
          )}
          <Button asChild className="w-full sm:w-auto">
            <a href={downloadUrl} download={attachment.filename}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
