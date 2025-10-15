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
  latest_hospitalization?: any // 입원/퇴원 기록
  hospitalization_status?: string // 입원 상태
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

export interface ElderlyCreateRequestV2 {
  name: string
  name_katakana: string
  email?: string
  phone?: string
  gender: string
  birth_date: string
  care_level: string
  categories_id?: number | null
  current_room_id?: string | null
  note?: string
  status?: 'ACTIVE' | 'PENDING_RESIGNATION' | 'RESIGNED'
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

export interface HospitalizedResident {
  elderly_id: string
  elderly_name: string
  elderly_name_katakana: string | null
  room_number: string
  care_level: string
  admission_date: string
  hospital_name: string
  last_meal_date: string
  last_meal_type: string
  note: string | null
}

export interface ElderlyBuildingStatistics {
  building_id: string
  building_name: string
  building_address: string
  statistics: {
    total_rooms: number
    occupied_rooms: number
    vacant_rooms: number
    occupancy_rate: number
    total_residents: number
    hospitalized_count: number
    non_hospitalized_count: number
    hospitalization_rate: number
    care_level_distribution: {
      [key: string]: number
    }
    age_distribution: {
      '60-69': number
      '70-79': number
      '80-89': number
      '90-99': number
      '100+': number
    }
    gender_distribution: {
      '男': number
      '女': number
      'その他': number
    }
  }
  hospitalized_residents: HospitalizedResident[]
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
  async createElderly(data: ElderlyCreateRequest | ElderlyCreateRequestV2): Promise<Elderly> {
    const response = await api.post('/elderly', data)

    return response.data
  },

  // 고령자 수정
  async updateElderly(id: string, data: ElderlyUpdateRequest): Promise<Elderly> {
    const response = await api.put(`/elderly/${id}/update`, data)

    return response.data
  },

  // 고령자 삭제
  async deleteElderly(id: string): Promise<void> {
    await api.delete(`/elderly/${id}`)
  },

  // 빌딩별 고령자 통계 조회
  async getBuildingStatistics(buildingId: string): Promise<ElderlyBuildingStatistics> {
    const response = await api.get(`/elderly/buildings/${buildingId}/statistics`)
    return response.data
  },
}
