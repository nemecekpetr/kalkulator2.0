'use client'

import { useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { TableRow } from '@/components/ui/table'

interface ClickableTableRowProps {
  href: string
  children: React.ReactNode
  className?: string
}

export function ClickableTableRow({ href, children, className = '' }: ClickableTableRowProps) {
  const router = useRouter()
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null)

  // Track mouse down position to detect drag vs click
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    mouseDownPos.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // Don't navigate if this was a drag (text selection)
      if (mouseDownPos.current) {
        const dx = Math.abs(e.clientX - mouseDownPos.current.x)
        const dy = Math.abs(e.clientY - mouseDownPos.current.y)
        // If mouse moved more than 5px, it's probably text selection
        if (dx > 5 || dy > 5) {
          mouseDownPos.current = null
          return
        }
      }
      mouseDownPos.current = null

      // Don't navigate if clicking on interactive elements
      const target = e.target as HTMLElement
      if (
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[role="menuitem"]') ||
        target.closest('[data-radix-collection-item]')
      ) {
        return
      }

      router.push(href)
    },
    [href, router]
  )

  return (
    <TableRow
      className={`cursor-pointer hover:bg-muted/50 select-none ${className}`}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      {children}
    </TableRow>
  )
}
