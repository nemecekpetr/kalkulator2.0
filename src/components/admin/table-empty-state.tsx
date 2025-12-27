'use client'

import { TableCell, TableRow } from '@/components/ui/table'

interface TableEmptyStateProps {
  colSpan: number
  hasFilter?: boolean
  emptyMessage?: string
  filterMessage?: string
  className?: string
}

export function TableEmptyState({
  colSpan,
  hasFilter = false,
  emptyMessage = 'Žádné položky nenalezeny',
  filterMessage = 'Žádné položky neodpovídají vašemu hledání',
  className = '',
}: TableEmptyStateProps) {
  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        className={`h-32 text-center text-muted-foreground ${className}`}
      >
        {hasFilter ? filterMessage : emptyMessage}
      </TableCell>
    </TableRow>
  )
}
