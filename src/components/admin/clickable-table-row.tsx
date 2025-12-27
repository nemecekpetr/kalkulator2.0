'use client'

import { useRouter } from 'next/navigation'
import { TableRow } from '@/components/ui/table'

interface ClickableTableRowProps {
  href: string
  children: React.ReactNode
  className?: string
}

export function ClickableTableRow({ href, children, className = '' }: ClickableTableRowProps) {
  const router = useRouter()

  return (
    <TableRow
      className={`cursor-pointer hover:bg-muted/50 ${className}`}
      onClick={() => router.push(href)}
    >
      {children}
    </TableRow>
  )
}
