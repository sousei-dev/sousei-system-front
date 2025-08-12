<script lang="ts" setup>
import type { CalendarEvent } from '@/types/calendar'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import FullCalendar from '@fullcalendar/vue3'
import { onMounted, ref } from 'vue'

interface NewEvent {
  title: string
  start: string
  end: string
  description: string
  color: string
}

const events = ref<CalendarEvent[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// 이벤트 추가 다이얼로그 상태
const showEventDialog = ref(false)
const newEvent = ref<NewEvent>({
  title: '',
  start: '',
  end: '',
  description: '',
  color: '#1976D2',
})

// 더미 데이터
const dummyEvents: CalendarEvent[] = [
  {
    id: '1',
    title: '신입생 오리엔테이션',
    start: '2024-03-20T09:00:00',
    end: '2024-03-20T12:00:00',
    color: '#1976D2',
    extendedProps: {
      description: '신입생 오리엔테이션 및 학교 시설 안내',
      created_by: 1,
      created_at: '2024-03-15T10:00:00',
      updated_at: '2024-03-15T10:00:00',
    },
  },
  {
    id: '2',
    title: '일본어 시험',
    start: '2024-03-25T13:00:00',
    end: '2024-03-25T15:00:00',
    color: '#FF5252',
    extendedProps: {
      description: 'JLPT N2 모의고사',
      created_by: 2,
      created_at: '2024-03-16T14:00:00',
      updated_at: '2024-03-16T14:00:00',
    },
  },
  {
    id: '3',
    title: '기업 설명회',
    start: '2024-03-28T10:00:00',
    end: '2024-03-28T16:00:00',
    color: '#4CAF50',
    extendedProps: {
      description: 'IT 기업 취업 설명회',
      created_by: 1,
      created_at: '2024-03-17T09:00:00',
      updated_at: '2024-03-17T09:00:00',
    },
  },
  {
    id: '4',
    title: '취업 상담',
    start: '2024-03-30T14:00:00',
    end: '2024-03-30T15:00:00',
    color: '#FFC107',
    extendedProps: {
      description: '개인 취업 상담',
      created_by: 3,
      created_at: '2024-03-18T11:00:00',
      updated_at: '2024-03-18T11:00:00',
    },
  },
]

// 일정 목록 조회
const fetchEvents = async () => {
  try {
    loading.value = true
    error.value = null
    
    // API 연동 전 더미 데이터 사용
    // events.value = await calendarService.getEvents()
    events.value = dummyEvents
  }
  catch (err: any) {
    error.value = err.response?.data?.message || '일정 목록을 불러오는데 실패했습니다.'
  }
  finally {
    loading.value = false
  }
}

// 이벤트 추가
const addEvent = () => {
  showEventDialog.value = true
}

// 이벤트 저장
const saveEvent = async () => {
  try {
    loading.value = true
    error.value = null
    
    const event = newEvent.value
    const newId = (events.value.length + 1).toString()
    const response: CalendarEvent = {
      id: newId,
      title: event.title,
      start: event.start,
      end: event.end,
      color: event.color,
      extendedProps: {
        description: event.description,
        created_by: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    }
    events.value.push(response)
    
    showEventDialog.value = false
    newEvent.value = {
      title: '',
      start: '',
      end: '',
      description: '',
      color: '#1976D2',
    }
  }
  catch (err: any) {
    error.value = err.response?.data?.message || 'イベントの保存に失敗しました。'
  }
  finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchEvents()
})
</script>

<template>
  <VCard>
    <VCardText>
      <VRow>
        <!-- 에러 메시지 -->
        <VCol
          v-if="error"
          cols="12"
        >
          <VAlert
            type="error"
            variant="tonal"
            class="mb-3"
          >
            {{ error }}
          </VAlert>
        </VCol>

        <!-- 캘린더 헤더 -->
        <VCol cols="12">
          <div class="d-flex justify-space-between align-center mb-4">
            <h2 class="text-h4">
              共有カレンダー
            </h2>
            <VBtn
              color="primary"
              prepend-icon="ri-add-line"
              @click="addEvent"
            >
              予定追加
            </VBtn>
          </div>
        </VCol>

        <!-- 캘린더 -->
        <VCol cols="12">
          <FullCalendar
            :options="{
              plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
              initialView: 'dayGridMonth',
              headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
              },
              events: events,
              editable: true,
              selectable: true,
              selectMirror: true,
              dayMaxEvents: true,
              weekends: true,
              locale: 'ko',
              height: 'auto',
              eventClick: (info) => {
                // 이벤트 클릭 시 처리
                console.log('Event clicked:', info.event)
              },
              select: (info) => {
                // 날짜 선택 시 처리
                newEvent.value.start = info.startStr
                newEvent.value.end = info.endStr
                showEventDialog.value = true
              }
            }"
          />
        </VCol>
      </VRow>
    </VCardText>
  </VCard>

  <!-- 이벤트 추가 다이얼로그 -->
  <VDialog
    v-model="showEventDialog"
    max-width="500px"
  >
    <VCard>
      <VCardTitle class="text-h5 pa-4">
        予定追加
      </VCardTitle>

      <VCardText>
        <VForm @submit.prevent="saveEvent">
          <VRow>
            <VCol cols="12">
              <VTextField
                v-model="newEvent.title"
                label="제목"
                placeholder="予定のタイトルを入力してください"
                :disabled="loading"
                required
              />
            </VCol>

            <VCol cols="12" md="6">
              <VTextField
                v-model="newEvent.start"
                label="開始日"
                type="datetime-local"
                :disabled="loading"
                required
              />
            </VCol>

            <VCol cols="12" md="6">
              <VTextField
                v-model="newEvent.end"
                label="終了日"
                type="datetime-local"
                :disabled="loading"
                required
              />
            </VCol>

            <VCol cols="12">
              <VTextarea
                v-model="newEvent.description"
                label="説明"
                placeholder="予定の説明を入力してください"
                :disabled="loading"
                rows="3"
              />
            </VCol>

            <VCol cols="12">
              <VColorPicker
                v-model="newEvent.color"
                label="色"
                :disabled="loading"
                hide-inputs
                mode="hex"
              />
            </VCol>
          </VRow>
        </VForm>
      </VCardText>

      <VCardActions class="pa-4">
        <VSpacer />
        <VBtn
          color="error"
          variant="tonal"
          @click="showEventDialog = false"
        >
          キャンセル
        </VBtn>
        <VBtn
          color="primary"
          :loading="loading"
          @click="saveEvent"
        >
          保存
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style>
.fc {
  background: white;
  padding: 1rem;
  border-radius: 4px;
}

.fc .fc-toolbar-title {
  font-size: 1.5rem !important;
  font-weight: 500;
}

.fc .fc-button {
  text-transform: none !important;
  font-weight: 500;
}

.fc .fc-event {
  cursor: pointer;
}

.fc .fc-event-title {
  font-weight: 500;
}

.fc .fc-day-today {
  background-color: rgba(var(--v-theme-primary), 0.1) !important;
}
</style> 
