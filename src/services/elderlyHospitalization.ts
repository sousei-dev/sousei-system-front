import { api } from '@/utils/api'

export interface ElderlyHospitalizationCreate {
  elderly_id: string
  hospitalization_type: 'admission' | 'discharge'
  hospital_name: string
  date: string
  last_meal_date?: string
  last_meal_type?: 'breakfast' | 'lunch' | 'dinner'
  meal_resume_date?: string
  meal_resume_type?: 'breakfast' | 'lunch' | 'dinner'
  note?: string
}

export interface ElderlyHospitalizationResponse {
  id: string
  elderly_id: string
  hospitalization_type: 'admission' | 'discharge'
  hospital_name: string
  date: string
  last_meal_date?: string
  last_meal_type?: 'breakfast' | 'lunch' | 'dinner'
  meal_resume_date?: string
  meal_resume_type?: 'breakfast' | 'lunch' | 'dinner'
  note?: string
  created_at: string
  updated_at: string
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
  async getElderlyHospitalizationsByMonth(year: number, month: number, page: number = 1, pageSize: number = 100): Promise<ElderlyHospitalizationResponse[]> {
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
} 