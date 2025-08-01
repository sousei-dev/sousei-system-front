import { api } from '@/utils/api'

export interface CareItem {
  id: string
  name: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CareItemResponse extends CareItem {}

export interface CareItemListParams {
  is_active?: boolean
}

export const careItemService = {
  async getCareItems(params?: CareItemListParams): Promise<CareItemResponse[]> {
    const response = await api.get('/care-items', { params })
    return response.data
  },
} 