'use client'

import { useFormStatus } from 'react-dom'
import type { ReactNode } from 'react'

type AdminSubmitButtonProps = {
  label: string
  pendingLabel: string
  className?: string
  children?: ReactNode
  'aria-label'?: string
}

export function AdminSubmitButton({
  label,
  pendingLabel,
  className,
  children,
  'aria-label': ariaLabel,
}: AdminSubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <button type="submit" disabled={pending} className={className} aria-label={ariaLabel}>
      {pending ? pendingLabel || label : children ?? label}
    </button>
  )
}
