import { api } from '@/utils/api'

export interface Building {
  id: string
  name: string
  address?: string
  total_rooms?: number
  note?: string
  resident_type?: 'elderly' | 'student'
}

export interface BuildingCreateRequest {
  name: string
  address?: string
  building_type?: string
  total_rooms?: number
  note?: string
  resident_type?: 'elderly' | 'student'
}

export interface BuildingUpdateRequest {
  name?: string
  address?: string
  building_type?: string
  total_rooms?: number
  note?: string
}

export interface BuildingListResponse {
  items: Building[]
  total: number
  total_pages: number
  current_page: number
}

export interface BuildingOption {
  value: string
  label: string
  address: string
  empty_rooms_count: number
}

export interface BuildingOptionsResponse {
  options: BuildingOption[]
  total: number
}

// My Buildings 응답 타입
export interface MyBuildingItem {
  building_id: string
  building_name: string
  address: string
  building_type: string
  resident_type: 'elderly' | 'student'
  total_rooms: number
  active_residents_count: number
  granted_at: string
  granted_by: string | null
  has_full_access: boolean
}

export interface MyBuildingsResponse {
  user_id: string
  user_role: string
  has_full_access: boolean
  total_buildings: number
  buildings: MyBuildingItem[]
}

export interface EmptyRoomOption {
  value: string
  label: string
  room_number: string
  floor: number
  capacity: number | null
  current_residents: number
  available_spots: number | null
  rent: number | null
  note: string | null
}

export interface EmptyRoomsResponse {
  building: {
    id: string
    name: string
    address: string
  }
  options: EmptyRoomOption[]
  total: number
}

// 월별 청구서 미리보기 응답 인터페이스
export interface MonthlyInvoicePreview {
  building_id: string
  building_name: string
  year: number
  month: number
  invoices: Array<{
    student_id: string
    student_name: string
    total_amount: number
    items: Array<{
      name: string
      unit_price: number
      quantity: number
      amount: number
      memo: string
      type: string
    }>
    payment_status: string
  }>
  total_invoices: number
  total_amount: number
}

export const buildingService = {
  // 빌딩 목록 조회
  async getBuildings(params?: {
    page?: number
    size?: number
    name?: string
    address?: string
    resident_type?: 'elderly' | 'student'
  }): Promise<BuildingListResponse> {
    const response = await api.get('/buildings', { params })

    return response.data
  },

  // 내 권한으로 조회 가능한 빌딩 목록
  async getMyBuildings(): Promise<MyBuildingsResponse> {
    const response = await api.get('/buildings/my-buildings')

    return response.data
  },

  // 빌딩 상세 조회
  async getBuilding(id: string): Promise<Building> {
    const response = await api.get(`/buildings/${id}`)

    return response.data
  },

  // 빌딩 생성
  async createBuilding(data: BuildingCreateRequest): Promise<Building> {
    const response = await api.post('/buildings', data)

    return response.data
  },

  // 빌딩 수정
  async updateBuilding(id: string, data: BuildingUpdateRequest): Promise<Building> {
    const response = await api.put(`/buildings/${id}`, data)

    return response.data
  },

  // 빌딩 삭제
  async deleteBuilding(id: string): Promise<void> {
    await api.delete(`/buildings/${id}`)
  },

  // 빌딩 옵션 조회 (셀렉트용)
  async getBuildingOptions(): Promise<BuildingOptionsResponse> {
    const response = await api.get('/buildings/options')

    return response.data
  },

  // 특정 빌딩의 빈 호실 목록 조회
  async getEmptyRoomsByBuilding(buildingId: string): Promise<EmptyRoomsResponse> {
    const response = await api.get(`/buildings/${buildingId}/empty-rooms`)

    return response.data
  },

  // 월별 청구서 미리보기 조회 (회사 기준)
  async getMonthlyInvoicePreviewCompany(
    year: number,
    month: number,
    id?: string,
    isBillingScope?: boolean,
  ): Promise<MonthlyInvoicePreview> {
    const params: any = {}
    params.is_billing_scope = isBillingScope
    if (isBillingScope) {
      params.department_id = id
    } else {
      params.company_id = id
    }

    const response = await api.get(`/buildings/monthly-invoice-preview/students/company/${year}/${month}`, { params })

    return response.data
  },

  // 월별 청구서 미리보기 조회 (건물 기준)
  async getMonthlyInvoicePreviewBuilding(
    year: number,
    month: number,
    buildingId?: string,
  ): Promise<MonthlyInvoicePreview> {
    const params: any = {}
    if (buildingId)
      params.building_id = buildingId

    const response = await api.get(`/buildings/monthly-invoice-preview/students/by-building/${year}/${month}`, { params })

    return response.data
  },

  // 방에대한 청구리스트 조회
  getBuildingDownloadMonthlyInvoice: async (year: number, month: number) => {
    return api.get(`/buildings/download-monthly-invoice/${year}/${month}`, { responseType: 'blob' })
  },

  getBuildingDownloadMonthlyInvoiceValidate: async (year: number, month: number) => {
    const response = await api.get(`/buildings/download-monthly-invoice/validate/${year}/${month}`)

    return response.data
  },

  // 월별 청구서 PDF 다운로드 (회사 기준)
  downloadMonthlyInvoicePdfCompany: async (year: number, month: number, companyId: string) => {
    const response = await api.get(`/buildings/download-monthly-invoice-pdf/students/company/${year}/${month}`, {
      params: { company_id: companyId },
      responseType: 'blob',
    })

    return response
  },
} 
