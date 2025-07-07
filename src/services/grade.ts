import { api } from '@/utils/api'

export interface Grade {
  id: string | null
  name: string
}

export const gradeService = {
  // 등급 목록 조회
  getGrades: async (): Promise<Grade[]> => {
    const response = await api.get<Grade[]>('/grades')
    return response.data
  },

  // 등급 상세 조회
  getGrade: async (id: string): Promise<Grade> => {
    const response = await api.get<Grade>(`/grades/${id}`)
    return response.data
  }
} 
