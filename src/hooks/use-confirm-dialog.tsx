import * as React from "react"
import { ConfirmDialog, type ConfirmDialogProps } from "@/components/ui/confirm-dialog"

// Hook para usar o modal de confirmação de forma imperativa
export function useConfirmDialog() {
  const [state, setState] = React.useState<{
    open: boolean
    props: Omit<ConfirmDialogProps, 'open' | 'onOpenChange'>
    resolve?: (value: boolean) => void
  }>({
    open: false,
    props: {}
  })

  const confirm = React.useCallback((props: Omit<ConfirmDialogProps, 'open' | 'onOpenChange'>) => {
    return new Promise<boolean>((resolve) => {
      setState({
        open: true,
        props,
        resolve
      })
    })
  }, [])

  const handleConfirm = React.useCallback(() => {
    state.resolve?.(true)
    setState(prev => ({ ...prev, open: false }))
  }, [state])

  const handleCancel = React.useCallback(() => {
    state.resolve?.(false)
    setState(prev => ({ ...prev, open: false }))
  }, [state])

  const confirmDialog = React.useMemo(() => (
    <ConfirmDialog
      {...state.props}
      open={state.open}
      onOpenChange={(open) => {
        if (!open) handleCancel()
      }}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ), [state, handleConfirm, handleCancel])

  return {
    confirm,
    confirmDialog
  }
}
