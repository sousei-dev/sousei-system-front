import { api } from '@/utils/api'

export interface ElderlyCategory {
  id: number
  category: string
  label: string
}

export interface ElderlyCategoriesResponse {
  items: ElderlyCategory[]
  total: number
  total_pages: number
}

export const elderlyCategoriesService = {
  // 카테고리 목록 조회
  async getElderlyCategories(params?: {
    page?: number
    page_size?: number
    category?: string
    label?: string
  }): Promise<ElderlyCategoriesResponse> {
    const response = await api.get('/elderly-categories', { params })
    return response.data
  },

  // 카테고리 상세 조회
  async getElderlyCategory(id: number): Promise<ElderlyCategory> {
    const response = await api.get(`/elderly-categories/${id}`)
    return response.data
  },

  // 카테고리 생성
  async createElderlyCategory(data: {
    category: string
    label: string
  }): Promise<ElderlyCategory> {
    const response = await api.post('/elderly-categories', data)
    return response.data
  },

  // 카테고리 수정
  async updateElderlyCategory(id: number, data: {
    category?: string
    label?: string
  }): Promise<ElderlyCategory> {
    const response = await api.put(`/elderly-categories/${id}`, data)
    return response.data
  },

  // 카테고리 삭제
  async deleteElderlyCategory(id: number): Promise<void> {
    await api.delete(`/elderly-categories/${id}`)
  },
} 