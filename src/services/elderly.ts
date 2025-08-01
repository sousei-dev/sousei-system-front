import { api } from '@/utils/api'

export interface Elderly {
  id: string
  name: string
  name_katakana: string
  current_room?: {
    room_number: string
  }
  building_name: string
  age: number
  gender: '男' | '女'
  care_level: string
  admission_date: string
  created_at: string
  updated_at: string
}

export interface ElderlyListResponse {
  items: Elderly[]
  total: number
  total_pages: number
  current_page: number
}

export interface ElderlyCreateRequest {
  name: string
  name_katakana: string
  room_id: string
  birth_date: string
  gender: '男' | '女'
  care_level: string
  admission_date: string
  note?: string
  security_months?: number
  security_deposit?: number
  rent?: number
  maintenance?: number
  service?: number
  status_id?: number
}

export interface ElderlyUpdateRequest {
  name?: string
  name_katakana?: string
  room_id?: string
  age?: number
  gender?: '男' | '女'
  care_level?: string
  admission_date?: string
  note?: string
}

export interface ElderlySearchParams {
  name?: string
  name_katakana?: string
  gender?: string
  care_level?: string
  building_name?: string
  room_number?: string
  page?: number
  page_size?: number
}

export const elderlyService = {
  // 고령자 목록 조회 (검색 포함)
  async getElderlys(params?: ElderlySearchParams): Promise<ElderlyListResponse> {
    const response = await api.get('/elderly', { params })

    return response.data
  },

  // 고령자 상세 조회
  async getElderly(id: string): Promise<Elderly> {
    const response = await api.get(`/elderly/${id}`)

    return response.data
  },

  // 고령자 생성
  async createElderly(data: ElderlyCreateRequest): Promise<Elderly> {
    const response = await api.post('/elderly', data)

    return response.data
  },

  // 고령자 수정
  async updateElderly(id: string, data: ElderlyUpdateRequest): Promise<Elderly> {
    const response = await api.put(`/elderly/${id}`, data)

    return response.data
  },

  // 고령자 삭제
  async deleteElderly(id: string): Promise<void> {
    await api.delete(`/elderly/${id}`)
  },
}
