import { api } from '@/utils/api'

export interface ElderlyMealRecordCreate {
  resident_id: string
  skip_date: string
  meal_type: 'breakfast' | 'lunch' | 'dinner'
}

export interface ElderlyMealRecordResponse {
  id: string
  resident_id: string
  skip_date: string
  meal_type: string
  created_at: string
  updated_at: string
}

export const elderlyMealRecordService = {
  // 노인 식사 기록 생성
  async createElderlyMealRecord(data: ElderlyMealRecordCreate): Promise<ElderlyMealRecordResponse> {
    const response = await api.post('/elderly/meal-records', data)
    return response.data
  },

  // 특정 거주자의 월별 식사 기록 조회
  async getElderlyMealRecordsMonthly(residentId: string, year: number, month: number): Promise<ElderlyMealRecordResponse[]> {
    const response = await api.get(`/elderly-meal-records/monthly/${residentId}/${year}/${month}`)
    return response.data
  },

  // 노인 식사 기록 조회 (월별)
  async getElderlyMealRecordsByMonth(year: number, month: number, buildingId: string): Promise<any> {
    const response = await api.get(`/elderly/meal-records/monthly-building/${buildingId}/${year}/${month}`)
    return response.data
  },

  // 특정 거주자의 식사 기록 조회
  async getElderlyMealRecordsByResident(residentId: string, year: number, month: number): Promise<ElderlyMealRecordResponse[]> {
    const response = await api.get(`/elderly/meal-records/resident/${residentId}?year=${year}&month=${month}`)
    return response.data
  },

  // 노인 식사 기록 삭제
  async deleteElderlyMealRecord(recordId: string): Promise<void> {
    await api.delete(`/elderly/meal-records/${recordId}`)
  },
} 