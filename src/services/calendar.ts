import type { CalendarEvent } from '@/types/calendar'
import { api } from '@/utils/api'

export const calendarService = {
  // 일정 목록 조회
  getEvents: async (): Promise<CalendarEvent[]> => {
    const response = await api.get('/calendar/events')
    return response.data
  },

  // 일정 생성
  createEvent: async (event: Omit<CalendarEvent, 'id' | 'created_by' | 'created_at' | 'updated_at'>): Promise<CalendarEvent> => {
    const response = await api.post('/calendar/events', event)
    return response.data
  },

  // 일정 수정
  updateEvent: async (id: number, event: Partial<CalendarEvent>): Promise<CalendarEvent> => {
    const response = await api.put(`/calendar/events/${id}`, event)
    return response.data
  },

  // 일정 삭제
  deleteEvent: async (id: number): Promise<void> => {
    await api.delete(`/calendar/events/${id}`)
  },
} 
