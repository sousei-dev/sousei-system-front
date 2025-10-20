import { api } from '@/utils/api'

export interface ElderlyHospitalizationCreate {
  elderly_id: string
  hospitalization_type: 'admission' | 'discharge'
  hospital_name: string
  admission_date?: string
  discharge_date?: string
  last_meal_date?: string
  last_meal_type?: 'breakfast' | 'lunch' | 'dinner'
  meal_resume_date?: string
  meal_resume_type?: 'breakfast' | 'lunch' | 'dinner'
  note?: string
}

export interface ElderlyHospitalizationDischarge {
  discharge_date: string
  meal_resume_date: string
  meal_resume_type: 'breakfast' | 'lunch' | 'dinner'
  note?: string
}

export interface ElderlyHospitalizationResponse {
  id: string
  elderly_id: string
  elderly_name: string
  elderly_name_katakana?: string
  hospitalization_type: 'admission' | 'discharge'
  hospital_name: string
  admission_date: string
  discharge_date?: string
  last_meal_date?: string
  last_meal_type?: 'breakfast' | 'lunch' | 'dinner'
  meal_resume_date?: string
  meal_resume_type?: 'breakfast' | 'lunch' | 'dinner'
  note?: string
  created_at: string
  created_by: string
  elderly: {
    id: string
    name: string
    name_katakana?: string
    gender: string
    care_level: string
    current_room: {
      id: string
      room_number: string
      building: {
        id: string
        name: string
      }
    }
  }
}

export interface ElderlyHospitalizationListResponse {
  year: number
  month: number
  start_date: string
  end_date: string
  items: ElderlyHospitalizationResponse[]
  total: number
  total_pages: number
  current_page: number
  page_size: number
  statistics: {
    total_hospitalizations: number
    admission_count: number
    discharge_count: number
    unique_elderly_count: number
  }
}

export const elderlyHospitalizationService = {
  // 입원/퇴원 기록 생성
  async createElderlyHospitalization(data: ElderlyHospitalizationCreate): Promise<ElderlyHospitalizationResponse> {
    const response = await api.post('/elderly/hospitalizations', data)
    return response.data
  },

  // 특정 거주자의 입원/퇴원 기록 조회
  async getElderlyHospitalizations(residentId: string): Promise<ElderlyHospitalizationResponse[]> {
    const response = await api.get(`/elderly/hospitalizations/resident/${residentId}`)
    return response.data
  },

  // 월별 입원/퇴원 기록 조회
  async getElderlyHospitalizationsByMonth(year: number, month: number, page: number = 1, pageSize: number = 100): Promise<ElderlyHospitalizationListResponse> {
    const response = await api.get(`/elderly/hospitalizations/${year}/${month}`, {
      params: {
        page,
        page_size: pageSize,
      },
    })
    return response.data
  },

  // 입원/퇴원 기록 삭제
  async deleteElderlyHospitalization(recordId: string): Promise<void> {
    await api.delete(`/elderly/hospitalizations/${recordId}`)
  },

  // 퇴원 처리
  async dischargeElderlyHospitalization(recordId: string, data: ElderlyHospitalizationDischarge): Promise<ElderlyHospitalizationResponse> {
    const response = await api.put(`/elderly/hospitalizations/${recordId}/discharge`, data)
    return response.data
  },
} 