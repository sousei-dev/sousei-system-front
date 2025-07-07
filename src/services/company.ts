import { api } from '@/utils/api'

export interface Company {
  id: string | null
  name: string
}

export const companyService = {
  // 회사 목록 조회
  getCompanies: async (): Promise<Company[]> => {
    const response = await api.get<Company[]>('/companies')
    return response.data
  },

  // 회사 상세 조회
  getCompany: async (id: string): Promise<Company> => {
    const response = await api.get<Company>(`/companies/${id}`)
    return response.data
  }
} 
