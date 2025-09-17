import * as React from "react"
import { AlertTriangle, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export interface ConfirmDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive"
  onConfirm?: () => void
  onCancel?: () => void
  icon?: React.ReactNode
  className?: string
}

export function ConfirmDialog({
  open = false,
  onOpenChange,
  title = "Confirmar ação",
  description = "Esta ação não pode ser desfeita.",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "default",
  onConfirm,
  onCancel,
  icon,
  className,
}: ConfirmDialogProps) {
  const handleClose = () => {
    onOpenChange?.(false)
    onCancel?.()
  }

  const handleConfirm = () => {
    onConfirm?.()
    onOpenChange?.(false)
  }

  const defaultIcon = variant === "destructive" ? (
    <AlertTriangle className="h-6 w-6 text-red-600" />
  ) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-md", className)}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            {icon || defaultIcon}
            <DialogTitle className={cn(
              variant === "destructive" && "text-red-900"
            )}>
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-base">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="flex-row gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={handleConfirm}
            className="flex-1"
          >
            {variant === "destructive" && <Trash2 className="w-4 h-4 mr-2" />}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Exportar o hook separadamente para evitar warning do Fast Refresh
export { useConfirmDialog } from '@/hooks/use-confirm-dialog'

