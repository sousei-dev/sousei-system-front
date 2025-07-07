export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  description?: string
  color?: string
  created_by?: number
  created_at?: string
  updated_at?: string
  extendedProps?: {
    description?: string
    created_by?: number
    created_at?: string
    updated_at?: string
  }
} 
