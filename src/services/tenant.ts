import { api } from '@/utils/api'

export interface Tenant {
  id: string
  name: string
  name_katakana?: string
  room_id: string
  building_id: string
  room_number: string
  check_in_date?: string
  check_out_date?: string
  status: 'ACTIVE' | 'CHECKED_OUT'
  phone?: string
  email?: string
  nationality?: string
  note?: string
}

export interface TenantListResponse {
  items: Tenant[]
  total: number
  total_pages: number
  current_page: number
}

export const tenantService = {
  // 빌딩별 입주자 목록 조회
  async getTenantsByBuilding(buildingId: string, params?: {
    page?: number
    size?: number
    name?: string
    status?: string
  }): Promise<TenantListResponse> {
    const response = await api.get(`/buildings/${buildingId}/tenants`, { params })
    return response.data
  },

  // 입주자 상세 조회
  async getTenant(id: string): Promise<Tenant> {
    const response = await api.get(`/tenants/${id}`)
    return response.data
  },

  // 입주자 입주 기록 조회
  async getTenantHistory(tenantId: string): Promise<any[]> {
    const response = await api.get(`/tenants/${tenantId}/history`)
    return response.data
  }
} 
