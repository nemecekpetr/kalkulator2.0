'use client'

import { TableCell } from '@/components/ui/table'

interface StopPropagationCellProps {
  children: React.ReactNode
  className?: string
}

export function StopPropagationCell({ children, className }: StopPropagationCellProps) {
  return (
    <TableCell className={className} onClick={(e) => e.stopPropagation()}>
      {children}
    </TableCell>
  )
}
