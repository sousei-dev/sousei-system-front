import { api } from '@/utils/api'
import type { Company } from './company'
import type { Grade } from './grade'

// 재류카드 히스토리 인터페이스
export interface ResidenceCardHistory {
  id: string
  student_id: string
  residence_card_number: string
  residence_card_start: string
  residence_card_expiry: string
  note: string
  year?: string
}

// API 응답용 인터페이스
export interface Student {
  id: string
  name: string
  name_katakana: string
  company_id: string
  company: Company
  consultant: number
  phone: string
  facebook_name: string
  email: string
  avatar?: string
  gender: string
  birth_date: string
  nationality: string
  local_address: string
  address: string | null
  ward: string | null
  residence_card_number: string | null
  residence_card_start: string | null
  residence_card_expiry: string | null
  resignation_date: string | null
  grade_id: string,
  grade: Grade
  cooperation_submitted_date: string
  cooperation_submitted_place: string
  has_spouse: boolean
  japanese_level: string
  assignment_date: string | null
  passport_number: string
  passport_expiration_date: string | null
  visa_application_date: string | null
  visa_year: string | null
  created_at: string,
  status: string,
  entry_date: string,
  experience_over_2_years: boolean,
  arrival_type: string,
  current_room_id?: string,
  current_room?: {
    room_number: string
    building_name: string
  }
  student_type: string
  pre_guidance_date: string
  orientation_date: string
  certification_application_date: string
  interview_date: string | null
}

// 비자갱신 임박 학생 인터페이스
export interface VisaRenewalStudent {
  id: string
  name: string
  email: string
  phone: string
  nationality: string
  residence_card_number: string | null
  residence_card_start: string | null
  residence_card_expiry: string | null
  days_until_expiry: number
  expiry_status: string
  company: {
    id: string
    name: string
  } | null
  grade: {
    id: string
    name: string
  } | null
  current_room: {
    id: string
    room_number: string
    building: {
      id: string
      name: string
    } | null
  } | null
}

// API 요청용 인터페이스
export interface StudentInput {
  name: string
  name_katakana: string
  company_id: string
  consultant: number
  phone: string
  email: string
  avatar?: string
  gender: string
  birth_date: string
  nationality: string
  local_address: string
  address?: string
  ward?: string
  residence_card_number?: string
  residence_card_start?: string
  residence_card_expiry?: string
  resignation_date?: string
  cooperation_submitted_date: string
  cooperation_submitted_place: string
  has_spouse: boolean
  japanese_level: string
  assignment_date?: string
  passport_number: string
  passport_expiration_date?: string
  visa_application_date?: string
  visa_year?: string
  experience_over_2_years: boolean
  arrival_type: string
  entry_date: string  
  student_type: string
  pre_guidance_date: string
  orientation_date: string
  certification_application_date: string
  interview_date?: string
  current_room_id?: string
  grade_id?: string
  facebook_name?: string
}

// 수정용 인터페이스 (모든 필드가 선택적)
export interface StudentUpdate extends Partial<StudentInput> {}

export interface StudentFilters {
  name?: string
  company?: string
  consultant?: number
  email?: string
  name_katakana?: string
  nationality?: string
  japanese_level?: string
  current_room_id?: string
  page?: number
  size?: number
}

// 페이지네이션 응답 인터페이스
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
  total_pages: number
}

export const studentService = {
  // 학생 목록 조회
  getStudents: async (filters?: StudentFilters): Promise<PaginatedResponse<Student>> => {
    const response = await api.get<PaginatedResponse<Student>>('/students', { 
      params: {
        ...filters,
        page: filters?.page || 1,
        page_size: filters?.size || 10,
      }
    })
    return response.data
  },

  // 학생 생성
  createStudent: async (student: StudentInput): Promise<Student> => {
    const response = await api.post<Student>('/students', student)
    return response.data
  },

  // 학생 상세 조회
  getStudent: async (id: string): Promise<Student> => {
    const response = await api.get<Student>(`/students/${id}`)
    return response.data
  },

  // 학생 수정
  updateStudent: async (id: string, student: StudentUpdate): Promise<Student> => {
    const response = await api.put<Student>(`/students/${id}`, student)
    return response.data
  },

  // 학생 삭제
  deleteStudent: async (id: string): Promise<void> => {
    await api.delete(`/students/${id}`)
  },

  // 아바타 업로드
  uploadAvatar: async (id: string, file: File): Promise<{ avatar: string }> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post<{ avatar: string }>(`/students/${id}/changeAvatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // 재류카드 히스토리 조회
  getResidenceCardHistory: async (id: string): Promise<ResidenceCardHistory[]> => {
    const response = await api.get<ResidenceCardHistory[]>(`/students/${id}/residence-card-history`)
    return response.data
  },

  // 재류카드 추가
  addResidenceCard: async (id: string, data: {
    residence_card_number: string
    residence_card_start: string
    residence_card_expiry: string
    visa_application_date?: string
    year?: string
    note?: string
  }): Promise<ResidenceCardHistory> => {
    const response = await api.put<ResidenceCardHistory>(`/students/${id}/visa-info`, data)
    return response.data
  },

  // 비자갱신 임박 학생 조회
getVisaRenewalStudents: async (): Promise<{ data: VisaRenewalStudent[] }> => {
  const response = await api.get<{ data: VisaRenewalStudent[] }>(`/students/expiring-soon`)
  return response.data
},
} 
