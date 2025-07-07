import { api } from '@/plugins/axios'
import type { Billing, BillingFilters } from '@/types/billing'

export const billingService = {
  // 청구서 목록 조회
  getBillings: async (filters?: BillingFilters) => {
    const response = await api.get<Billing[]>('/billings', { params: filters })
    return response.data
  },

  // 청구서 상세 조회
  getBilling: async (id: number) => {
    const response = await api.get<Billing>(`/billings/${id}`)
    return response.data
  },

  // 청구서 생성
  createBilling: async (billing: Omit<Billing, 'id' | 'created_at' | 'updated_at'>) => {
    const response = await api.post<Billing>('/billings', billing)
    return response.data
  },

  // 청구서 수정
  updateBilling: async (id: number, billing: Partial<Billing>) => {
    const response = await api.put<Billing>(`/billings/${id}`, billing)
    return response.data
  },

  // 청구서 삭제
  deleteBilling: async (id: number) => {
    await api.delete(`/billings/${id}`)
  },
}
