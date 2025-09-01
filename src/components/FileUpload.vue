<template>
  <div class="file-upload-container">
    <!-- 파일 업로드 영역 -->
    <div
      class="upload-area"
      :class="{ 'drag-over': isDragOver, 'has-files': files.length > 0 }"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @click="triggerFileInput"
    >
      <!-- 파일이 없을 때 -->
      <div v-if="files.length === 0" class="upload-placeholder">
        <VIcon size="48" color="primary" class="upload-icon">ri-upload-cloud-line</VIcon>
        <div class="upload-text">
          <span class="upload-title">ファイルをアップロード</span>
          <span class="upload-subtitle">クリックまたはドラッグ＆ドロップでファイルを選択</span>
        </div>
        <div class="upload-formats">
          <span class="format-item">画像: JPG, PNG, GIF</span>
          <span class="format-item">文書: PDF, DOC, TXT</span>
          <span class="format-item">その他: ZIP, RAR</span>
        </div>
      </div>

      <!-- 파일이 있을 때 -->
      <div v-else class="files-preview">
        <div class="files-header">
          <span class="files-count">{{ files.length }}個のファイル</span>
          <VBtn
            variant="text"
            size="small"
            color="error"
            @click="clearFiles"
            class="clear-btn"
          >
            すべて削除
          </VBtn>
        </div>
        <div class="files-grid">
          <div
            v-for="(file, index) in files"
            :key="file.id"
            class="file-item"
          >
            <!-- 이미지 파일 미리보기 -->
            <div v-if="isImageFile(file)" class="file-preview image">
              <div v-if="file.preview" class="image-preview">
                <VImg :src="file.preview" :alt="file.name" />
              </div>
              <div v-else class="image-loading">
                <VIcon size="24" class="loading-icon">ri-loader-4-line</VIcon>
                <span>로딩 중...</span>
              </div>
            </div>
            <!-- 일반 파일 아이콘 -->
            <div v-else class="file-preview file">
              <VIcon size="32" color="primary">{{ getFileIcon(file) }}</VIcon>
            </div>
            
            <div class="file-info">
              <div class="file-name" :title="getFileName(file)">{{ getFileName(file) }}</div>
              <div class="file-size">{{ getFileSize(file) }}</div>
            </div>
            
            <VBtn
              variant="text"
              size="x-small"
              color="error"
              @click="removeFile(index)"
              class="remove-btn"
            >
              <VIcon>ri-close-line</VIcon>
            </VBtn>
          </div>
        </div>
      </div>
    </div>

    <!-- 숨겨진 파일 입력 -->
    <input
      ref="fileInput"
      type="file"
      multiple
      :accept="accept"
      @change="handleFileSelect"
      class="hidden-input"
    />

    <!-- 업로드 진행률 -->
    <div v-if="uploadProgress > 0 && uploadProgress < 100" class="upload-progress">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: `${uploadProgress}%` }"></div>
      </div>
      <span class="progress-text">{{ uploadProgress }}%</span>
    </div>

    <!-- 에러 메시지 -->
    <div v-if="errorMessage" class="error-message">
      <VIcon color="error" size="16">ri-error-warning-line</VIcon>
      <span>{{ errorMessage }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

// Props
interface Props {
  accept?: string
  maxFiles?: number
  maxFileSize?: number // MB 단위
  multiple?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  accept: '*/*',
  maxFiles: 10,
  maxFileSize: 10, // 10MB
  multiple: true,
})

// Emits
const emit = defineEmits<{
  'files-selected': [files: File[]]
  'files-removed': [files: File[]]
  'upload-progress': [progress: number]
  'upload-error': [error: string]
}>()

// Reactive data
const files = ref<Array<File & { preview?: string; id: string }>>([])
const isDragOver = ref(false)
const uploadProgress = ref(0)
const errorMessage = ref('')
const fileInput = ref<HTMLInputElement>()

// Computed properties
const hasFiles = computed(() => files.value.length > 0)
const filesCount = computed(() => files.value.length)
const filesInfo = computed(() => files.value.map(f => ({
  id: f.id,
  name: f.name,
  size: f.size,
  type: f.type,
  hasPreview: !!f.preview,
})))

// Computed
const isImageFile = (file: File): boolean => {
  console.log('=== isImageFile 함수 호출 ===')
  console.log('입력된 파일 객체:', file)
  console.log('파일 타입:', file?.type)
  console.log('파일 객체 타입:', typeof file)
  console.log('File 인스턴스 여부:', file instanceof File)
  
  // 파일 객체 자체가 없는 경우
  if (!file) {
    console.warn('파일 객체가 null 또는 undefined입니다')
    return false
  }
  
  // File 인스턴스가 아닌 경우
  if (!(file instanceof File)) {
    console.warn('File 인스턴스가 아닙니다:', {
      constructor: file?.constructor?.name,
      prototype: Object.getPrototypeOf(file),
    })
    return false
  }
  
  // 파일 타입이 없는 경우
  if (!file.type) {
    console.warn('파일 타입 정보가 없습니다:', {
      name: file.name,
      size: file.size,
      hasType: 'type' in file,
      typeValue: file.type,
    })
    return false
  }
  
  // 파일 타입이 문자열이 아닌 경우
  if (typeof file.type !== 'string') {
    console.warn('파일 타입이 문자열이 아닙니다:', {
      type: file.type,
      typeOf: typeof file.type,
    })
    return false
  }
  
  const isImage = file.type.startsWith('image/')
  console.log('이미지 파일 여부:', isImage, '타입:', file.type)
  
  return isImage
}

const getFileIcon = (file: File): string => {
  // 파일 타입이 없는 경우 기본 아이콘 반환
  if (!file || !file.type) {
    return 'ri-file-line'
  }
  
  const type = file.type
  if (type.includes('pdf')) return 'ri-file-pdf-line'
  if (type.includes('word') || type.includes('document')) return 'ri-file-word-line'
  if (type.includes('excel') || type.includes('spreadsheet')) return 'ri-file-excel-line'
  if (type.includes('text')) return 'ri-file-text-line'
  if (type.includes('zip') || type.includes('rar')) return 'ri-file-zip-line'
  if (type.includes('video')) return 'ri-file-video-line'
  if (type.includes('audio')) return 'ri-file-music-line'
  return 'ri-file-line'
}

// 안전한 파일 이름 가져오기
const getFileName = (file: File & { preview?: string; id: string }): string => {
  if (!file) return '알 수 없는 파일'
  if (file.name && typeof file.name === 'string' && file.name.trim()) {
    return file.name
  }
  return '이름 없음'
}

// 안전한 파일 크기 가져오기
const getFileSize = (file: File & { preview?: string; id: string }): string => {
  if (!file) return '크기 알 수 없음'
  if (file.size && typeof file.size === 'number' && !Number.isNaN(file.size) && file.size >= 0) {
    return formatFileSize(file.size)
  }
  return '크기 알 수 없음'
}

// Methods
const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  console.log('=== 파일 선택 이벤트 ===')
  console.log('이벤트 객체:', event)
  console.log('타겟 요소:', target)
  console.log('선택된 파일들:', target.files)
  console.log('FileList 길이:', target.files?.length)
  
  if (target.files) {
    const fileArray = Array.from(target.files)
    console.log('파일 배열 변환:', fileArray)
    console.log('배열 길이:', fileArray.length)
    
    // 각 파일의 상세 정보 로깅
    fileArray.forEach((file, index) => {
      console.log(`파일 ${index + 1} 상세 정보:`, {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        isFile: file instanceof File,
        constructor: file.constructor.name,
        prototype: Object.getPrototypeOf(file),
        hasOwnProperty: {
          name: Object.prototype.hasOwnProperty.call(file, 'name'),
          size: Object.prototype.hasOwnProperty.call(file, 'size'),
          type: Object.prototype.hasOwnProperty.call(file, 'type'),
        },
      })
      
      // 파일 객체의 모든 속성 확인
      console.log(`파일 ${index + 1} 모든 속성:`, Object.getOwnPropertyNames(file))
      console.log(`파일 ${index + 1} 프로토타입 체인:`, Object.getPrototypeOf(file))
    })
    
    addFiles(fileArray)
  } else {
    console.warn('target.files가 null 또는 undefined입니다')
  }
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false
  
  console.log('=== 드래그 앤 드롭 이벤트 ===')
  console.log('이벤트 객체:', event)
  console.log('dataTransfer:', event.dataTransfer)
  console.log('드롭된 파일들:', event.dataTransfer?.files)
  console.log('FileList 길이:', event.dataTransfer?.files?.length)
  
  if (event.dataTransfer?.files) {
    const fileArray = Array.from(event.dataTransfer.files)
    console.log('드롭 파일 배열 변환:', fileArray)
    console.log('배열 길이:', fileArray.length)
    
    // 각 파일의 상세 정보 로깅
    fileArray.forEach((file, index) => {
      console.log(`드롭 파일 ${index + 1}:`, {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        isFile: file instanceof File,
        constructor: file.constructor.name,
      })
    })
    
    addFiles(fileArray)
  } else {
    console.warn('dataTransfer.files가 null 또는 undefined입니다')
  }
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = true
}

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false
}

const addFiles = async (newFiles: File[]) => {
  errorMessage.value = ''
  
  console.log('=== addFiles 함수 시작 ===')
  console.log('입력받은 파일들:', newFiles)
  console.log('현재 files 배열 상태:', files.value)
  
  // 파일 배열 유효성 검사
  if (!newFiles || !Array.isArray(newFiles) || newFiles.length === 0) {
    console.warn('유효하지 않은 파일 배열:', newFiles)
    return
  }
  
  console.log('처리할 파일들:', newFiles.map(f => ({
    name: f.name,
    size: f.size,
    type: f.type,
    isValid: f instanceof File,
    constructor: f.constructor.name,
  })))
  
  // 파일 개수 제한 확인
  if (files.value.length + newFiles.length > props.maxFiles) {
    errorMessage.value = `最大${props.maxFiles}個のファイルまでアップロード可能です`
    return
  }
  
  // 파일 크기 및 타입 검증
  for (const file of newFiles) {
    console.log('검증 중인 파일:', {
      file,
      name: file?.name,
      size: file?.size,
      type: file?.type,
      isFile: file instanceof File,
      constructor: file?.constructor?.name,
    })
    
    if (!file || !(file instanceof File)) {
      console.warn('유효하지 않은 파일 객체:', file)
      continue
    }
    
    // 파일 속성 검증
    if (!file.name || typeof file.name !== 'string') {
      console.warn('파일 이름이 유효하지 않음:', file.name)
    }
    
    if (!file.size || typeof file.size !== 'number' || Number.isNaN(file.size) || file.size < 0) {
      console.warn('파일 크기가 유효하지 않음:', file.size)
    }
    
    if (file.size > props.maxFileSize * 1024 * 1024) {
      errorMessage.value = `ファイルサイズは${props.maxFileSize}MB以下にしてください: ${file.name || '알 수 없는 파일'}`
      return
    }
  }
  
  try {
    console.log('이미지 미리보기 생성 시작...')
    
    // 이미지 파일 미리보기 생성
    const processedFiles = await Promise.all(newFiles.map(async (file, index) => {
      console.log(`파일 ${index + 1} 처리 중:`, {
        name: file.name,
        size: file.size,
        type: file.type,
      })
      
      const fileWithId = {
        ...file,
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      }
      
      console.log('ID가 추가된 파일:', {
        id: fileWithId.id,
        name: fileWithId.name,
        size: fileWithId.size,
        type: fileWithId.type,
      })
      
      if (isImageFile(file)) {
        console.log('이미지 파일 감지됨, 미리보기 생성 중...')
        try {
          const preview = await createImagePreview(file)
          console.log('미리보기 생성 완료:', preview.substring(0, 50) + '...')
          return { ...fileWithId, preview }
        } catch (error) {
          console.error('이미지 미리보기 생성 실패:', error)
          return fileWithId
        }
      } else {
        console.log('일반 파일로 처리')
        return fileWithId
      }
    }))
    
    console.log('처리된 파일들:', processedFiles)
    
    // 파일 추가
    const beforeLength = files.value.length
    files.value.push(...processedFiles)
    const afterLength = files.value.length
    
    console.log(`파일 배열 업데이트: ${beforeLength} -> ${afterLength}`)
    console.log('현재 files 배열:', files.value)
      
    // 부모 컴포넌트에 알림
    const filesForParent = files.value.map(f => ({ ...f, preview: undefined }))
    console.log('부모에게 전달할 파일들:', filesForParent)
    emit('files-selected', filesForParent)
    
    console.log('파일 추가 완료:', processedFiles.length, '개')
    console.log('최종 파일 목록:', files.value.map(f => ({
      id: f.id,
      name: f.name,
      size: f.size,
      type: f.type,
      hasPreview: !!f.preview,
    })))
  } catch (error) {
    console.error('파일 처리 중 오류 발생:', error)
    errorMessage.value = '파일 처리 중 오류가 발생했습니다.'
  }
}

const createImagePreview = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    // 파일 유효성 검사
    if (!file || !(file instanceof File)) {
      reject(new Error('유효하지 않은 파일 객체'))
      return
    }
    
    if (!file.type || !file.type.startsWith('image/')) {
      reject(new Error('이미지 파일이 아닙니다'))
      return
    }
    
    const reader = new FileReader()
    
    reader.onload = e => {
      if (e.target?.result) {
        resolve(e.target.result as string)
      } else {
        reject(new Error('이미지 읽기 실패'))
      }
    }
    
    reader.onerror = () => reject(new Error('이미지 읽기 오류'))
    
    try {
      reader.readAsDataURL(file)
    } catch (error) {
      reject(new Error(`파일 읽기 오류: ${error}`))
    }
  })
}

const removeFile = (index: number) => {
  const removedFile = files.value[index]
  
  // 미리보기 URL 정리
  if (removedFile.preview) {
    // Data URL은 revokeObjectURL이 필요하지 않음
    // URL.createObjectURL로 생성된 경우에만 필요
  }
  
  files.value.splice(index, 1)
  emit('files-removed', files.value.map(f => ({ ...f, preview: undefined })))
}

const clearFiles = () => {
  // 모든 미리보기 정리
  files.value.forEach(file => {
    if (file.preview) {
      // Data URL은 revokeObjectURL이 필요하지 않음
    }
  })
  
  files.value = []
  emit('files-removed', [])
}

const formatFileSize = (bytes: number): string => {
  // 유효하지 않은 값 처리
  if (!bytes || typeof bytes !== 'number' || Number.isNaN(bytes) || bytes < 0) {
    return '크기 알 수 없음'
  }
  
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  // 배열 범위 체크
  if (i < 0 || i >= sizes.length) {
    return `${bytes} B`
  }
  
  const size = bytes / (k ** i)
  return `${size.toFixed(1)} ${sizes[i]}`
}

// Public methods (부모 컴포넌트에서 호출 가능)
const getFiles = (): File[] => {
  return [...files.value]
}

const setUploadProgress = (progress: number) => {
  uploadProgress.value = progress
  emit('upload-progress', progress)
}

const setError = (error: string) => {
  errorMessage.value = error
  emit('upload-error', error)
}

const clearError = () => {
  errorMessage.value = ''
}

// 디버깅을 위한 파일 상태 확인 함수
const debugFileState = () => {
  console.log('=== 현재 파일 상태 디버깅 ===')
  console.log('files 배열 길이:', files.value.length)
  console.log('files 배열 내용:', files.value)
  
  files.value.forEach((file, index) => {
    console.log(`파일 ${index + 1} 상태:`, {
      id: file.id,
      name: file.name,
      size: file.size,
      type: file.type,
      hasPreview: !!file.preview,
      isFile: file instanceof File,
      constructor: file.constructor?.name,
      prototype: Object.getPrototypeOf(file),
    })
  })
  
  console.log('computed 상태:')
  console.log('- hasFiles:', hasFiles.value)
  console.log('- filesCount:', filesCount.value)
  console.log('- filesInfo:', filesInfo.value)
}

// Expose methods
defineExpose({
  getFiles,
  setUploadProgress,
  setError,
  clearError,
  clearFiles,
})

// Cleanup
onUnmounted(() => {
  // Data URL은 revokeObjectURL이 필요하지 않음
  // URL.createObjectURL로 생성된 경우에만 필요
  // 현재는 FileReader.readAsDataURL을 사용하므로 별도 정리 불필요
})
</script>

<style scoped>
.file-upload-container {
  width: 100%;
}

.upload-area {
  border: 2px dashed #e0e0e0;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: #fafafa;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-area:hover {
  border-color: #7c3aed;
  background-color: #f8f5ff;
}

.upload-area.drag-over {
  border-color: #7c3aed;
  background-color: #f0e7ff;
  transform: scale(1.02);
}

.upload-area.has-files {
  min-height: auto;
  padding: 16px;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.upload-icon {
  opacity: 0.7;
}

.upload-text {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.upload-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.upload-subtitle {
  font-size: 14px;
  color: #666;
}

.upload-formats {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
}

.format-item {
  font-size: 12px;
  color: #999;
  background-color: #f0f0f0;
  padding: 4px 8px;
  border-radius: 4px;
}

.files-preview {
  width: 100%;
}

.files-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e0e0e0;
}

.files-count {
  font-weight: 600;
  color: #333;
}

.clear-btn {
  font-size: 12px;
}

.files-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.file-item {
  position: relative;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px;
  background-color: white;
  transition: all 0.2s ease;
}

.file-item:hover {
  border-color: #7c3aed;
  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.1);
}

.file-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  height: 60px;
}

.file-preview.image img {
  max-width: 100%;
  max-height: 100%;
  border-radius: 4px;
  object-fit: cover;
}

.image-preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #666;
  font-size: 12px;
}

.loading-icon {
  animation: spin 1s linear infinite;
  color: #7c3aed;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.file-preview.file {
  color: #7c3aed;
}

.file-info {
  text-align: center;
}

.file-name {
  font-size: 12px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: 10px;
  color: #666;
}

.remove-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  min-width: 24px;
  height: 24px;
  padding: 0;
}

.hidden-input {
  display: none;
}

.upload-progress {
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background-color: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #7c3aed;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: #666;
  min-width: 40px;
}

.error-message {
  margin-top: 12px;
  padding: 8px 12px;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #dc2626;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  .upload-area {
    padding: 16px;
    min-height: 150px;
  }
  
  .files-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 8px;
  }
  
  .file-item {
    padding: 8px;
  }
  
  .upload-formats {
    flex-direction: column;
    gap: 8px;
  }
}
</style> 