import { api } from '@/utils/api'

export interface FileUploadResponse {
  id: string
  filename: string
  original_name: string
  file_size: number
  mime_type: string
  url: string
  uploaded_at: string
}

export interface FileUploadProgress {
  loaded: number
  total: number
  percentage: number
}

export interface FileUploadOptions {
  onProgress?: (progress: FileUploadProgress) => void
  onSuccess?: (response: FileUploadResponse) => void
  onError?: (error: string) => void
}

class FileUploadService {
  private baseUrl = '/api/files'

  /**
   * 단일 파일 업로드
   */
  async uploadFile(
    file: File,
    options: FileUploadOptions = {}
  ): Promise<FileUploadResponse> {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post(this.baseUrl + '/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && options.onProgress) {
            const progress: FileUploadProgress = {
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total),
            }
            options.onProgress(progress)
          }
        },
      })

      const result = response.data
      options.onSuccess?.(result)
      return result
    } catch (error: any) {
      const errorMessage = this.handleUploadError(error)
      options.onError?.(errorMessage)
      throw new Error(errorMessage)
    }
  }

  /**
   * 여러 파일 업로드
   */
  async uploadMultipleFiles(
    files: File[],
    options: FileUploadOptions = {}
  ): Promise<FileUploadResponse[]> {
    try {
      const formData = new FormData()
      files.forEach((file) => {
        formData.append('files', file)
      })

      const response = await api.post(this.baseUrl + '/upload-multiple', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && options.onProgress) {
            const progress: FileUploadProgress = {
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total),
            }
            options.onProgress(progress)
          }
        },
      })

      const results = response.data
      results.forEach((result: FileUploadResponse) => {
        options.onSuccess?.(result)
      })
      return results
    } catch (error: any) {
      const errorMessage = this.handleUploadError(error)
      options.onError?.(errorMessage)
      throw new Error(errorMessage)
    }
    }

  /**
   * 채팅 메시지용 파일 업로드
   */
  async uploadChatFile(
    file: File,
    conversationId: string,
    options: FileUploadOptions = {}
  ): Promise<FileUploadResponse> {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('conversation_id', conversationId)

      const response = await api.post(this.baseUrl + '/chat-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && options.onProgress) {
            const progress: FileUploadProgress = {
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total),
            }
            options.onProgress(progress)
          }
        },
      })

      const result = response.data
      options.onSuccess?.(result)
      return result
    } catch (error: any) {
      const errorMessage = this.handleUploadError(error)
      options.onError?.(errorMessage)
      throw new Error(errorMessage)
    }
  }

  /**
   * 파일 삭제
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      await api.delete(`${this.baseUrl}/${fileId}`)
    } catch (error: any) {
      const errorMessage = this.handleUploadError(error)
      throw new Error(errorMessage)
    }
  }

  /**
   * 파일 정보 가져오기
   */
  async getFileInfo(fileId: string): Promise<FileUploadResponse> {
    try {
      const response = await api.get(`${this.baseUrl}/${fileId}`)
      return response.data
    } catch (error: any) {
      const errorMessage = this.handleUploadError(error)
      throw new Error(errorMessage)
    }
  }

  /**
   * 파일 유효성 검사
   */
  validateFile(file: File, options: {
    maxSize?: number // MB
    allowedTypes?: string[]
  } = {}): { isValid: boolean; error?: string } {
    const { maxSize = 10, allowedTypes = [] } = options

    // 파일 크기 검사
    if (file.size > maxSize * 1024 * 1024) {
      return {
        isValid: false,
        error: `ファイルサイズは${maxSize}MB以下にしてください`,
      }
    }

    // 파일 타입 검사
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `対応していないファイル形式です: ${file.type}`,
      }
    }

    return { isValid: true }
  }

  /**
   * 파일 타입별 아이콘 가져오기
   */
  getFileIcon(file: File): string {
    const type = file.type
    if (type.startsWith('image/')) return 'ri-image-line'
    if (type.includes('pdf')) return 'ri-file-pdf-line'
    if (type.includes('word') || type.includes('document')) return 'ri-file-word-line'
    if (type.includes('excel') || type.includes('spreadsheet')) return 'ri-file-excel-line'
    if (type.includes('text')) return 'ri-file-text-line'
    if (type.includes('zip') || type.includes('rar')) return 'ri-file-zip-line'
    if (type.includes('video')) return 'ri-file-video-line'
    if (type.includes('audio')) return 'ri-file-music-line'
    return 'ri-file-line'
  }

  /**
   * 파일 크기 포맷팅
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  /**
   * 에러 처리
   */
  private handleUploadError(error: any): string {
    if (error.response) {
      const { status, data } = error.response
      switch (status) {
        case 400:
          return data.message || 'ファイル形式が正しくありません'
        case 401:
          return '認証が必要です'
        case 403:
          return 'ファイルのアップロード権限がありません'
        case 413:
          return 'ファイルサイズが大きすぎます'
        case 500:
          return 'サーバーエラーが発生しました'
        default:
          return data.message || 'ファイルのアップロードに失敗しました'
      }
    } else if (error.request) {
      return 'ネットワークエラーが発生しました'
    } else {
      return error.message || '予期しないエラーが発生しました'
    }
  }
}

export const fileUploadService = new FileUploadService() 