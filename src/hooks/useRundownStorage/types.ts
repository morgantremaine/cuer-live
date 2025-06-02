
import { RundownItem } from '@/hooks/useRundownItems'
import { Column } from '@/hooks/useColumnsManager'

export interface SavedRundown {
  id: string
  title: string
  items: RundownItem[]
  columns?: Column[]
  timezone?: string
  created_at: string
  updated_at: string
  archived?: boolean
  startTime?: string
  start_time?: string // Also include the database field name
  icon?: string
}
