import { api } from '@/utils/api'

export interface RoomUtility {
  id: string
  room_id: string
  utility_type: 'electricity' | 'water' | 'gas'
  period_start: string
  period_end: string
  total_amount?: number
  charge_month: string
  memo?: string
  created_at: string
}

export interface Room {
  id: string
  building_id: string
  room_number: string
  rent?: number
  floor?: number
  capacity?: number
  is_available: boolean
  note?: string
  // 광열비 정보 (월별)
  utilities?: RoomUtility[]
}

export interface RoomCreateRequest {
  building_id: string
  room_number: string
  rent?: number
  floor?: number
  capacity?: number
  is_available?: boolean
  note?: string
}

export interface RoomUpdateRequest {
  room_number?: string
  rent?: number
  floor?: number
  capacity?: number
  is_available?: boolean
  note?: string
}

export interface RoomUtilityCreateRequest {
  room_id: string
  utility_type: 'electricity' | 'water' | 'gas'
  period_start: string
  period_end: string
  total_amount?: number
  charge_month: string
  memo?: string
}

export interface RoomUtilityUpdateRequest {
  utility_type?: 'electricity' | 'water' | 'gas'
  period_start?: string
  period_end?: string
  total_amount?: number
  charge_month?: string
  memo?: string
}

export interface RoomListResponse {
  items: Room[]
  total: number
  total_pages: number
  current_page: number
}

export const roomService = {
  // 방 목록 조회 (빌딩별)
  async getRoomsByBuilding(buildingId: string, params?: {
    page?: number
    size?: number
    room_number?: string
    is_available?: boolean
  }): Promise<RoomListResponse> {
    const response = await api.get(`/buildings/${buildingId}/rooms`, { params })
    return response.data
  },

  // 방 상세 조회
  async getRoom(id: string): Promise<Room> {
    const response = await api.get(`/rooms/${id}`)
    return response.data
  },

  // 방 생성
  async createRoom(data: RoomCreateRequest): Promise<Room> {
    const response = await api.post('/rooms', data)
    return response.data
  },

  // 방 수정
  async updateRoom(id: string, data: RoomUpdateRequest): Promise<Room> {
    const response = await api.put(`/rooms/${id}`, data)
    return response.data
  },

  // 방 삭제
  async deleteRoom(id: string): Promise<void> {
    await api.delete(`/rooms/${id}`)
  },

  // 유틸리티 비용 관련 API
  async createUtility(data: RoomUtilityCreateRequest) {
    const response = await api.post(`/room-utilities`, data)
    return response.data
  },

  async updateUtility(roomId: string, utilityId: string, data: RoomUtilityUpdateRequest) {
    const response = await api.put(`/rooms/${roomId}/utilities/${utilityId}`, data)
    return response.data
  },

  async deleteUtility(roomId: string, utilityId: string) {
    const response = await api.delete(`/rooms/${roomId}/utilities/${utilityId}`)
    return response.data
  },

  async getUtilitiesByMonth(roomId: string, month: string) {
    const response = await api.get(`/room-utilities`, {
      params: { 
        room_id: roomId,
        charge_month: month
      }
    })
    return response.data
  },

  async getStudentMonthlyUtilityAllocation(roomId: string, studentId: string, year: number, month: number) {
    const response = await api.get(`/rooms/${roomId}/utilities/monthly-by-students/${year}/${month}`, {
      params: { 
        student_id: studentId
      }
    })
    return response.data
  }
} 
