import { api } from '@/utils/api'

export interface Resident {
  id: string
  room_id: string
  resident_id: string
  check_in_date: string
  check_out_date?: string
  is_active: boolean
  note?: string
  created_at: string
  updated_at: string
  // 관계 데이터
  room?: {
    id: string
    room_number: string
    building_id: string
    floor?: number
    rent?: number
    utility_charges?: {
      electricity_amount?: number
      electricity_start_date?: string
      electricity_end_date?: string
      gas_amount?: number
      gas_start_date?: string
      gas_end_date?: string
      water_amount?: number
      water_start_date?: string
      water_end_date?: string
    }
  }
  building?: {
    id: string
    name: string
    address?: string
  }
  student?: {
    id: string
    name: string
    name_katakana: string
    nationality: string
    phone: string
    email: string
    avatar?: string
    gender: string
    birth_date: string
    japanese_level: string
    local_address: string
  }
}

export interface ResidentCreateRequest {
  room_id: string
  resident_id: string
  check_in_date: string
  check_out_date?: string
  is_active?: boolean
  note?: string
}

export interface ResidentUpdateRequest {
  change_date?: string
  new_room_id?: string
  check_out_date?: string
  is_active?: boolean
  note?: string
}

export interface ResidentListResponse {
  items: Resident[]
  total: number
  total_pages: number
  current_page: number
}

export const residentService = {
  // 방별 입주자 목록 조회
  async getResidentsByRoom(roomId: string, params?: {
    page?: number
    size?: number
    is_active?: boolean
  }): Promise<ResidentListResponse> {
    const response = await api.get(`/rooms/${roomId}/residents`, { params })
    return response.data
  },

  // 활성 입주자 조회 (현재 입주 중인 사람들)
  async getActiveResident(roomId: string): Promise<Resident[]> {
    const response = await api.get(`/rooms/${roomId}/residents/active`)
    return response.data
  },

  // 개별 입주자 조회
  async getResident(residentId: string): Promise<Resident> {
    const response = await api.get(`/residents/${residentId}`)
    return response.data
  },

  // 입주자 수정
  async updateResident(id: string, data: ResidentUpdateRequest): Promise<Resident> {
    const response = await api.post(`/students/${id}/change-residence`, data)
    return response.data
  },
  
  // 입주자 생성 (입주)
  async createResident(id: string, data: ResidentUpdateRequest): Promise<Resident> {
    const response = await api.post(`/students/${id}/new-residence`, data)
    return response.data
  },

  // 입주자 삭제
  async deleteResident(id: string): Promise<void> {
    await api.delete(`/residents/${id}`)
  },

  // 입주 기록 조회 (방별)
  async getResidentHistory(roomId: string): Promise<ResidentListResponse> {
    const response = await api.get(`/rooms/${roomId}/residence-history`)
    return response.data
  },

  // 학생별 입주 기록 조회
  async getResidentHistoryByStudent(studentId: string): Promise<{
    student: {
      id: string
      name: string
      current_room_id: string
    }
    items: Resident[]
    total: number
    total_pages: number
    current_page: number
  }> {
    const response = await api.get(`/students/${studentId}/residence-history`)
    return response.data
  },

  // 학생별 월별 입주 기록 조회
  async getMonthlyResidentHistory(studentId: string, year: number, month: number): Promise<{
    student: {
      id: string
      name: string
      current_room_id: string
    }
    items: Resident[]
    total: number
    total_pages: number
    current_page: number
  }> {
    const response = await api.get(`/students/${studentId}/residence-history/monthly`, {
      params: {
        year,
        month
      }
    })
    return response.data
  }
} 
