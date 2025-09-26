<template>
  <div class="chat-container">
    <!-- 모바일 헤더 -->
    <div class="mobile-header" v-if="isMobile">
      <div class="mobile-header-content">
        <VBtn
          icon
          variant="text"
          size="small"
          @click="toggleSidebar"
          class="sidebar-toggle-btn"
        >
          <VIcon>{{ showSidebar ? 'ri-close-line' : 'ri-menu-line' }}</VIcon>
        </VBtn>
        <div class="mobile-title">
          <span v-if="selectedChat">{{ selectedChat.title }}</span>
          <span v-else>チャット</span>
        </div>
        <div class="mobile-actions">
          <VBtn
            v-if="selectedChat"
            icon
            variant="text"
            size="small"
            @click="showChatOptions = !showChatOptions"
          >
            <VIcon>ri-more-2-line</VIcon>
          </VBtn>
        </div>
      </div>
    </div>

    <!-- 모바일 사이드바 오버레이 -->
    <div 
      v-if="isMobile && showSidebar" 
      class="sidebar-overlay"
      @click="showSidebar = false"
    ></div>
    
    <!-- 좌측 사이드바 -->
    <div :class="['chat-sidebar', { 'sidebar-open': showSidebar }]">
      <!-- 사용자 프로필 및 검색 -->
      <div class="sidebar-header">
        <div class="user-profile">
          <VTextField
            v-model="searchQuery"
            prepend-inner-icon="ri-search-line"
            placeholder="Search..."
            variant="outlined"
            density="compact"
            hide-details
            disabled
            class="search-field"
          />
        </div>
      </div>

      <!-- 탭 네비게이션 -->
      <div class="sidebar-tabs">
        <div 
          :class="['tab-item', { active: activeTab === 'chats' }]"
          @click="activeTab = 'chats'"
        >
          <VIcon>ri-message-2-line</VIcon>
          <span>チャット</span>
        </div>
        <div 
          :class="['tab-item', { active: activeTab === 'users' }]"
          @click="activeTab = 'users'"
        >
          <VIcon>ri-user-line</VIcon>
          <span>ユーザー</span>
        </div>
      </div>

      <!-- チャット一覧 -->
      <div v-if="activeTab === 'chats'" class="sidebar-section">
        <h3 class="section-title">チャットリスト</h3>
        <div v-if="isLoadingChats" class="loading-chats">
          <VIcon class="loading-icon">ri-loader-4-line</VIcon>
          <span>チャットリストを読み込んでいます...</span>
        </div>
        <div v-else class="chat-list">
          <div
            v-for="chat in chats"
            :key="chat.id"
            :class="['chat-item', { active: selectedChat?.id === chat.id }]"
            @click="selectChat(chat)"
          >
            <VAvatar size="40" class="me-3">
              <VImg v-if="chat.participants[0].avatar" :src="chat.participants[0].avatar" />
              <VAvatar v-else :color="getUserColor(chat.title)" size="40">
                <span class="text-white text-h6">{{ getUserInitials(chat.title) }}</span>
              </VAvatar>
              <div v-if="chat.unread_count > 0" class="unread-indicator"></div>
            </VAvatar>
            <div class="chat-info">
              <div class="chat-name">{{ chat.title }}</div>
              <div class="chat-last-message">{{ chat.last_message?.body || 'メッセージがありません' }}</div>
              <div class="chat-date">{{ formatDate(chat.last_message?.created_at) }}</div>
            </div>
            <div class="chat-actions">
              <!-- 나가기 버튼 제거됨 -->
            </div>
          </div>
        </div>
      </div>

      <!-- ユーザー一覧 -->
      <div v-if="activeTab === 'users'" class="sidebar-section">
        <div class="user-section-header">
          <h3 class="section-title">ユーザーリスト ({{ totalUsers }}人)</h3>
          <VBtn
            v-if="!isGroupChatMode"
            size="small"
            color="primary"
            variant="outlined"
            @click="enterGroupChatMode"
            class="group-chat-btn"
          >
            <VIcon class="me-1">ri-group-line</VIcon>
            グループチャット作成
          </VBtn>
          <div v-else class="group-chat-controls">
            <VBtn
              size="small"
              color="error"
              variant="outlined"
              @click="cancelGroupChatMode"
              class="cancel-btn"
            >
              キャンセル
            </VBtn>
            <VBtn
              size="small"
              color="success"
              variant="elevated"
              @click="createGroupChat"
              :disabled="selectedUsersForGroup.length < 2"
              class="create-btn"
            >
              作成 ({{ selectedUsersForGroup.length }})
            </VBtn>
          </div>
        </div>
        
        <div v-if="isLoadingUsers" class="loading-users">
          <VIcon class="loading-icon">ri-loader-4-line</VIcon>
          <span>ユーザーリストを読み込んでいます...</span>
        </div>
        <div v-else class="user-list-container">
          <!-- 부서별 사용자 목록 -->
          <div 
            v-for="(deptData, department) in usersByDepartment" 
            :key="department"
            class="department-section"
          >
            <div 
              class="department-header"
              @click="toggleDepartment(department)"
            >
              <VIcon class="department-icon">ri-building-line</VIcon>
              <span class="department-name">{{ department }}</span>
              <span class="department-count">({{ deptData.count }}人)</span>
              <VIcon 
                class="dropdown-icon"
                :class="{ 'expanded': expandedDepartments.has(department) }"
              >
                {{ expandedDepartments.has(department) ? 'ri-arrow-up-s-line' : 'ri-arrow-right-s-line' }}
              </VIcon>
            </div>
            
            <div 
              v-show="expandedDepartments.has(department)"
              class="department-users"
              :class="{ 'show': expandedDepartments.has(department) }"
            >
              <div
                v-for="user in deptData.users"
                :key="user.id"
                :class="['user-item', { 
                  active: selectedUser?.id === user.id,
                  'group-selected': isGroupChatMode && selectedUsersForGroup.includes(user.id)
                }]"
                @click="isGroupChatMode ? toggleUserSelection(user.id) : selectUser(user)"
              >
                <!-- 그룹채팅 모드일 때 체크박스 표시 -->
                <VCheckbox
                  v-if="isGroupChatMode"
                  v-model="selectedUsersForGroup"
                  :value="user.id"
                  class="user-checkbox"
                  @click.stop
                />
                
                <VAvatar size="40" class="me-3">
                  <VImg v-if="user.avatar" :src="user.avatar" />
                  <VAvatar v-else :color="getUserColor(user.name)" size="40">
                    <span class="text-white text-h6">{{ getUserInitials(user.name) }}</span>
                  </VAvatar>
                  <div v-if="user.online" class="online-indicator"></div>
                </VAvatar>
                
                <div class="user-info">
                  <div class="user-name">{{ user.name }}</div>
                  <div class="user-details">
                    <span v-if="user.position" class="user-position">{{ user.position }}</span>
                    <span v-if="user.position && user.department" class="separator">•</span>
                    <span v-if="user.department" class="user-department">{{ user.department }}</span>
                  </div>
                </div>
                
                <div v-if="isLoading && selectedUser?.id === user.id" class="loading-indicator">
                  <VIcon>ri-loader-4-line</VIcon>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 부서가 없는 경우 빈 상태 표시 -->
          <div v-if="Object.keys(usersByDepartment).length === 0" class="empty-users">
            <VIcon size="48" color="grey-lighten-1" class="mb-3">ri-user-line</VIcon>
            <p class="text-grey-darken-2">ユーザーがいません</p>
          </div>
        </div>
      </div>
    </div>

    <!-- メインチャットエリア -->
    <div class="chat-main">
      <!-- チャットヘッダー (데스크톱용) -->
      <div class="chat-header" v-if="selectedChat && !isMobile">
        <div class="chat-partner-info">
          <VAvatar size="40" class="me-3">
            <VImg v-if="getUserAvatar(selectedChat.title)" :src="getUserAvatar(selectedChat.title)" />
            <VAvatar v-else :color="getUserColor(selectedChat.title)" size="40">
              <span class="text-white text-h6">{{ getUserInitials(selectedChat.title) }}</span>
            </VAvatar>
            <div v-if="selectedChat.unread_count > 0" class="unread-indicator"></div>
          </VAvatar>
          <div>
            <div class="partner-name">{{ selectedChat.name }}</div>
            <div class="partner-title">
              {{ selectedChat.title }}
              <span v-if="selectedChat.is_group" class="group-info">
                ({{ selectedChat.member_count }}人)
              </span>
            </div>
          </div>
        </div>
        <div class="chat-actions">
          <!-- 그룹채팅방인 경우 참여자 목록 버튼 -->
          <VBtn 
            v-if="selectedChat.is_group"
            icon 
            variant="text" 
            size="small"
            @click="showParticipantsDialog = true"
            :title="`참여자 ${selectedChat.member_count}명`"
          >
            <VIcon>ri-group-line</VIcon>
          </VBtn>
          <VBtn icon variant="text" size="small">
            <VIcon>ri-more-2-line</VIcon>
          </VBtn>
        </div>
      </div>

      <!-- チャットメッセージエリア -->
      <div 
        class="chat-messages" 
        ref="messagesContainer"
        @scroll="handleScroll"
      >
        <!-- 로딩 인디케이터 (상단) -->
        <div v-if="isLoadingMessages" class="loading-messages">
          <VIcon class="loading-icon">ri-loader-4-line</VIcon>
          <span>以前のメッセージを読み込んでいます...</span>
        </div>
        
        <!-- 채팅이 선택되지 않았을 때 안내 메시지 -->
        <div v-if="!selectedChat" class="no-chat-selected">
          <div class="no-chat-content">
            <VIcon size="64" color="grey-lighten-1" class="mb-4">ri-message-2-line</VIcon>
            <h3 class="text-h5 text-grey-darken-1 mb-2">チャットを選択してください</h3>
            <p class="text-body-1 text-grey-darken-2">
              左側からチャットルームを選択するか、新しい会話を始めてください
            </p>
          </div>
        </div>
        
        <div
          v-else
          v-for="message in selectedChat?.messages || []"
          :key="message.id"
          :class="['message', message.css_class]"
        >          
          <!-- 상대방 메시지: 왼쪽에 아바타와 이름 -->
          <div v-if="!message.is_own_message" class="message-left-content">
            <div class="message-avatar" v-if="message.show_avatar">
              <VAvatar size="32">
                <VImg v-if="message.sender_avatar" :src="message.sender_avatar" />
                <VAvatar v-else :color="getUserColor(message.sender_name)" size="32">
                  <span class="text-white text-body-2">{{ getUserInitials(message.sender_name) }}</span>
                </VAvatar>
              </VAvatar>
            </div>
            <div class="message-sender-name" v-if="message.show_name">
              {{ message.sender_name }}
            </div>
          </div>

          <!-- 메시지 내용 -->
          <div class="message-content">
            <!-- 파일 첨부가 있는 경우 -->
            <div v-if="message.attachments && message.attachments.length > 0 && !message.is_loading" class="message-attachments">
              <div v-for="attachment in message.attachments" :key="attachment.id" class="attachment-item">
                <!-- 이미지 파일인 경우 -->
                <div v-if="isImageFile(attachment.mime_type)" class="image-attachment">
                  <img 
                    :src="attachment.file_url" 
                    :alt="attachment.original_filename"
                    @click="openImageModal(attachment.file_url, attachment.original_filename)"
                    class="attachment-image"
                    @error="handleImageError"
                  />
                  <div class="attachment-info">
                    <span class="attachment-name">{{ attachment.original_filename }}</span>
                    <span class="attachment-size">{{ formatFileSize(attachment.size_bytes) }}</span>
                  </div>
                </div>
                <!-- 기타 파일인 경우 -->
                <div v-else class="file-attachment">
                  <div class="file-icon">
                    <VIcon>ri-file-line</VIcon>
                  </div>
                  <div class="file-info">
                    <span class="file-name">{{ attachment.original_filename }}</span>
                    <span class="file-size">{{ formatFileSize(attachment.size_bytes) }}</span>
                  </div>
                  <VBtn 
                    icon 
                    variant="text" 
                    size="small" 
                    @click="downloadFile(attachment.file_url, attachment.original_filename)"
                    class="download-btn"
                  >
                    <VIcon>ri-download-line</VIcon>
                  </VBtn>
                </div>
              </div>
            </div>
            
            <!-- 로딩 중인 경우 파일 첨부 박스에 로딩 표시 -->
            <div v-if="message.is_loading" class="message-attachments">
              <div class="attachment-item">
                <div class="file-attachment loading">
                  <div class="file-icon">
                    <VIcon class="loading-icon">ri-loader-4-line</VIcon>
                  </div>
                  <div class="file-info">
                    <span class="file-name">アップロード中...</span>
                    <span class="file-size">ファイルをアップロードしています</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 메시지 텍스트 -->
            <div v-if="message.body && message.body.trim()" class="message-bubble">
              {{ message.body }}
            </div>
            
            <div class="message-time">
              {{ formatMessageTime(message.created_at) }}
              <VIcon
                v-if="message.is_own_message"
                :color="message.is_read ? 'success' : 'default'"
                size="16"
                class="ms-1"
              >
                {{ message.is_read ? 'ri-check-line' : '' }}
              </VIcon>
            </div>
          </div>
        </div>
      </div>

      <!-- メッセージ入力エリア -->
      <div class="chat-input" v-if="selectedChat">
        <!-- 파일 업로드 영역 -->
        <div v-if="showFileUpload" class="file-upload-section">
          <!-- 커스텀 파일 입력 -->
          <div class="custom-file-input">
            <input
              ref="fileInput"
              type="file"
              :accept="acceptedFileTypes"
              multiple
              @change="handleFileInputChange"
              class="file-input-hidden"
            />
            <div 
              class="file-input-trigger" 
              @click="triggerFileInput"
              @dragover.prevent="handleDragOver"
              @dragleave.prevent="handleDragLeave"
              @drop.prevent="handleDrop"
              :class="{ 'drag-over': isDragOver }"
            >
              <VIcon>ri-attachment-2</VIcon>
              <span>ファイルを選択するか、ここにドラッグしてください</span>
            </div>
            <div class="file-input-info">
              <span>最大5個のファイル、各ファイル25MB以下</span>
              <span>対応形式: 画像、PDF、文書、テキスト、圧縮ファイル</span>
            </div>
          </div>
          
          <!-- 선택된 파일 미리보기 -->
          <div v-if="selectedFiles.length > 0" class="selected-files-preview">
            <div class="files-header">
              <span class="files-count">{{ selectedFiles.length }}個のファイルが選択されました</span>
              <VBtn
                variant="text"
                size="small"
                color="error"
                @click="clearSelectedFiles"
                class="clear-btn"
              >
                すべて削除
              </VBtn>
            </div>
            <div class="files-grid">
              <div
                v-for="(file, index) in selectedFiles"
                :key="`${file.name}-${index}`"
                class="file-item"
              >
                <!-- 이미지 파일 미리보기 -->
                <div v-if="isImageFile(file.type)" class="file-preview image">
                  <img 
                    :src="getFilePreview(file)" 
                    :alt="file.name"
                    class="preview-image"
                  />
                </div>
                <!-- 일반 파일 아이콘 -->
                <div v-else class="file-preview file">
                  <VIcon size="32" color="primary">{{ getFileIcon(file) }}</VIcon>
                </div>
                
                <div class="file-info">
                  <div class="file-name" :title="file.name">{{ file.name }}</div>
                  <div class="file-size">{{ formatFileSize(file.size) }}</div>
                </div>
                
                <VBtn
                  variant="text"
                  size="x-small"
                  color="error"
                  @click="removeSelectedFile(index)"
                  class="remove-btn"
                >
                  <VIcon>ri-close-line</VIcon>
                </VBtn>
              </div>
            </div>
          </div>
        </div>
        
        <div class="input-container">
          <!-- 파일 첨부 버튼 -->
          <VBtn
            icon
            variant="text"
            size="small"
            color="primary"
            @click="toggleFileUpload"
            class="attach-btn"
            :title="showFileUpload ? 'ファイル添付を閉じる' : 'ファイル添付'"
          >
            <VIcon>{{ showFileUpload ? 'ri-close-line' : 'ri-attachment-2' }}</VIcon>
          </VBtn>
            
          <VTextarea
            v-model="newMessage"
            placeholder="メッセージを入力してください (Ctrl+Enterで改行)"
            variant="outlined"
            density="comfortable"
            hide-details
            class="message-field"
            auto-grow
            rows="1"
            max-rows="4"
            @keydown="handleKeyDown"
            ref="messageTextarea"
          />
          
          <VBtn
            color="primary"
            variant="elevated"
            size="small"
            class="send-button"
            @click="sendMessage"
            :disabled="!canSendMessage"
          >
            <VIcon>ri-send-plane-line</VIcon>
          </VBtn>
        </div>
      </div>
      
      <!-- 채팅이 선택되지 않았을 때 입력 영역 안내 -->
      <div v-if="!selectedChat" class="chat-input-placeholder">
        <div class="placeholder-content">
          <VIcon size="24" color="grey-lighten-1">ri-message-2-line</VIcon>
          <span class="text-grey-darken-2">チャットを選択してメッセージを送信してください</span>
        </div>
      </div>
    </div>
  </div>

  <!-- 이미지 모달 -->
  <VDialog
    v-model="showImageModal"
    max-width="90vw"
    max-height="90vh"
    persistent
    @click:outside="closeImageModal"
  >
    <VCard class="image-modal-card">
      <VCardTitle class="image-modal-header">
        <span class="image-modal-title">{{ modalImageName }}</span>
        <VBtn
          icon
          variant="text"
          size="small"
          @click="closeImageModal"
          class="close-btn"
        >
          <VIcon>ri-close-line</VIcon>
        </VBtn>
      </VCardTitle>
      
      <VCardText class="image-modal-content">
        <div class="image-container">
          <img
            :src="modalImageUrl"
            :alt="modalImageName"
            class="modal-image"
            @error="handleModalImageError"
          />
        </div>
      </VCardText>
      
      <VCardActions class="image-modal-actions">
        <VBtn
          variant="outlined"
          color="primary"
          @click="downloadModalImage"
          class="download-modal-btn"
        >
          <VIcon class="me-2">ri-download-line</VIcon>
          다운로드
        </VBtn>
        <VBtn
          variant="outlined"
          @click="closeImageModal"
        >
          닫기
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- 그룹채팅 생성 다이얼로그 -->
  <VDialog
    v-model="showGroupChatDialog"
    max-width="400"
    persistent
  >
    <VCard>
      <VCardTitle class="d-flex align-center justify-space-between">
        <span>グループチャット作成</span>
        <VBtn
          icon
          variant="text"
          size="small"
          @click="cancelCreateGroupChat"
        >
          <VIcon>ri-close-line</VIcon>
        </VBtn>
      </VCardTitle>
      
      <VCardText>
        <div class="mb-4">
          <p class="text-body-2 text-medium-emphasis mb-2">
            選択されたユーザー: {{ selectedUsersForGroup.length }}人
          </p>
          <div class="selected-users-preview">
            <VChip
              v-for="userId in selectedUsersForGroup"
              :key="userId"
              size="small"
              class="ma-1"
              color="primary"
              variant="outlined"
            >
              {{ users.find(u => u.id === userId)?.name || '不明' }}
            </VChip>
          </div>
        </div>
        
        <VTextField
          v-model="groupChatName"
          label="グループチャット名"
          placeholder="グループチャット名を入力してください"
          variant="outlined"
          required
          :rules="[v => !!v || 'グループチャット名を入力してください']"
        />
      </VCardText>
      
      <VCardActions>
        <VSpacer />
        <VBtn
          variant="outlined"
          @click="cancelCreateGroupChat"
        >
          キャンセル
        </VBtn>
        <VBtn
          color="primary"
          @click="confirmCreateGroupChat"
          :disabled="!groupChatName.trim()"
        >
          作成
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- 참여자 목록 다이얼로그 -->
  <VDialog
    v-model="showParticipantsDialog"
    max-width="450"
    persistent
  >
    <VCard class="participants-dialog-card">
      <VCardTitle class="participants-header">
        <div class="participants-title">
          <VIcon class="me-2" color="primary">ri-group-line</VIcon>
          <span>参加者一覧 ({{ selectedChat?.member_count }}人)</span>
        </div>
        <VBtn
          icon
          variant="text"
          size="small"
          @click="showParticipantsDialog = false"
          class="close-btn"
        >
          <VIcon>ri-close-line</VIcon>
        </VBtn>
      </VCardTitle>
      
      <VCardText class="participants-content">
        <div class="participants-list">
          <div
            v-for="participant in selectedChat?.participants || []"
            :key="participant.id"
            class="participant-item"
          >
            <div class="participant-avatar">
              <VAvatar size="48" class="participant-avatar-img">
                <VImg v-if="participant.avatar" :src="participant.avatar" />
                <VAvatar v-else :color="getUserColor(participant.name)" size="48">
                  <span class="text-white text-h6">{{ getUserInitials(participant.name) }}</span>
                </VAvatar>
              </VAvatar>
              <div v-if="participant.online" class="online-indicator"></div>
            </div>
            
            <div class="participant-info">
              <div class="participant-name">{{ participant.name }}</div>
              <div class="participant-details">
                <span v-if="participant.position" class="participant-position">{{ participant.position }}</span>
                <span v-if="participant.position && participant.department" class="separator">•</span>
                <span v-if="participant.department" class="participant-department">{{ participant.department }}</span>
              </div>
              <div v-if="participant.online" class="participant-status">
                <VIcon size="12" color="success" class="me-1">ri-circle-fill</VIcon>
                <span>オンライン</span>
              </div>
            </div>
            
            <div v-if="participant.is_admin" class="admin-badge">
              <VChip size="small" color="primary" variant="elevated" class="admin-chip">
                <VIcon size="14" class="me-1">ri-admin-line</VIcon>
                管理者
              </VChip>
            </div>
          </div>
        </div>
      </VCardText>
      
      <VCardActions class="participants-actions">
        <VSpacer />
        <VBtn
          variant="outlined"
          @click="showParticipantsDialog = false"
          class="close-action-btn"
        >
          閉じる
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, onUnmounted, computed } from 'vue'
import { chatService, type ConversationCreate, type Conversation, type User } from '@/services/chat'
import { chatRoomWebSocketService, type ChatRoomMessage } from '@/services/chatRoomWebSocket'
import { useChatNotificationStore } from '@/stores/chatNotification'
import { type User as UserType } from '@/services/users'

// 検索クエリ
const searchQuery = ref('')

// アクティブタブ
const activeTab = ref('chats')

// 選択されたチャット
const selectedChat = ref<any>(null)

// 選択されたユーザー
const selectedUser = ref<any>(null)

// 新しいメッセージ
const newMessage = ref('')

// メッセージコンテナの参照
const messagesContainer = ref<HTMLElement>()

// 파일 입력 ref
const fileInput = ref<HTMLInputElement>()

// 로딩 상태
const isLoading = ref(false)

// 채팅방 데이터
const chats = ref<Conversation[]>([])

// 채팅방 목록 로딩 상태
const isLoadingChats = ref(false)

// 채팅 알림 store
const chatNotificationStore = useChatNotificationStore()

// ユーザーデータ
const users = ref<UserType[]>([])
const usersByDepartment = ref<Record<string, { count: number; users: UserType[] }>>({})
const totalUsers = ref(0)

// 사용자 목록 로딩 상태
const isLoadingUsers = ref(false)

// 그룹채팅 관련 상태
const isGroupChatMode = ref(false)
const selectedUsersForGroup = ref<number[]>([])
const groupChatName = ref('')
const showGroupChatDialog = ref(false)

// 모바일 관련 상태
const isMobile = ref(false)
const showSidebar = ref(false)
const showChatOptions = ref(false)

// 파일 업로드 관련
const showFileUpload = ref(false)
const selectedFiles = ref<File[]>([])
const isUploading = ref(false)
const isDragOver = ref(false)

// 이미지 모달 관련
const showImageModal = ref(false)
const modalImageUrl = ref('')
const modalImageName = ref('')

// 허용된 파일 타입
const acceptedFileTypes = [
  'image/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-outlook',
  'application/vnd.ms-project',
  'application/vnd.ms-visio',
  'application/vnd.openxmlformats-officedocument.visio.drawing',
  'text/plain',
  'application/zip',
  'application/x-rar-compressed',
].join(',')

// 무한스크롤 관련 상태
const currentPage = ref(1)
const hasMoreMessages = ref(true)
const isLoadingMessages = ref(false)
const messagesPerPage = 20

// 메시지 목록 가져오기 (페이지네이션 지원)
const fetchMessages = async (conversationId: string, page: number = 1, reset: boolean = false) => {
  try {
    if (reset) {
      currentPage.value = 1
      hasMoreMessages.value = true
    }
    
    isLoadingMessages.value = true
    const messages = await chatService.getMessages(conversationId, page, messagesPerPage)
    
    // 메시지를 selectedChat에 추가
    if (selectedChat.value && selectedChat.value.id === conversationId) {
      if (reset || page === 1) {
        // 첫 페이지이거나 리셋인 경우 교체
        selectedChat.value.messages = messages.messages
      } else {
        // 추가 페이지인 경우 기존 메시지 앞에 추가
        selectedChat.value.messages = [...messages.messages, ...selectedChat.value.messages]
      }
      
      // 더 이상 메시지가 없는지 확인
      hasMoreMessages.value = messages.messages.length === messagesPerPage
    }
  } catch (error) {
    console.error('메시지 목록 가져오기 오류:', error)
  } finally {
    isLoadingMessages.value = false
  }
}

const handleScroll = () => {
  if (!messagesContainer.value || isLoadingMessages.value || !hasMoreMessages.value) return
  
  const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value
  
  // 상단에서 100px 이내에 도달하면 이전 메시지 로드
  if (scrollTop < 100) {
    loadMoreMessages()
  }
}

// 더 많은 메시지 로드
const loadMoreMessages = async () => {
  if (!selectedChat.value || isLoadingMessages.value || !hasMoreMessages.value) return
  
  const nextPage = currentPage.value + 1
  const currentScrollHeight = messagesContainer.value?.scrollHeight || 0
  
  await fetchMessages(selectedChat.value.id, nextPage, false)
  
  // 스크롤 위치 유지 (새 메시지가 추가되어도 현재 위치 유지)
  nextTick(() => {
    if (messagesContainer.value) {
      const newScrollHeight = messagesContainer.value.scrollHeight
      const scrollDiff = newScrollHeight - currentScrollHeight
      messagesContainer.value.scrollTop = scrollDiff
    }
  })
  
  currentPage.value = nextPage
}

// 메시지 전송 가능 여부
const canSendMessage = computed(() => {
  return newMessage.value.trim().length > 0 || selectedFiles.value.length > 0
})

// 사용자 이름으로 색상 생성
const getUserColor = (name: string): string => {
  const colors = ['primary', 'secondary', 'success', 'info', 'warning', 'error']
  const index = name.charCodeAt(0) % colors.length
  return colors[index]
}

// 사용자 이름의 이니셜 생성
const getUserInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// 사용자 아바타 가져오기
const getUserAvatar = (name: string): string | null => {
  // 실제 구현에서는 사용자별 아바타를 반환하거나 null 반환
  // 현재는 테스트를 위해 null 반환 (이니셜 아바타 표시)
  return null
}

// 날짜 포맷팅
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  })
}

// 메시지 시간 포맷팅
const formatMessageTime = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  })
}

// 파일 크기 포맷팅
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 파일 타입이 이미지인지 확인
const isImageFile = (mimeType: string): boolean => {
  return mimeType.startsWith('image/')
}

// 파일 아이콘 가져오기
const getFileIcon = (file: File): string => {
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

// 파일 미리보기 URL 생성
const getFilePreview = (file: File): string => {
  if (file && file.type.startsWith('image/')) {
    return URL.createObjectURL(file)
  }
  return ''
}

// 선택된 파일 제거
const removeSelectedFile = (index: number) => {
  selectedFiles.value.splice(index, 1)
}

// 모든 선택된 파일 제거
const clearSelectedFiles = () => {
  selectedFiles.value = []
}

// 이미지 모달 열기
const openImageModal = (imageUrl: string, originalName: string) => {
  modalImageUrl.value = imageUrl
  modalImageName.value = originalName
  showImageModal.value = true
}

// 이미지 모달 닫기
const closeImageModal = () => {
  showImageModal.value = false
  modalImageUrl.value = ''
  modalImageName.value = ''
}

// 파일 다운로드
const downloadFile = async (url: string, filename: string) => {
  try {
    // 파일을 blob으로 가져오기
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('파일을 가져올 수 없습니다')
    }
    
    const blob = await response.blob()
    
    // blob URL 생성
    const blobUrl = URL.createObjectURL(blob)
    
    // 다운로드 링크 생성
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    a.style.display = 'none'
    
    // DOM에 추가하고 클릭
    document.body.appendChild(a)
    a.click()
      
      // 정리
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
  } catch (error) {
    console.error('파일 다운로드 실패:', error)
    alert('파일 다운로드에 실패했습니다.')
  }
}

// 이미지 로드 오류 처리
const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  console.error('이미지 로드 실패:', img.src)
  
  // 이미지 로드 실패 시 기본 이미지로 대체
  img.src = '/src/assets/images/placeholder-image.jpg'
  
  img.alt = '이미지를 불러올 수 없습니다'
  
  // 또는 이미지 요소를 숨기고 파일 정보만 표시
  const attachmentItem = img.closest('.attachment-item')
  if (attachmentItem) {
    const imageAttachment = attachmentItem.querySelector('.image-attachment')
    if (imageAttachment) {
      imageAttachment.innerHTML = `
        <div class="image-error">
          <VIcon>ri-image-line</VIcon>
          <span>이미지를 불러올 수 없습니다</span>
        </div>
      `
    }
  }
}

// 채팅방 목록 가져오기
const fetchChats = async () => {
  try {
    isLoadingChats.value = true
    const response = await chatService.getConversations()
    chats.value = response.conversations
    
    // 전체 읽지 않은 메시지 개수 계산 및 알림 store 업데이트
    const totalUnread = chats.value.reduce((total, chat) => total + (chat.unread_count || 0), 0)
    chatNotificationStore.setUnreadCount(totalUnread)
    
  } catch (error) {
    console.error('채팅방 목록 가져오기 오류:', error)
    // 에러 발생 시 빈 배열로 설정
    chats.value = []
  } finally {
    isLoadingChats.value = false
  }
}

// 채팅방 리스트 갱신 (웹소켓 메시지로 받은 경우)
const refreshChatList = async () => {
  try {
    const response = await chatService.getConversations()
    
    // 기존 채팅방과 새 채팅방을 비교하여 업데이트
    const updatedChats = response.conversations
    const currentChatIds = new Set(chats.value.map(chat => chat.id))
    const updatedChatIds = new Set(updatedChats.map(chat => chat.id))
    
    // 새로 추가된 채팅방이 있는지 확인
    const hasNewChats = updatedChats.some(chat => !currentChatIds.has(chat.id))
    
    // 채팅방 목록 업데이트
    chats.value = updatedChats
    
    // 전체 읽지 않은 메시지 개수 재계산
    const totalUnread = updatedChats.reduce((total, chat) => total + (chat.unread_count || 0), 0)
    chatNotificationStore.setUnreadCount(totalUnread)
  } catch (error) {
    console.error('채팅방 리스트 갱신 오류:', error)
  }
}

// 사용자 목록 가져오기
const fetchUsers = async () => {
  try {
    isLoadingUsers.value = true
    const response = await chatService.getAllUsers({
      page: 1,
      page_size: 100
    })
    
    // 새로운 응답 구조에 맞게 수정
    users.value = response.users || []
    
    // users_by_department가 없으면 users 배열에서 부서별로 그룹화
    if (response.users_by_department) {
      usersByDepartment.value = response.users_by_department
    } else {
      // users 배열을 부서별로 그룹화
      const groupedUsers: Record<string, { count: number; users: UserType[] }> = {}
      users.value.forEach(user => {
        const dept = user.department || 'その他'
        if (!groupedUsers[dept]) {
          groupedUsers[dept] = { count: 0, users: [] }
        }
        groupedUsers[dept].users.push(user)
        groupedUsers[dept].count++
      })
      usersByDepartment.value = groupedUsers
    }
    
    totalUsers.value = response.total || 0
    
  } catch (error) {
    console.error('사용자 목록 가져오기 오류:', error)
    // 에러 발생 시 빈 배열로 설정
    users.value = []
    usersByDepartment.value = {}
    totalUsers.value = 0
  } finally {
    isLoadingUsers.value = false
  }
}

// 既存のチャットルームを検索する関数
const findExistingChat = async (userId: number) => {
  try {
    
    // 로컬 채팅 목록에서만 검색
    const localChat = chats.value.find(chat => {
      // 그룹이 아닌 채팅방만 검색
      if (chat.is_group) {
        return false
      }
      // participants 속성이 있는지 확인하고 사용자 ID 포함 여부 확인
      if (chat.participants && Array.isArray(chat.participants)) {
        return chat.participants.map(p => p.id).includes(userId)
      }
      return false
    })
    
    return localChat || null
  } catch (error) {
    console.error('기존 채팅방 검색 오류:', error)
    return null
  }
}



// チャット選択
const selectChat = async (chat: any) => {
  
  // 파일 선택창 닫기
  showFileUpload.value = false
  selectedFiles.value = []
  isDragOver.value = false
  
  // 이전 채팅방 웹소켓 연결 해제
  if (selectedChat.value && selectedChat.value.id !== chat.id) {
    chatRoomWebSocketService.disconnect()
  }
  
  selectedChat.value = chat
  selectedUser.value = null
  
  // 모바일에서 채팅 선택 시 사이드바 닫기
  if (isMobile.value) {
    showSidebar.value = false
  }
  
  // 새 채팅방에 개별 웹소켓 연결
  const token = localStorage.getItem('token')
  if (token) {
    chatRoomWebSocketService.connectToChatRoom(chat.id, token, {
      onOpen: () => {
      },
      onMessage: (message: ChatRoomMessage) => {
        handleChatRoomWebSocketMessage(message)
      },
      onClose: () => {
      },
      onError: (error) => {
      }
    })
  }
  
  // 읽지 않은 메시지가 있는 경우 백엔드에 읽음 처리 요청 (백그라운드에서 처리)
  if (chat.unread_count > 0) {
    // 로컬 상태 먼저 업데이트 (즉시 UI 반영)
    chatNotificationStore.decrementUnreadCount(chat.unread_count)
    
    // 채팅방 목록에서도 읽지 않은 개수 업데이트
    const chatIndex = chats.value.findIndex(c => c.id === chat.id)
    if (chatIndex !== -1) {
      chats.value[chatIndex].unread_count = 0
    }
    
    // 선택된 채팅방의 읽지 않은 개수도 0으로 설정
    chat.unread_count = 0
    
    // 백엔드에 읽음 처리 요청 (백그라운드에서 처리, await 제거)
    chatService.markConversationAsRead(chat.id).then(() => {
    }).catch(error => {
      // 에러가 발생해도 UI는 이미 업데이트됨 (사용자 경험 향상)
    })
  }
  
  // 새 메시지 알림 초기화 (채팅방 선택 시 알림 표시 해제)
  chatNotificationStore.setNewMessageNotification(false)
  
  // 전체 읽지 않은 메시지 개수 재계산 및 업데이트
  const totalUnread = chats.value.reduce((total, c) => total + (c.unread_count || 0), 0)
  chatNotificationStore.setUnreadCount(totalUnread)
  
  // 웹소켓 연결 상태 로깅
  const wsStatus = getWebSocketStatus()
  
  // 첫 페이지 메시지 로드 (리셋)
  await fetchMessages(chat.id, 1, true)
  
  nextTick(() => {
    scrollToBottom()
  })
}

// ユーザー選択
const selectUser = async (user: any) => {
  try {
    isLoading.value = true
    selectedUser.value = user
    
    // 기존 채팅방이 있는지 확인
    const existingChat = await findExistingChat(user.id)
    
    if (existingChat) {
      // 기존 채팅방이 있으면 해당 채팅 선택
      await selectChat(existingChat)
      activeTab.value = 'chats' // 채팅 탭으로 자동 전환
    } else {
      // 기존 채팅방이 없으면 백엔드에 요청해서 채팅방 생성
      
      try {
        // 서버에서 채팅방 생성
        const conversationData: ConversationCreate = {
          title: null,
          is_group: false,
          member_ids: [user.id],
        }
        
        const newConversation = await chatService.createConversation(conversationData)
        
        // 채팅방 목록 새로고침
        await fetchChats()

        // 생성된 채팅방으로 이동
        const newChat = chats.value.find(chat => chat.id === newConversation.id)
        if (newChat) {
          selectChat(newChat)
          activeTab.value = 'chats'
        }
        
        // 모바일에서 새 채팅방 생성 시 사이드바 닫기
        if (isMobile.value) {
          showSidebar.value = false
        }
        
        nextTick(() => {
          scrollToBottom()
        })
      } catch (error) {
        alert('채팅방을 생성할 수 없습니다. 다시 시도해주세요.')
      }
    }
  } catch (error) {
    alert('사용자를 선택할 수 없습니다. 다시 시도해주세요.')
  } finally {
    isLoading.value = false
  }
}

// メッセージ送信
const sendMessage = async () => {
  if (!canSendMessage.value || !selectedChat.value) return

  // 입력 필드 초기화 (사용자 경험을 위해 먼저 초기화)
  const messageText = newMessage.value.trim()
  const filesToSend = [...selectedFiles.value]
  
  newMessage.value = ''
  selectedFiles.value = []
  showFileUpload.value = false

  try {
    // 파일이 있는 경우: 로딩 처리 후 백엔드 응답으로 교체
    if (filesToSend.length > 0) {
      // 임시 메시지 ID 생성
      const tempMessageId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // 로딩 메시지 즉시 UI에 표시
      const loadingMessage = {
        id: tempMessageId,
        conversation_id: selectedChat.value.id,
        sender_id: localStorage.getItem('user_id'),
        body: messageText || 'ファイルを添付しました。',
        parent_id: undefined,
        created_at: new Date().toISOString(),
        edited_at: undefined,
        deleted_at: undefined,
        is_own_message: true,
        message_type: 'text',
        alignment: 'right',
        sender_info: undefined,
        sender_name: '나',
        sender_avatar: '',
        sender_role: 'user',
        attachments: [], // 로딩 중에는 빈 배열로 설정
        reactions: [],
        is_read: false,
        show_avatar: false,
        show_name: false,
        css_class: 'message-right',
        is_loading: true, // 로딩 상태 표시
      }
      
      // 메시지 목록에 로딩 메시지 추가
      if (!selectedChat.value.messages) {
        selectedChat.value.messages = []
      }
      selectedChat.value.messages.push(loadingMessage)
      
      // 스크롤을 아래로
      nextTick(() => {
        scrollToBottom()
      })
      
      // 백엔드에 메시지 저장 요청
      const response = await chatService.sendMessageWithFiles(selectedChat.value.id, messageText, filesToSend)
      
      // 로딩 메시지를 실제 응답으로 교체
      const messageIndex = selectedChat.value.messages.findIndex((m: any) => m.id === tempMessageId)
      const message = selectedChat.value.messages[messageIndex]
      if (messageIndex !== -1) {
        
        // 기존 임시 blob URL들을 정리
        if (message.attachments && message.attachments.length > 0) {
          message.attachments.forEach((attachment: any) => {
            if (attachment.file_url && attachment.file_url.startsWith('blob:')) {
              URL.revokeObjectURL(attachment.file_url)
            }
          })
        }
        
        // 실제 응답 데이터로 교체
        message.id = response.id || response.message_id
        message.created_at = response.created_at || new Date().toISOString()
        message.edited_at = response.edited_at || undefined
        message.deleted_at = response.deleted_at || undefined
        message.sender_info = response.sender_info || undefined
        message.sender_avatar = response.sender_avatar || ''
        message.sender_role = response.sender_role || 'user'
        message.attachments = response.attachments || []
        message.reactions = response.reactions || []
        message.is_loading = false // 로딩 상태 해제
        
      }
      
      // 채팅방 목록의 마지막 메시지 정보도 업데이트
      const chatIndex = chats.value.findIndex(c => c.id === selectedChat.value.id)
      if (chatIndex !== -1) {
        chats.value[chatIndex].last_message = {
          id: message.id,
          conversation_id: selectedChat.value.id,
          sender_id: message.sender_id,
          body: message.body,
          created_at: message.created_at,
          edited_at: message.edited_at,
          deleted_at: message.deleted_at,
          is_own_message: true,
          message_type: 'text',
          alignment: 'right',
          sender_info: message.sender_info,
          sender_name: message.sender_name,
          sender_avatar: message.sender_avatar,
          sender_role: message.sender_role,
          attachments: message.attachments,
          reactions: message.reactions,
          is_read: true,
          show_avatar: false,
          show_name: false,
          css_class: 'message-right',
        }
        
        // 채팅방을 목록 맨 위로 이동 (최신 메시지가 있는 채팅방이 위로)
        const updatedChat = chats.value.splice(chatIndex, 1)[0]
        chats.value.unshift(updatedChat)
      }
      
    } else {
      // 텍스트만 있는 경우: 즉시 UI에 표시
      const newMessageData = {
        id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conversation_id: selectedChat.value.id,
        sender_id: localStorage.getItem('user_id'),
        body: messageText,
        parent_id: undefined,
        created_at: new Date().toISOString(),
        edited_at: undefined,
        deleted_at: undefined,
        is_own_message: true,
        message_type: 'text',
        alignment: 'right',
        sender_info: undefined,
        sender_name: '나',
        sender_avatar: '',
        sender_role: 'user',
        attachments: [],
        reactions: [],
        is_read: false,
        show_avatar: false,
        show_name: false,
        css_class: 'message-right',
      }
      
      // 메시지 목록에 즉시 추가
      if (!selectedChat.value.messages) {
        selectedChat.value.messages = []
      }
      selectedChat.value.messages.push(newMessageData)
      
      // 스크롤을 아래로
      nextTick(() => {
        scrollToBottom()
      })
      
      // 백엔드에 메시지 저장 요청 (백그라운드에서)
      try {
        const response = await chatService.sendMessage(selectedChat.value.id, messageText)
        
        // 메시지 ID를 실제 응답으로 업데이트
        const messageIndex = selectedChat.value.messages.findIndex((m: any) => m.id === newMessageData.id)
        if (messageIndex !== -1) {
          selectedChat.value.messages[messageIndex].id = response.id || response.message_id
          selectedChat.value.messages[messageIndex].created_at = response.created_at || newMessageData.created_at
          selectedChat.value.messages[messageIndex].edited_at = response.edited_at || undefined
          selectedChat.value.messages[messageIndex].deleted_at = response.deleted_at || undefined
          selectedChat.value.messages[messageIndex].sender_info = response.sender_info || undefined
          selectedChat.value.messages[messageIndex].sender_avatar = response.sender_avatar || ''
          selectedChat.value.messages[messageIndex].sender_role = response.sender_role || 'user'
          selectedChat.value.messages[messageIndex].reactions = response.reactions || []
        }
        
        // 채팅방 목록의 마지막 메시지 정보도 업데이트
        const chatIndex = chats.value.findIndex(c => c.id === selectedChat.value.id)
        if (chatIndex !== -1) {
          chats.value[chatIndex].last_message = {
            id: response.id || response.message_id,
            conversation_id: selectedChat.value.id,
            sender_id: newMessageData.sender_id,
            body: newMessageData.body,
            created_at: response.created_at || newMessageData.created_at,
            edited_at: response.edited_at || undefined,
            deleted_at: response.deleted_at || undefined,
            is_own_message: true,
            message_type: 'text',
            alignment: 'right',
            sender_info: response.sender_info || undefined,
            sender_name: newMessageData.sender_name,
            sender_avatar: response.sender_avatar || '',
            sender_role: response.sender_role || 'user',
            attachments: [],
            reactions: response.reactions || [],
            is_read: true,
            show_avatar: false,
            show_name: false,
            css_class: 'message-right',
          }
          
          // 채팅방을 목록 맨 위로 이동 (최신 메시지가 있는 채팅방이 위로)
          const updatedChat = chats.value.splice(chatIndex, 1)[0]
          chats.value.unshift(updatedChat)
        }
      } catch (error) {
        console.error('텍스트 메시지 백엔드 저장 실패:', error)
        // 백엔드 저장 실패해도 UI는 유지 (사용자 경험 향상)
      }
    }
    
  } catch (error) {
    console.error('메시지 전송 오류:', error)
    
    // 에러 발생 시 입력 필드 복원
    newMessage.value = messageText || ''
    selectedFiles.value = filesToSend
    showFileUpload.value = filesToSend.length > 0
    

  }
}

// 스クロールを下部に移動
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 스크롤 위치가 하단 근처인지 확인 (새 메시지 자동 스크롤 여부 결정)
const isNearBottom = (): boolean => {
  if (!messagesContainer.value) return false
  
  const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value
  const threshold = 100 // 하단에서 100px 이내면 "하단 근처"로 간주
  
  return scrollHeight - scrollTop - clientHeight < threshold
}

// 스크롤을 하단으로 부드럽게 이동
const smoothScrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTo({
      top: messagesContainer.value.scrollHeight,
      behavior: 'smooth'
    })
  }
}

// 새 메시지 알림 표시
const showNewMessageNotification = () => {
  // 이미 알림이 있으면 제거
  const existingNotification = document.querySelector('.new-message-notification')
  if (existingNotification) {
    existingNotification.remove()
  }
  
  // 새 메시지 알림 생성
  const notification = document.createElement('div')
  notification.className = 'new-message-notification'
  notification.innerHTML = `
    <div class="notification-content">
      <span>新しいメッセージがあります</span>
      <button onclick="this.parentElement.parentElement.remove()">閉じる</button>
    </div>
  `
  
  // 알림을 메시지 컨테이너에 추가
  if (messagesContainer.value) {
    messagesContainer.value.appendChild(notification)
  }
  
  // 5초 후 자동 제거
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove()
    }
  }, 5000)
}

// 채팅방 개별 웹소켓 메시지 처리
const handleChatRoomWebSocketMessage = (message: ChatRoomMessage) => {
  
  switch (message.type) {
    case 'new_message':
      // 새 메시지 수신 시 처리
      
      if (selectedChat.value && message.conversation_id === selectedChat.value.id) {
        // 현재 선택된 채팅방의 메시지인 경우
        
        // 현재 스크롤 위치 확인
        const wasNearBottom = isNearBottom()
        
        // 웹소켓 메시지 구조 확인 (message.message에 직접 있음)
        
        // 메시지 데이터가 있는지 확인
        if (message.message) {
          const newMessage = message.message
          
          // 메시지 목록에 직접 추가 (API 호출 없이)
          if (!selectedChat.value.messages) {
            selectedChat.value.messages = []
          }
          
          // 메시지 포맷팅 (웹소켓에서 받은 메시지를 그대로 사용)
          const formattedMessage = {
            id: newMessage.id,
            conversation_id: newMessage.conversation_id,
            sender_id: newMessage.sender_id,
            body: newMessage.body,
            parent_id: newMessage.parent_id || undefined,
            created_at: newMessage.created_at,
            edited_at: newMessage.edited_at || undefined,
            deleted_at: newMessage.deleted_at || undefined,
            is_own_message: newMessage.is_own_message,
            message_type: newMessage.message_type || 'text',
            alignment: newMessage.alignment || 'left',
            sender_info: newMessage.sender_info || undefined,
            sender_name: newMessage.sender_name || '',
            sender_avatar: newMessage.sender_avatar || '',
            sender_role: newMessage.sender_role || 'user',
            attachments: newMessage.attachments || [],
            reactions: newMessage.reactions || [],
            is_read: newMessage.is_read || true,
            show_avatar: newMessage.show_avatar || true,
            show_name: newMessage.show_name || true,
            css_class: newMessage.css_class || 'message-left',
          }
          
          
          // 메시지 목록에 추가
          selectedChat.value.messages.push(formattedMessage)
          
        }
        
        // 스크롤 처리
        nextTick(() => {
          if (wasNearBottom) {
            // 사용자가 하단 근처에 있었으면 자동 스크롤
            smoothScrollToBottom()
          } else {
            // 사용자가 중간/상단을 보고 있으면 알림만 표시
            showNewMessageNotification()
          }
        })
        
        // 현재 선택된 채팅방이어도 채팅 리스트의 마지막 메시지 업데이트
        updateCurrentChatInfoFromMessage(message)
      } else {
        
        // 해당 채팅방 정보 업데이트
        updateChatInfoFromGlobalMessage(message)
        
        // 알림 증가
        chatNotificationStore.incrementUnreadCount()
        chatNotificationStore.setNewMessageNotification(true)
        
        // 사용자에게 알림 표시 (선택사항)
        showGlobalChatNotification(message)
      }
      
      break

    case 'chat_list_update':
      // conversation_read_all 타입은 나중에 개발할 예정이므로 처리하지 않음
      if (message.update_data && message.update_type === 'conversation_read_all') {
        return;
      }
      
      // 채팅방 리스트 업데이트 메시지 수신
      
      if (selectedChat.value && selectedChat.value.id === message.conversation_id) {
        // 현재 선택된 채팅방의 메시지인 경우 - 읽음 처리
        updateCurrentChatInfoFromMessage(message)
      } else {
        
        // 해당 채팅방 정보 업데이트
        updateChatInfoFromGlobalMessage(message)
        
        // 알림 증가
        chatNotificationStore.incrementUnreadCount()
        chatNotificationStore.setNewMessageNotification(true)
        
        // 사용자에게 알림 표시
        showGlobalChatNotification(message)
      }
      break

    // ... existing code ...
  }
}

// 메시지 읽음 상태 업데이트
const updateMessageReadStatus = (messageId: string) => {
  if (selectedChat.value?.messages) {
    const message = selectedChat.value.messages.find(m => m.id === messageId)
    if (message) {
      message.is_read = true
    }
  }
}

// 웹소켓 연결 상태 확인
const getWebSocketStatus = () => {
  const status = chatRoomWebSocketService.getConnectionStatus()
  return status
}

// 전역 웹소켓에서 오는 chat_list_update 이벤트 리스너 등록
const handleGlobalChatListUpdate = (event: CustomEvent) => {
  const message = event.detail
  
  // chat_list_update 메시지 처리
  if (message.type === 'chat_list_update') {
    // 다른 채팅방에서 새 메시지가 온 경우
    if (message.conversation_id && message.update_data) {
      
      // 현재 선택된 채팅방이 아닌 경우에만 처리
      if (!selectedChat.value || selectedChat.value.id !== message.conversation_id) {
        // 해당 채팅방 정보 업데이트
        updateChatInfoFromGlobalMessage(message)
        
        // 알림 증가
        chatNotificationStore.incrementUnreadCount()
        chatNotificationStore.setNewMessageNotification(true)
        
        // 사용자에게 알림 표시
        showGlobalChatNotification(message)
      }
    } else {
      // 전체 채팅방 리스트 갱신
      refreshChatList()
    }
  }
}

// 웹소켓 연결 해제
const disconnectWebSocket = () => {
  chatRoomWebSocketService.disconnect()
}

// 파일 업로드 관련 함수들
const toggleFileUpload = () => {
  showFileUpload.value = !showFileUpload.value
  if (!showFileUpload.value) {
    selectedFiles.value = []
    isDragOver.value = false
  }
}

// 파일 입력 트리거
const triggerFileInput = () => {
  fileInput.value?.click()
}

// 파일 입력 변경 처리
const handleFileInputChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) {
    const files = Array.from(target.files)
    addFilesToSelection(files)
    
    // 파일 입력 초기화 (같은 파일을 다시 선택할 수 있도록)
    if (target) {
      target.value = ''
    }
  }
}

// 파일들을 선택된 파일 목록에 추가하는 공통 함수
const addFilesToSelection = (files: File[]) => {
  // 파일 개수 제한 (최대 5개)
  if (selectedFiles.value.length + files.length > 5) {
    alert('ファイルは5つまでしかアップロードできません。')
    return
  }
  
  // 파일 크기 제한 (각 파일 25MB)
  const maxSize = 25 * 1024 * 1024 // 25MB
  const oversizedFiles = files.filter(file => file.size > maxSize)
  
  if (oversizedFiles.length > 0) {
    alert(`以下のファイルは25MBを超えています: ${oversizedFiles.map(f => f.name).join(', ')}`)
    return
  }
  selectedFiles.value.push(...files)
  // 파일 타입 검증
  const validFiles = files.filter(file => {
    const isValidType = acceptedFileTypes.split(',').some(type => {
      if (type.includes('*')) {
        return file.type.startsWith(type.replace('*', ''))
      }
      return file.type === type
    })
    
    if (!isValidType) {
      console.warn(`サポートされていないファイルタイプ: ${file.name} (${file.type})`)
    }
    
    return isValidType
  })
  
}

// 드래그 오버 처리
const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = true
}

// 드래그 리브 처리
const handleDragLeave = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false
}

// 드롭 처리
const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false
  
  if (event.dataTransfer?.files) {
    const files = Array.from(event.dataTransfer.files)
    addFilesToSelection(files)
  }
}

// 키보드 이벤트 핸들러 수정
const handleKeyDown = (event: KeyboardEvent) => {
  // IME 변환 중인지 확인 (isComposing 속성으로 판단)
  if (event.isComposing || event.keyCode === 229) {
    // IME 변환 중이면 메시지 전송하지 않음
    return
  }
  
  // Ctrl + Enter: 줄바꿈 (직접 제어)
  if (event.ctrlKey && event.key === 'Enter') {
    event.preventDefault()
    console.log('Ctrl+Enter: 줄바꿈 추가')
    insertLineBreak()
    return
  }
  
  // Shift + Enter: 줄바꿈 (기본 동작 허용)
  if (event.shiftKey && event.key === 'Enter') {
    event.preventDefault()
    return
  }
  
  // Enter: 메시지 전송
  if (event.key === 'Enter') {
    console.log('Enter: 메시지 전송')
    event.preventDefault()
    sendMessage()
  }
}

// 줄바꿈 삽입 함수
const insertLineBreak = () => {
  if (!messageTextarea.value) return
  
  const textarea = messageTextarea.value
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const text = newMessage.value
  
  // 현재 커서 위치에 줄바꿈 삽입
  const newText = text.substring(0, start) + '\n' + text.substring(end)
  
  // 텍스트 업데이트
  newMessage.value = newText
  
  // 커서 위치를 줄바꿈 뒤로 이동
  nextTick(() => {
    if (textarea) {
      textarea.focus()
      textarea.setSelectionRange(start + 1, start + 1)
    }
  })
}

// 모바일 사이드바 토글
const toggleSidebar = () => {
  showSidebar.value = !showSidebar.value
}

// 화면 크기 감지
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
  if (!isMobile.value) {
    showSidebar.value = false
  }
}

// 채팅방 나가기 기능 제거됨

// コンポーネントマウント時に最初のチャ팅을 선택
onMounted(async () => {
  // 모바일 감지 초기화
  checkMobile()
  window.addEventListener('resize', checkMobile)
  
  // 사용자 목록과 채팅방 목록 가져오기
  await Promise.all([fetchUsers(), fetchChats()])
  
  // 모든 부서를 열어둠
  Object.keys(usersByDepartment.value).forEach(dept => {
    expandedDepartments.value.add(dept)
  })
  
  // 전역 웹소켓 이벤트 리스너 등록
  window.addEventListener('chat_list_update', handleGlobalChatListUpdate as EventListener)
  
})

// 컴포넌트 언마운트 시 웹소켓 연결 해제
onUnmounted(() => {
  disconnectWebSocket()
  
  // 이벤트 리스너 정리
  window.removeEventListener('chat_list_update', handleGlobalChatListUpdate)
  window.removeEventListener('resize', checkMobile)
  
  // 임시 blob URL들 정리
  selectedFiles.value.forEach(file => {
    const previewUrl = getFilePreview(file)
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl)
    }
  })
  
  // 메시지의 임시 blob URL들도 정리
  if (selectedChat.value?.messages) {
    selectedChat.value.messages.forEach((message: any) => {
      if (message.attachments && message.attachments.length > 0) {
        message.attachments.forEach((attachment: any) => {
          if (attachment.file_url && attachment.file_url.startsWith('blob:')) {
            URL.revokeObjectURL(attachment.file_url)
          }
        })
      }
    })
  }
})

// 모달 이미지 로드 오류 처리
const handleModalImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  console.error('모달 이미지 로드 실패:', img.src)
  
  // 이미지 로드 실패 시 기본 이미지로 대체
  img.src = '/src/assets/images/placeholder-image.jpg'
  img.alt = '이미지를 불러올 수 없습니다'
}

// 모달 이미지 다운로드
const downloadModalImage = async () => {
  if (modalImageUrl.value && modalImageName.value) {
    try {
      // 파일을 blob으로 가져오기
      const response = await fetch(modalImageUrl.value)
      if (!response.ok) {
        throw new Error('ファイルを取得できませんでした')
      }
      
      const blob = await response.blob()
      
      // blob URL 생성
      const blobUrl = URL.createObjectURL(blob)
      
      // 다운로드 링크 생성
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = modalImageName.value
      a.style.display = 'none'
      
      // DOM에 추가하고 클릭
      document.body.appendChild(a)
      a.click()
      
      // 정리
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error('モーダル画像のダウンロードに失敗しました:', error)
      alert('画像のダウンロードに失敗しました。')
    }
  }
}

// 메시지로부터 채팅방 정보 업데이트
const updateChatInfoFromMessage = (message: ChatRoomMessage) => {
  try {
    
    // 채팅방 목록에서 해당 채팅방 찾기
    const chatIndex = chats.value.findIndex(chat => chat.id === message.conversation_id)
    
    if (chatIndex !== -1) {
      const chat = chats.value[chatIndex]
      
      // 마지막 메시지 정보 업데이트
      if (message.data && message.data.message) {
        chat.last_message = {
          id: message.data.message.id,
          conversation_id: message.conversation_id,
          sender_id: message.data.message.sender_id,
          body: message.data.message.body,
          created_at: message.data.message.created_at,
          edited_at: message.data.message.edited_at || undefined,
          deleted_at: message.data.message.deleted_at || undefined,
          is_own_message: false,
          message_type: 'text',
          alignment: 'left',
          sender_info: message.data.message.sender_info || undefined,
          sender_name: message.data.message.sender_name || '',
          sender_avatar: message.data.message.sender_avatar || '',
          sender_role: message.data.message.sender_role || 'user',
          attachments: message.data.message.attachments || [],
          reactions: message.data.message.reactions || [],
          is_read: false,
          show_avatar: true,
          show_name: true,
          css_class: 'message-left',
        }
      }
      
      // 읽지 않은 메시지 개수 증가
      chat.unread_count = (chat.unread_count || 0) + 1
      
      // 채팅방을 목록 맨 위로 이동 (최신 메시지가 있는 채팅방이 위로)
      const updatedChat = chats.value.splice(chatIndex, 1)[0]
      chats.value.unshift(updatedChat)
      
    } else {
      // 채팅방이 목록에 없으면 새로 추가 (필요시)
    }
  } catch (error) {
    console.error('메시지로부터 채팅방 정보 업데이트 오류:', error)
  }
}

// 채팅 알림 표시
const showChatNotification = (message: ChatRoomMessage) => {
  try {
    // 브라우저 알림 권한 확인
    if (!('Notification' in window)) {
      return
    }
    
    // 알림 권한 요청
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          showBrowserNotification(message)
        }
      })
    } else if (Notification.permission === 'granted') {
      showBrowserNotification(message)
    }
  } catch (error) {
    console.error('채팅 알림 표시 오류:', error)
  }
}

// 브라우저 알림 표시
const showBrowserNotification = (message: ChatRoomMessage) => {
  try {
    // 채팅방 제목 찾기
    const chat = chats.value.find(c => c.id === message.conversation_id)
    const chatTitle = chat?.title || '未知のチャットボックス'
    
    // 메시지 내용
    const messageBody = message.data?.message?.body || '新しいメッセージが届きました'
    
    // 발신자 이름
    const senderName = message.data?.message?.sender_name || '未知の送信者'
    
    // 알림 생성
    const notification = new Notification(`${chatTitle} - ${senderName}`, {
      body: messageBody,
      icon: '/src/assets/images/logo.png', // 앱 아이콘
      badge: '/src/assets/images/logo.png',
      tag: `chat_${message.conversation_id}`, // 같은 채팅방의 알림은 덮어쓰기
      requireInteraction: false,
      silent: false,
    })
    
    // 알림 클릭 시 해당 채팅방으로 이동
    notification.onclick = () => {
      window.focus()
      
      // 해당 채팅방 찾기
      const targetChat = chats.value.find(c => c.id === message.conversation_id)
      if (targetChat) {
        // 채팅 탭으로 이동
        activeTab.value = 'chats'
        
        // 해당 채팅방 선택
        selectChat(targetChat)
      }
      
      notification.close()
    }
    
    // 5초 후 자동으로 알림 닫기
    setTimeout(() => {
      notification.close()
    }, 5000)
    
  } catch (error) {
    console.error('브라우저 알림 표시 오류:', error)
  }
}

// 전역 웹소켓 메시지로부터 채팅방 정보 업데이트
const updateChatInfoFromGlobalMessage = (message: any) => {
  try {
    
    // 채팅방 목록에서 해당 채팅방 찾기
    const chatIndex = chats.value.findIndex(chat => chat.id === message.conversation_id)
    
    if (chatIndex !== -1) {
      const chat = chats.value[chatIndex]
      
      // 마지막 메시지 정보 업데이트
      let lastMessageData = null
      
      // new_message 타입인 경우
      if (message.data && message.data.message) {
        lastMessageData = message.data.message
      }
      // chat_list_update 타입인 경우
      else if (message.update_data && message.update_data.last_message) {
        lastMessageData = message.update_data.last_message
      }
      // 직접 message 객체가 있는 경우
      else if (message.message) {
        lastMessageData = message.message
      }
      
      if (lastMessageData) {
        chat.last_message = {
          id: lastMessageData.id,
          conversation_id: message.conversation_id || '',
          sender_id: lastMessageData.sender_id,
          body: lastMessageData.body,
          created_at: lastMessageData.created_at,
          edited_at: lastMessageData.edited_at || undefined,
          deleted_at: lastMessageData.deleted_at || undefined,
          is_own_message: false,
          message_type: 'text',
          alignment: 'left',
          sender_info: lastMessageData.sender_info || undefined,
          sender_name: lastMessageData.sender_name || '',
          sender_avatar: lastMessageData.sender_avatar || '',
          sender_role: lastMessageData.sender_role || 'user',
          attachments: lastMessageData.attachments || [],
          reactions: lastMessageData.reactions || [],
          is_read: false, // 현재 보고 있는 채팅방이므로 읽음으로 처리
          show_avatar: true,
          show_name: true,
          css_class: 'message-left',
        }
      }
      
      // 읽지 않은 메시지 개수 업데이트
      if (message.update_data && message.update_data.unread_count !== undefined) {
        chat.unread_count = message.update_data.unread_count
      } else {
        // unread_count가 없으면 1 증가
        chat.unread_count = (chat.unread_count || 0) + 1
      }
      
      // 채팅방을 목록 맨 위로 이동 (최신 메시지가 있는 채팅방이 위로)
      const updatedChat = chats.value.splice(chatIndex, 1)[0]
      chats.value.unshift(updatedChat)
      
    } else {
      // 채팅방이 목록에 없으면 전체 목록 갱신
      refreshChatList()
    }
  } catch (error) {
    console.error('전역 웹소켓 메시지로부터 채팅방 정보 업데이트 오류:', error)
  }
}

// 전역 채팅 알림 표시
const showGlobalChatNotification = (message: any) => {
  try {
    // 브라우저 알림 권한 확인
    if (!('Notification' in window)) {
      console.log('이 브라우저는 알림을 지원하지 않습니다')
      return
    }
    
    // 알림 권한 요청
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          showGlobalBrowserNotification(message)
        }
      })
    } else if (Notification.permission === 'granted') {
      showGlobalBrowserNotification(message)
    }
  } catch (error) {
    console.error('전역 채팅 알림 표시 오류:', error)
  }
}

// 전역 브라우저 알림 표시
const showGlobalBrowserNotification = (message: any) => {
  try {
    // 채팅방 제목 찾기
    const chat = chats.value.find(c => c.id === message.conversation_id)
    const chatTitle = chat?.title || '未知のチャットボックス'
    
    // 메시지 내용
    const messageBody = message.update_data?.last_message?.body || '新しいメッセージが届きました'
    
    // 발신자 이름
    const senderName = message.update_data?.last_message?.sender_name || '未知の送信者'
    
    // 알림 생성
    const notification = new Notification(`${chatTitle} - ${senderName}`, {
      body: messageBody,
      icon: '/src/assets/images/logo.png', // 앱 아이콘
      badge: '/src/assets/images/logo.png',
      tag: `chat_${message.conversation_id}`, // 같은 채팅방의 알림은 덮어쓰기
      requireInteraction: false,
      silent: false,
    })
    
    // 알림 클릭 시 해당 채팅방으로 이동
    notification.onclick = () => {
      window.focus()
      
      // 해당 채팅방 찾기
      const targetChat = chats.value.find(c => c.id === message.conversation_id)
      if (targetChat) {
        // 채팅 탭으로 이동
        activeTab.value = 'chats'
        
        // 해당 채팅방 선택
        selectChat(targetChat)
      }
      
      notification.close()
    }
    
    // 5초 후 자동으로 알림 닫기
    setTimeout(() => {
      notification.close()
    }, 5000)
    
  } catch (error) {
    console.error('전역 브라우저 알림 표시 오류:', error)
  }
}

// 그룹채팅 관련 함수들
const enterGroupChatMode = () => {
  isGroupChatMode.value = true
  selectedUsersForGroup.value = []
  console.log('그룹채팅 모드 진입')
}

const cancelGroupChatMode = () => {
  isGroupChatMode.value = false
  selectedUsersForGroup.value = []
  console.log('그룹채팅 모드 취소')
}

const toggleUserSelection = (userId: number) => {
  const index = selectedUsersForGroup.value.indexOf(userId)
  if (index > -1) {
    selectedUsersForGroup.value.splice(index, 1)
  } else {
    selectedUsersForGroup.value.push(userId)
  }
  console.log('선택된 사용자:', selectedUsersForGroup.value)
}

const createGroupChat = async () => {
  if (selectedUsersForGroup.value.length === 0) {
    alert('グループチャットに参加するユーザーを選択してください。')
    return
  }

  try {
    // 그룹채팅 이름 입력 다이얼로그 표시
    showGroupChatDialog.value = true
  } catch (error) {
    console.error('그룹채팅 생성 오류:', error)
    alert('グループチャットの作成に失敗しました。')
  }
}

const confirmCreateGroupChat = async () => {
  if (!groupChatName.value.trim()) {
    alert('グループチャットの名前を入力してください。')
    return
  }

  try {
    // 그룹채팅 생성 API 호출
    const response = await chatService.createConversation({
      title: groupChatName.value,
      is_group: true,
      member_ids: selectedUsersForGroup.value
    })

    // 성공 후 상태 초기화
    showGroupChatDialog.value = false
    groupChatName.value = ''
    isGroupChatMode.value = false
    selectedUsersForGroup.value = []

    // 채팅방 목록 새로고침
    await fetchChats()

    // 생성된 채팅방으로 이동
    const newChat = chats.value.find(chat => chat.id === response.id)
    if (newChat) {
      selectChat(newChat)
      activeTab.value = 'chats'
      
      // 모바일에서 그룹채팅 생성 완료 시 사이드바 닫기
      if (isMobile.value) {
        showSidebar.value = false
      }
    }

    alert('グループチャットが正常に作成されました！')
  } catch (error) {
    console.error('グループチャットの作成に失敗しました:', error)
    alert('グループチャットの作成に失敗しました。')
  }
}

const cancelCreateGroupChat = () => {
  showGroupChatDialog.value = false
  groupChatName.value = ''
}

// 현재 선택된 채팅방의 채팅 리스트 정보 업데이트 (읽지 않은 개수 증가 없음)
const updateCurrentChatInfoFromMessage = (message: ChatRoomMessage) => {
  try {
    
    // 채팅방 목록에서 해당 채팅방 찾기
    const chatIndex = chats.value.findIndex(chat => chat.id === message.conversation_id)
    
    if (chatIndex !== -1) {
      const chat = chats.value[chatIndex]
      
      // 마지막 메시지 정보 업데이트
      let lastMessageData = null
      
      // new_message 타입인 경우
      if (message.data && message.data.message) {
        lastMessageData = message.data.message
      }
      // chat_list_update 타입인 경우
      else if (message.update_data && message.update_data.last_message) {
        lastMessageData = message.update_data.last_message
      }
      // 직접 message 객체가 있는 경우
      else if (message.message) {
        lastMessageData = message.message
      }
      
      if (lastMessageData) {
        chat.last_message = {
          id: lastMessageData.id,
          conversation_id: message.conversation_id || '',
          sender_id: lastMessageData.sender_id,
          body: lastMessageData.body,
          created_at: lastMessageData.created_at,
          edited_at: lastMessageData.edited_at || undefined,
          deleted_at: lastMessageData.deleted_at || undefined,
          is_own_message: false,
          message_type: 'text',
          alignment: 'left',
          sender_info: lastMessageData.sender_info || undefined,
          sender_name: lastMessageData.sender_name || '',
          sender_avatar: lastMessageData.sender_avatar || '',
          sender_role: lastMessageData.sender_role || 'user',
          attachments: lastMessageData.attachments || [],
          reactions: lastMessageData.reactions || [],
          is_read: true, // 현재 보고 있는 채팅방이므로 읽음으로 처리
          show_avatar: true,
          show_name: true,
          css_class: 'message-left',
        }
      }
      
      // 현재 보고 있는 채팅방이므로 읽지 않은 개수를 0으로 설정
      chat.unread_count = 0
      // 채팅방을 목록 맨 위로 이동 (최신 메시지가 있는 채팅방이 위로)
      const updatedChat = chats.value.splice(chatIndex, 1)[0]
      chats.value.unshift(updatedChat)

      // 백엔드에 읽음 처리 요청 (B 사용자가 같은 채팅방에 있을 때)
      chatService.markConversationAsRead(message.conversation_id).catch(error => {
        console.error('現在のチャットボックスの読み取り処理に失敗しました:', error)
      })
      
    }
  } catch (error) {
    console.error('現在のチャットボックスの情報更新に失敗しました:', error)
  }
}

// 부서별 드롭다운 상태 관리
const expandedDepartments = ref<Set<string>>(new Set())

// 부서 드롭다운 토글 함수
const toggleDepartment = (department: string) => {
  if (expandedDepartments.value.has(department)) {
    expandedDepartments.value.delete(department)
  } else {
    expandedDepartments.value.add(department)
  }
}

// textarea ref 추가
const messageTextarea = ref<HTMLTextAreaElement>()

// 참여자 목록 관련 상태
const showParticipantsDialog = ref(false)
const chatParticipants = ref<any[]>([])
const isLoadingParticipants = ref(false)

// 참여자 목록 가져오기
const fetchChatParticipants = async (conversationId: string) => {
  try {
    isLoadingParticipants.value = true
    const response = await chatService.getChatParticipants(conversationId)
    chatParticipants.value = response.participants || []
  } catch (error) {
    console.error('참여자 목록 가져오기 오류:', error)
    chatParticipants.value = []
  } finally {
    isLoadingParticipants.value = false
  }
}

// 참여자 목록 다이얼로그 열기
const openParticipantsDialog = async () => {
  if (selectedChat.value?.is_group) {
    showParticipantsDialog.value = true
    // getConversations에서 받은 participants 데이터 사용
    // 별도의 API 호출 불필요
  }
}
</script>

<style scoped>
.chat-container {
  display: flex;
  height: calc(100vh - 120px); /* 네비게이션 바 높이 제외 */
  min-height: 600px; /* 최소 높이 설정 */
  background-color: #f8f9fa;
  position: relative;
}

.chat-sidebar {
  width: 350px;
  background-color: white;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
  z-index: 3;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.sidebar-tabs {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
  background-color: #f8f9fa;
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
  color: #666;
}

.tab-item:hover {
  background-color: #e9ecef;
  color: #333;
}

.tab-item.active {
  color: #7c3aed;
  border-bottom-color: #7c3aed;
  background-color: white;
}

.tab-item .VIcon {
  font-size: 18px;
}

.tab-item span {
  font-size: 14px;
  font-weight: 500;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-field {
  flex: 1;
}

.online-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  background-color: #4caf50;
  border: 2px solid white;
  border-radius: 50%;
}

.sidebar-section {
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.user-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.group-chat-btn {
  font-size: 12px;
  height: 32px;
}

.group-chat-controls {
  display: flex;
  gap: 8px;
}

.cancel-btn,
.create-btn {
  font-size: 12px;
  height: 32px;
}

.user-checkbox {
  margin-right: 8px;
}

.user-item.group-selected {
  background-color: #e3f2fd;
  border-left: 3px solid #2196f3;
}

.selected-users-preview {
  max-height: 100px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 8px;
  background-color: #f5f5f5;
}

.sidebar-section:last-child {
  flex: 1;
  overflow-y: auto;
}

.section-title {
  color: #7c3aed;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.chat-list, .contact-list, .user-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chat-item, .contact-item, .user-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.chat-item:hover, .contact-item:hover, .user-item:hover {
  background-color: #f5f5f5;
}

.chat-item.active, .user-item.active {
  background-color: #f3e8ff;
}

.chat-info, .contact-info, .user-info {
  flex: 1;
  min-width: 0;
}

.chat-actions {
  display: flex;
  gap: 4px;
  align-items: center;
  /* 나가기 버튼 제거로 인한 간격 조정 */
}

.chat-name, .contact-name, .user-name {
  font-weight: 600;
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
}

.chat-last-message, .contact-description, .user-status {
  font-size: 12px;
  color: #666;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-date, .user-role {
  font-size: 11px;
  color: #999;
}

.unread-indicator {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  background-color: #ef4444;
  border: 2px solid white;
  border-radius: 50%;
}

.loading-indicator {
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  color: #7c3aed;
  animation: spin 1s linear infinite;
}

.loading-users, .loading-chats {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #666;
}

.loading-icon {
  font-size: 24px;
  margin-bottom: 12px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: white;
  height: 100%;
  min-height: 0; /* flexbox 오버플로우 방지 */
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  background-color: white;
}

.chat-partner-info {
  display: flex;
  align-items: center;
}

.partner-name {
  font-weight: 600;
  font-size: 16px;
  color: #333;
  margin-bottom: 2px;
}

.partner-title {
  font-size: 12px;
  color: #666;
}

.chat-actions {
  display: flex;
  gap: 8px;
  /* 나가기 버튼 제거로 인한 간격 조정 */
}

.chat-messages {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0; /* flexbox 오버플로우 방지 */
  max-height: calc(100vh - 200px); /* 최대 높이 제한 */
  width: 100%;
}

.message {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
  width: 100%;
}

.message-left-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  width: 60px;
  padding-top: 10px;
}

.message-avatar {
  width: 32px;
  height: 32px;
}

.message-sender-name {
  font-size: 11px;
  color: #666;
  text-align: center;
  max-width: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-content {
  max-width: 60%;
  min-width: 0;
  flex: 1;
}

.message-bubble {
  padding: 12px 16px;
  border-radius: 18px;
  background-color: #f0f0f0;
  color: #333;
  font-size: 14px;
  line-height: 1.4;
  word-wrap: break-word;
  display: inline-block;
  max-width: 100%;
  white-space: pre-wrap; /* 개행 문자 보존 */
  word-break: break-word; /* 긴 단어 줄바꿈 */
}

.message-own .message-bubble {
  background-color: #7c3aed;
  color: white;
  white-space: pre-wrap; /* 개행 문자 보존 */
  word-break: break-word; /* 긴 단어 줄바꿈 */
}

.message-time {
  display: flex;
  align-items: center;
  font-size: 11px;
  color: #999;
  margin-top: 4px;
  justify-content: flex-start;
}

.message-own .message-time {
  justify-content: flex-end;
}

/* 메시지 정렬 */
.message-right {
  justify-content: flex-end;
}

.message-left {
  flex-direction: row;
  justify-content: flex-start;
}

/* 본인 메시지 오른쪽 정렬 강화 */
.message.message-right .message-content {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.message.message-right .message-bubble {
  background-color: #7c3aed;
  color: white;
  white-space: pre-wrap; /* 개행 문자 보존 */
  word-break: break-word; /* 긴 단어 줄바꿈 */
}

.message.message-right .message-time {
  justify-content: flex-end;
}

.chat-input {
  padding: 20px;
  border-top: 1px solid #e0e0e0;
  background-color: white;
}

.input-container {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-upload-section {
  margin-bottom: 16px;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.attach-btn {
  flex-shrink: 0;
  color: #7c3aed;
}

.attach-btn:hover {
  background-color: #f3e8ff;
}

.message-field {
  flex: 1;
  padding-right: 60px; /* 전송 버튼 공간 확보 */
}

.message-field .v-field__input {
  resize: none;
  min-height: 40px;
  max-height: 120px;
  overflow-y: auto;
  white-space: pre-wrap; /* 개행 문자 보존 */
  word-wrap: break-word; /* 긴 단어 줄바꿈 */
}

.message-field .v-field__input:focus {
  outline: none;
}

/* VTextarea 내부 textarea 요소 스타일 */
.message-field textarea {
  white-space: pre-wrap !important;
  word-wrap: break-word !important;
  line-height: 1.4;
}

.send-button {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  min-width: 40px;
  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
}

/* 모바일 헤더 */
.mobile-header {
  display: none;
  position: sticky;
  top: 0;
  height: 48px;
  background-color: white;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);
  z-index: 3;
  padding: 0 12px;
}

.mobile-header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  gap: 8px;
}

  .sidebar-toggle-btn {
  color: #7c3aed;
}

/* 작은 기기에서 헤더 사이 간격 보정 */
@media (max-width: 400px) {
  .mobile-title {
    font-size: 14px;
    margin: 0 8px;
  }
}

.mobile-title {
  font-weight: 600;
  font-size: 15px;
  color: #333;
  flex: 1;
  text-align: center;
  margin: 0 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

  .mobile-actions {
    display: flex;
    gap: 4px;
  }

/* 사이드바 오버레이 */
.sidebar-overlay {
  position: absolute;
  top: 48px; /* 헤더 아래부터 덮기 */
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 2;
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  .chat-container {
    height: calc(100dvh - 115px);
    display: flex;
    flex-direction: column;
    align-items: stretch;
    overflow: hidden;
  }
  
  .mobile-header {
    display: block;
    position: sticky;
    top: 0;
  }
  
  .chat-sidebar {
    position: absolute;
    top: 48px; /* 헤더 아래 */
    left: 0;
    width: 100%;
    height: calc(100% - 48px);
    transform: translateX(-120%);
    transition: transform 0.3s ease;
    background-color: white;
    visibility: hidden;
    pointer-events: none;
    box-shadow: none;
  }
  
  .chat-sidebar.sidebar-open {
    transform: translateX(0);
    visibility: visible;
    pointer-events: auto;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  }
  
  .chat-main {
    width: 100%;
    flex: 1 1 auto;
    min-height: 0;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  
  .chat-messages {
    flex: 1 1 auto;
    min-height: 0;
    max-height: none;
    padding: 12px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .chat-messages .no-chat-selected {
    height: 100%; /* 모바일에서 채팅이 선택되지 않았을 때 전체 높이 사용 */
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    min-height: 300px;
    width: 100%;
    flex: 1;
    margin: 0;
    gap: 0;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1;
    background-color: white;
    border-radius: 0;
    box-shadow: none;
    border: none;
    outline: none;
    pointer-events: none;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    touch-action: none;
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
    -webkit-overflow-scrolling: touch;
    -webkit-transform: translateZ(0);
    transform: translateZ(0);
    will-change: transform;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    perspective: 1000px;
  }
  
  .chat-messages:has(.no-chat-selected) {
    max-height: none;
    height: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    overflow: hidden;
    flex-direction: column;
    gap: 0;
    margin: 0;
    position: relative;
    min-height: 0;
    z-index: 0;
    background-color: white;
    border-radius: 0;
    box-shadow: none;
    border: none;
    outline: none;
    pointer-events: none;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    touch-action: none;
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
    -webkit-overflow-scrolling: touch;
    -webkit-transform: translateZ(0);
    transform: translateZ(0);
    will-change: transform;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }
  
  .chat-input {
    flex-shrink: 0;
    padding: 12px;
    background-color: white;
  }
  
  .input-container {
    gap: 4px;
  }
  
  .message-field {
    font-size: 14px;
  }
  
  .send-button {
    width: 36px;
    height: 36px;
    min-width: 36px;
  }
  
  .message {
    margin-bottom: 12px;
  }
  
  .message-content {
    max-width: 80%;
  }
  
  .message-bubble {
    padding: 10px 14px;
    font-size: 13px;
  }
  
  .message-time {
    font-size: 10px;
  }
  
  .file-upload-section {
    padding: 12px;
  }
  
  .selected-files-preview {
    padding: 12px;
  }
  
  .files-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 8px;
  }
  
  .file-item {
    padding: 8px;
  }
  
  .file-preview {
    height: 50px;
  }
  
  .file-name {
    font-size: 11px;
  }
  
  .file-size {
    font-size: 9px;
  }
  
  .chat-input-placeholder {
    padding: 12px;
  }
  
  .placeholder-content {
    padding: 12px;
    font-size: 14px;
  }
}

/* 채팅 선택 안내 */
.no-chat-selected {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 400px;
}

.no-chat-content {
  text-align: center;
  max-width: 400px;
  padding: 40px 20px;
}

@media (max-width: 768px) {
  .no-chat-content {
    max-width: 300px;
    padding: 20px;
  }
}

/* 입력 영역 플레이스홀더 */
.chat-input-placeholder {
  padding: 20px;
  border-top: 1px solid #e0e0e0;
  background-color: #f8f9fa;
}

.placeholder-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  background-color: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  color: #666;
}

/* 새 메시지 알림 */
.new-message-notification {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: #1976d2;
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  animation: slideInUp 0.3s ease-out;
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.notification-content button {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}

.notification-content button:hover {
  background: rgba(255, 255, 255, 0.3);
}

@keyframes slideInUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* 작은 화면에서의 높이 조정 */
@media (max-height: 700px) {
  .chat-container {
    height: calc(100vh - 95px);
    min-height: 500px;
  }
  
  .chat-messages {
    max-height: calc(100vh - 160px);
  }
}

/* 스크롤바 스타일링 */
.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 파일 첨부 스타일 */
.message-attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}

.attachment-item {
  max-width: 245px;
}

.image-attachment {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: transform 0.2s;
}

.image-attachment:hover {
  transform: scale(1.05);
}

.attachment-image {
  max-width: 150px;
  max-height: 150px;
  min-width: 80px;
  min-height: 80px;
  object-fit: cover;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 2px solid transparent;
  transition: border-color 0.2s;
}

.image-attachment:hover .attachment-image {
  border-color: #7c3aed;
}

.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
  background-color: #f8f9fa;
  border: 1px dashed #dee2e6;
  border-radius: 12px;
  color: #6c757d;
  min-width: 150px;
  min-height: 150px;
  justify-content: center;
}

.image-error .VIcon {
  font-size: 32px;
  color: #adb5bd;
}

.image-error span {
  font-size: 12px;
  text-align: center;
  line-height: 1.4;
}

.attachment-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 150px;
}

.attachment-name {
  font-size: 12px;
  color: #333;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.attachment-size {
  font-size: 11px;
  color: #666;
  margin-top: 2px;
}

.file-attachment {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background-color: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 200px;
}

.file-attachment:hover {
  background-color: #e9ecef;
  border-color: #7c3aed;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.15);
}

/* 로딩 중인 파일 첨부 박스 스타일 */
.file-attachment.loading {
  background-color: rgba(124, 58, 237, 0.1);
  border-color: rgba(124, 58, 237, 0.2);
  cursor: default;
}

.file-attachment.loading:hover {
  background-color: rgba(124, 58, 237, 0.1);
  border-color: rgba(124, 58, 237, 0.2);
  transform: none;
  box-shadow: none;
}

.file-attachment.loading .loading-icon {
  animation: spin 1s linear infinite;
  color: #7c3aed;
}

.file-icon {
  font-size: 24px;
  color: #7c3aed;
  flex-shrink: 0;
}

.file-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1;
  min-width: 0;
}

.file-name {
  font-weight: 500;
  font-size: 13px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 120px;
}

.file-size {
  font-size: 11px;
  color: #666;
  margin-top: 2px;
}

.download-btn {
  flex-shrink: 0;
  color: #7c3aed;
  transition: all 0.2s;
}

.download-btn:hover {
  background-color: #f3e8ff;
  transform: scale(1.1);
}

/* 선택된 파일 미리보기 스타일 */
.selected-files-preview {
  margin-top: 16px;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
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

.preview-image {
  max-width: 100%;
  max-height: 100%;
  border-radius: 4px;
  object-fit: cover;
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

/* 커스텀 파일 입력 스타일 */
.custom-file-input {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.file-input-hidden {
  display: none;
}

.file-input-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  background-color: #f8f9fa;
  border: 2px dashed #dee2e6;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #6c757d;
}

.file-input-trigger:hover {
  background-color: #e9ecef;
  border-color: #7c3aed;
  color: #7c3aed;
}

.file-input-trigger.drag-over {
  background-color: #f3e8ff;
  border-color: #7c3aed;
  color: #7c3aed;
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.15);
}

.file-input-trigger .VIcon {
  font-size: 20px;
}

.file-input-trigger span {
  font-size: 14px;
  font-weight: 500;
}

.file-input-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 12px;
  background-color: #f8f9fa;
  border-radius: 6px;
  font-size: 12px;
  color: #6c757d;
}

.file-input-info span {
  line-height: 1.4;
}

/* 이미지 모달 스타일 */
.image-modal-card {
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.image-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #e0e0e0;
  background-color: #f8f9fa;
}

.image-modal-title {
  font-weight: 600;
  color: #333;
  font-size: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 70%;
}

.close-btn {
  color: #666;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #333;
}

.image-modal-content {
  flex: 1;
  padding: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #000;
  min-height: 400px;
}

.image-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  transition: transform 0.3s ease;
}

.modal-image:hover {
  transform: scale(1.02);
}

.image-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e0e0e0;
  background-color: #f8f9fa;
}

.download-modal-btn {
  color: #7c3aed;
  border-color: #7c3aed;
}

.download-modal-btn:hover {
  background-color: #7c3aed;
  color: white;
}

/* 모달 반응형 디자인 */
@media (max-width: 768px) {
  .image-modal-card {
    max-width: 95vw;
    max-height: 95vh;
  }
  
  .image-modal-header {
    padding: 12px 16px;
  }
  
  .image-modal-title {
    font-size: 14px;
    max-width: 60%;
  }
  
  .image-modal-content {
    min-height: 300px;
  }
  
  .image-container {
    padding: 12px;
  }
  
  .image-modal-actions {
    padding: 12px 16px;
    flex-direction: column;
  }
  
  .image-modal-actions .VBtn {
    width: 100%;
  }
}

/* 모달 애니메이션 */
.VDialog .VCard {
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* 로딩 인디케이터 스타일 */
.loading-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 8px 12px;
  background-color: rgba(124, 58, 237, 0.1);
  border-radius: 8px;
  font-size: 12px;
  color: #7c3aed;
}

.loading-indicator .loading-icon {
  animation: spin 1s linear infinite;
  font-size: 14px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 메시지 버블 내부 로딩 인디케이터 */
.message-bubble .loading-indicator {
  margin-top: 8px;
  background-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
}

.message-own .message-bubble .loading-indicator {
  background-color: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.9);
}

.loading-box {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 8px 12px;
  background-color: rgba(124, 58, 237, 0.1);
  border: 1px solid rgba(124, 58, 237, 0.2);
  border-radius: 6px;
  font-size: 12px;
  color: #7c3aed;
  font-weight: 500;
}

.loading-box .loading-icon {
  animation: spin 1s linear infinite;
  font-size: 14px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 메시지 버블 내부 로딩 박스 */
.message-bubble .loading-box {
  margin-top: 8px;
  background-color: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  color: rgba(255, 255, 255, 0.9);
}

.message-own .message-bubble .loading-box {
  background-color: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
  color: rgba(255, 255, 255, 0.95);
}

/* 로딩 인디케이터 (상단) */
.loading-messages {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  color: #666;
  font-size: 14px;
}

.loading-messages .loading-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.user-list-container {
  max-height: 400px;
  overflow-y: auto;
}

.department-section {
  margin-bottom: 20px;
}

.department-section:last-child {
  margin-bottom: 0;
}

.department-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: #f8f9fa;
  border-radius: 6px;
  margin-bottom: 8px;
  font-weight: 600;
  color: #495057;
  font-size: 13px;
}

.department-icon {
  font-size: 14px;
  color: #7c3aed;
}

.department-name {
  flex: 1;
}

.department-count {
  color: #6c757d;
  font-weight: 500;
}

.department-users {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.user-item:hover {
  background-color: #f5f5f5;
}

.user-item.active {
  background-color: #f3e8ff;
  border-left: 3px solid #7c3aed;
}

.user-item.group-selected {
  background-color: #e3f2fd;
  border-left: 3px solid #2196f3;
}

.user-checkbox {
  margin-right: 8px;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-weight: 600;
  font-size: 14px;
  color: #333;
  margin-bottom: 2px;
}

.user-details {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #666;
  margin-bottom: 2px;
}

.user-position {
  font-weight: 500;
  color: #495057;
}

.user-department {
  color: #6c757d;
}

.separator {
  color: #adb5bd;
}

.user-status {
  display: flex;
  align-items: center;
  font-size: 11px;
  color: #6c757d;
}

.empty-users {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

/* 스크롤바 스타일링 */
.user-list-container::-webkit-scrollbar {
  width: 4px;
}

.user-list-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 2px;
}

.user-list-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 2px;
}

.user-list-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 부서 헤더 드롭다운 스타일 */
.department-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: #f8f9fa;
  border-radius: 6px;
  margin-bottom: 8px;
  font-weight: 600;
  color: #495057;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.department-header:hover {
  background-color: #e9ecef;
  color: #7c3aed;
}

.dropdown-icon {
  margin-left: auto;
  font-size: 16px;
  transition: transform 0.2s ease;
  color: #6c757d;
}

.dropdown-icon.expanded {
  transform: rotate(180deg);
  color: #7c3aed;
}

.department-users {
  overflow: hidden;
  transition: all 0.3s ease;
}

/* 드롭다운 애니메이션 */
.department-users {
  max-height: 0;
  opacity: 0;
  transform: translateY(-10px);
}

.department-users.show {
  max-height: 1000px;
  opacity: 1;
  transform: translateY(0);
}

/* 부서 섹션 간격 조정 */
.department-section {
  margin-bottom: 16px;
}

.department-section:last-child {
  margin-bottom: 0;
}

.admin-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background-color: #7c3aed;
  color: white;
  border-radius: 4px;
  font-size: 12px;
}

.participant-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.participant-info {
  flex: 1;
  min-width: 0;
}

.participant-name {
  font-weight: 600;
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
}

.participant-details {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #666;
  margin-bottom: 2px;
}

.participant-position {
  font-weight: 500;
  color: #495057;
}

.participant-department {
  color: #6c757d;
}

.separator {
  color: #adb5bd;
}

.participant-status {
  display: flex;
  align-items: center;
  font-size: 11px;
  color: #6c757d;
}

.loading-participants {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #666;
}

.loading-participants .loading-icon {
  font-size: 24px;
  margin-bottom: 12px;
  animation: spin 1s linear infinite;
}

.participants-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
}

/* 그룹 정보 스타일 */
.group-info {
  color: #666;
  font-size: 12px;
  font-weight: normal;
}

/* 참여자 목록 스타일 */
.loading-participants {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #666;
}

.loading-participants .loading-icon {
  font-size: 24px;
  margin-bottom: 12px;
  animation: spin 1s linear infinite;
}

.participants-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.participant-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  background-color: #f8f9fa;
  border: 1px solid #e0e0e0;
  transition: all 0.2s;
}

.participant-item:hover {
  background-color: #e9ecef;
  border-color: #7c3aed;
}

.participant-info {
  flex: 1;
  min-width: 0;
}

.participant-name {
  font-weight: 600;
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
}

.participant-details {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #666;
}

.participant-position {
  font-weight: 500;
  color: #495057;
}

.participant-department {
  color: #6c757d;
}

.admin-badge {
  margin-left: 8px;
}

/* 참여자 목록 스크롤바 */
.participants-list::-webkit-scrollbar {
  width: 4px;
}

.participants-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 2px;
}

.participants-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 2px;
}

.participants-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 참여자 목록 다이얼로그 스타일 */
.participants-dialog-card {
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.participants-header {
  padding: 20px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: none;
}

.participants-title {
  display: flex;
  align-items: center;
  font-size: 18px;
  font-weight: 600;
}

.participants-title .VIcon {
  font-size: 20px;
}

.close-btn {
  color: rgba(255, 255, 255, 0.8);
  transition: all 0.2s;
}

.close-btn:hover {
  color: white;
  background-color: rgba(255, 255, 255, 0.1);
}

.participants-content {
  padding: 0;
  background-color: #fafafa;
}

.participants-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 500px;
  overflow-y: auto;
  padding: 16px;
}

.participant-item {
  display: flex;
  align-items: center;
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.participant-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  opacity: 0;
  transition: opacity 0.3s;
}

.participant-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(124, 58, 237, 0.15);
  border-color: #7c3aed;
}

.participant-item:hover::before {
  opacity: 1;
}

.participant-avatar {
  position: relative;
  margin-right: 16px;
  flex-shrink: 0;
}

.participant-avatar-img {
  border: 3px solid #f3f4f6;
  transition: all 0.3s;
}

.participant-item:hover .participant-avatar-img {
  border-color: #7c3aed;
  transform: scale(1.05);
}

.online-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 14px;
  height: 14px;
  background: linear-gradient(135deg, #10b981, #059669);
  border: 3px solid white;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.participant-info {
  flex: 1;
  min-width: 0;
}

.participant-name {
  font-weight: 600;
  font-size: 16px;
  color: #1f2937;
  margin-bottom: 6px;
  line-height: 1.2;
}

.participant-details {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 4px;
  line-height: 1.3;
}

.participant-position {
  font-weight: 500;
  color: #374151;
  background: #f3f4f6;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
}

.participant-department {
  color: #6b7280;
  font-size: 12px;
}

.separator {
  color: #d1d5db;
  font-weight: 300;
}

.participant-status {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #10b981;
  font-weight: 500;
  margin-top: 2px;
}

.admin-badge {
  margin-left: 12px;
  flex-shrink: 0;
}

.admin-chip {
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  color: white;
  font-weight: 600;
  font-size: 12px;
  height: 28px;
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
}

.participants-actions {
  padding: 16px 24px;
  background: white;
  border-top: 1px solid #e5e7eb;
}

.close-action-btn {
  border-radius: 8px;
  font-weight: 500;
  text-transform: none;
  padding: 8px 24px;
}

/* 참여자 목록 스크롤바 */
.participants-list::-webkit-scrollbar {
  width: 6px;
}

.participants-list::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.participants-list::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  border-radius: 3px;
}

.participants-list::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #6d28d9, #9333ea);
}

/* 그룹 정보 스타일 */
.group-info {
  color: #6b7280;
  font-size: 12px;
  font-weight: 500;
  background: #f3f4f6;
  padding: 2px 8px;
  border-radius: 6px;
  margin-left: 8px;
}

/* 모바일 반응형 */
@media (max-width: 768px) {
  .participants-dialog-card {
    margin: 16px;
    border-radius: 12px;
  }
  
  .participants-header {
    padding: 16px 20px;
  }
  
  .participants-title {
    font-size: 16px;
  }
  
  .participants-list {
    padding: 12px;
    max-height: 400px;
  }
  
  .participant-item {
    padding: 12px;
  }
  
  .participant-avatar {
    margin-right: 12px;
  }
  
  .participant-name {
    font-size: 15px;
  }
  
  .participant-details {
    font-size: 12px;
  }
}
</style> 