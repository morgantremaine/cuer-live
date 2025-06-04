import { RundownItem } from '@/types/rundown'
import { Column } from '@/hooks/useColumnsManager'

export interface SavedRundown {
  id: string
  title: string
  items: RundownItem[]
  created_at: string
  updated_at: string
  user_id: string
  archived?: boolean
  columns?: Column[]
  timezone?: string
  start_time?: string
  icon?: string
}
