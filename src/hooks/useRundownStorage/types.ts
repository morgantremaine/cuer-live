
import { RundownItem } from '@/hooks/useRundownItems'
import { Column } from '@/hooks/useColumnsManager'

export interface SavedRundown {
  id: string
  title: string
  items: RundownItem[]
  user_id: string
  team_id?: string
  created_at: string
  updated_at: string
  archived: boolean
  columns?: Column[]
  timezone?: string
  start_time?: string
  icon?: string
  undo_history?: any[]
  // Add creator profile information
  creator_profile?: {
    full_name: string | null
    email: string
  }
}
