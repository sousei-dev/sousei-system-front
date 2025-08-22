import { api } from '@/utils/api'

export interface ReportCreateRequest {
  occurrence_date: string
  report_type: 'defect' | 'claim' | 'other'
  report_content: string
  photos?: File[]
}

export interface ReportCommentCreate {
  content: string
  comment_type: 'completed' | 'rejected'
}

export interface ReportCommentResponse {
  id: string
  report_id: string
  content: string
  comment_type: 'process' | 'cancel'
  created_by: string
  created_at: string
  operator?: {
    name: string
  }
}

export interface ReportResponse {
  id: string
  occurrence_date: string
  report_type: 'defect' | 'claim' | 'other'
  report_content: string
  photos?: string[]
  status?: 'pending' | 'rejected' | 'completed'
  created_at: string
  updated_at: string
  comments?: ReportCommentResponse[]
}

export const reportService = {
  // 리포트 생성
  async createReport(data: ReportCreateRequest): Promise<ReportResponse> {
    const formData = new FormData()
    formData.append('occurrence_date', data.occurrence_date)
    formData.append('report_type', data.report_type)
    formData.append('report_content', data.report_content)
    
    // 사진 파일 추가
    if (data.photos && data.photos.length > 0) {
      data.photos.forEach((photo) => {
        formData.append('photos', photo)
      })
    }
    
    const response = await api.post('/reports/with-photos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // 리포트 목록 조회
  async getReports(params?: {
    report_type?: 'defect' | 'claim' | 'other'
    status?: 'pending' | 'rejected' | 'completed'
    occurrence_date_from?: string
    occurrence_date_to?: string
    page?: number
    page_size?: number
  }): Promise<{
    items: ReportResponse[]
    total: number
    total_pages: number
  }> {
    const response = await api.get('/reports', { params })
    return response.data
  },

  // 리포트 상세 조회
  async getReport(id: string): Promise<ReportResponse> {
    const response = await api.get(`/reports/${id}`)
    return response.data
  },

  // 리포트 수정
  async updateReport(id: string, data: Partial<ReportCreateRequest>): Promise<ReportResponse> {
    const formData = new FormData()
    
    if (data.occurrence_date) formData.append('occurrence_date', data.occurrence_date)
    if (data.report_type) formData.append('report_type', data.report_type)
    if (data.report_content) formData.append('report_content', data.report_content)
    
    // 사진 파일 추가
    if (data.photos && data.photos.length > 0) {
      data.photos.forEach((photo) => {
        formData.append('photos', photo)
      })
    }
    
    const response = await api.put(`/reports/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // 리포트 삭제
  async deleteReport(id: string): Promise<void> {
    await api.delete(`/reports/${id}`)
  },

  // 리포트 코멘트 생성
  async createReportComment(reportId: string, data: ReportCommentCreate): Promise<ReportCommentResponse> {
    const response = await api.post(`/reports/${reportId}/comments`, data)
    return response.data
  },

  // 리포트 상태 업데이트 (코멘트와 함께)
  async updateReportStatus(
    reportId: string, 
    status: 'completed' | 'rejected', 
    comment: string
  ): Promise<ReportResponse> {
    // 먼저 코멘트 생성
    const commentData: ReportCommentCreate = {
      comment: comment,
      comment_type: status
    }
    
    await this.createReportComment(reportId, commentData)
    
    // 상태 업데이트 (실제 API가 있다면 여기서 호출)
    // const response = await api.patch(`/reports/${reportId}/status`, { status })
    // return response.data
    
    // 임시로 현재 보고서 반환
    return this.getReport(reportId)
  }
} 