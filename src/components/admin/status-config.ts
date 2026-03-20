// Server-safe status types, constants, and utilities
// No 'use client' — can be imported from server components

export type StatusColor = 'gray' | 'blue' | 'yellow' | 'green' | 'red'

export interface StatusStep {
  value: string
  label: string
  color: StatusColor
}

export function getStatusStep(statuses: StatusStep[], value: string): StatusStep | undefined {
  return statuses.find(s => s.value === value)
}

// --- Predefined status configurations ---

export const CONFIGURATION_STATUSES: StatusStep[] = [
  { value: 'new', label: 'Nová', color: 'blue' },
  { value: 'processed', label: 'Zpracovaná', color: 'green' },
]

export const QUOTE_STATUSES: StatusStep[] = [
  { value: 'draft', label: 'Koncept', color: 'gray' },
  { value: 'sent', label: 'Odesláno', color: 'blue' },
  { value: 'accepted', label: 'Akceptováno', color: 'green' },
  { value: 'rejected', label: 'Odmítnuto', color: 'red' },
]

export const ORDER_STATUSES: StatusStep[] = [
  { value: 'created', label: 'Nová', color: 'gray' },
  { value: 'sent', label: 'Odeslaná', color: 'blue' },
  { value: 'in_production', label: 'Předána do výroby', color: 'yellow' },
]

export const PRODUCTION_STATUSES: StatusStep[] = [
  { value: 'pending', label: 'Čeká', color: 'gray' },
  { value: 'in_progress', label: 'Ve výrobě', color: 'yellow' },
  { value: 'completed', label: 'Hotovo', color: 'green' },
  { value: 'cancelled', label: 'Zrušeno', color: 'red' },
]
