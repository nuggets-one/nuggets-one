'use client'

import { useFormStatus } from 'react-dom'

type AdminSubmitButtonProps = {
  label: string
  pendingLabel: string
  className?: string
}

export function AdminSubmitButton({ label, pendingLabel, className }: AdminSubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : label}
    </button>
  )
}
