import { api } from '@/utils/api'

export interface ContactCreateRequest {
  occurrence_date: string
  contact_type: 'defect' | 'claim' | 'other'
  contact_content: string
  photos?: File[]
}

export interface ContactCommentCreate {
  content: string
  comment_type: 'completed' | 'rejected'
}

export interface ContactCommentResponse {
  id: string
  contact_id: string
  content: string
  comment_type: 'process' | 'cancel'
  created_by: string
  created_at: string
  operator?: {
    name: string
  }
}

export interface ContactResponse {
  id: string
  occurrence_date: string
  contact_type: 'defect' | 'claim' | 'other'
  contact_content: string
  photos?: string[]
  status?: 'pending' | 'rejected' | 'completed'
  created_at: string
  updated_at: string
  comments?: ContactCommentResponse[]
}

export const contactService = {
  // 리포트 생성
  async createContact(data: ContactCreateRequest): Promise<ContactResponse> {
    const formData = new FormData()
    formData.append('occurrence_date', data.occurrence_date)
    formData.append('contact_type', data.contact_type)
    formData.append('contact_content', data.contact_content)
    
    // 사진 파일 추가
    if (data.photos && data.photos.length > 0) {
      data.photos.forEach((photo) => {
        formData.append('photos', photo)
      })
    }
    
    const response = await api.post('/contact/with-photos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // 리포트 목록 조회
  async getContacts(params?: {
    contact_type?: 'defect' | 'claim' | 'other'
    status?: 'pending' | 'rejected' | 'completed'
    occurrence_date_from?: string
    occurrence_date_to?: string
    page?: number
    page_size?: number
  }): Promise<{
    items: ContactResponse[]
    total: number
    total_pages: number
  }> {
    const response = await api.get('/contact', { params })
    return response.data
  },

  // 리포트 상세 조회
  async getContact(id: string): Promise<ContactResponse> {
    const response = await api.get(`/contact/${id}`)
    return response.data
  },

  // 리포트 수정
  async updateContact(id: string, data: Partial<ContactCreateRequest>): Promise<ContactResponse> {
    const formData = new FormData()
    
    if (data.occurrence_date) formData.append('occurrence_date', data.occurrence_date)
    if (data.contact_type) formData.append('contact_type', data.contact_type)
    if (data.contact_content) formData.append('contact_content', data.contact_content)
    
    // 사진 파일 추가
    if (data.photos && data.photos.length > 0) {
      data.photos.forEach((photo) => {
        formData.append('photos', photo)
      })
    }
    
    const response = await api.put(`/contact/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // 리포트 삭제
  async cancelContact(id: string): Promise<void> {
    await api.put(`/contact/${id}/cancel`)
  },

  // 리포트 코멘트 생성
  async createContactComment(contactId: string, data: ContactCommentCreate): Promise<ContactCommentResponse> {
    const response = await api.post(`/contact/${contactId}/comments`, data)
    return response.data
  },

  // 리포트 상태 업데이트 (코멘트와 함께)
  async updateContactStatus(
    contactId: string, 
    status: 'completed' | 'rejected', 
    comment: string
  ): Promise<ContactResponse> {
    // 먼저 코멘트 생성
    const commentData: ContactCommentCreate = {
      comment: comment,
      comment_type: status
    }
    
    await this.createContactComment(contactId, commentData)
    
    // 상태 업데이트 (실제 API가 있다면 여기서 호출)
    // const response = await api.patch(`/contact/${contactId}/status`, { status })
    // return response.data
    
    // 임시로 현재 연락 반환
    return this.getContact(contactId)
  }
} 