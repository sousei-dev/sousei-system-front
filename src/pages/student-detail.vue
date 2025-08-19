<script lang="ts" setup>
import * as BillingAuto from '@/pages/billing-auto.vue'
import { studentService, type Student } from '@/services/student'
import * as StudentSettingsAcceptance from '@/views/pages/student-settings/StudentSettingsBasicAcceptance.vue'
import * as StudentSettingsAccount from '@/views/pages/student-settings/StudentSettingsAccount.vue'
import * as StudentSettingsRent from '@/views/pages/student-settings/StudentSettingsRent.vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const studentId = ref(route.params.id as string)
const student = ref<Student | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

// 학생 정보 조회
const fetchStudent = async () => {
  try {
    loading.value = true
    error.value = null
    student.value = await studentService.getStudent(studentId.value)
  }
  catch (err: any) {
    error.value = err.response?.data?.message || '技能生情報の取得に失敗しました。'
  }
  finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchStudent()
  if (route.query.tab && typeof route.query.tab === 'string') {
    activeTab.value = route.query.tab
  }
})

// tabs
const tabs = [
  { title: '技能生情報', icon: 'ri-user-line', tab: 'account' },
  { title: '家賃請求情報', icon: 'ri-home-4-line', tab: 'rent' },
  { title: '受入請求情報', icon: 'ri-shake-hands-line', tab: 'acceptance' }
]

const activeTab = ref('account')
</script>

<template>
  <div>
    <!-- 로딩 상태 -->
    <VProgressCircular
      v-if="loading"
      indeterminate
      color="primary"
    />

    <!-- 에러 메시지 -->
    <VAlert
      v-if="error"
      type="error"
      class="mb-6"
    >
      {{ error }}
    </VAlert>

    <!-- 학생 정보가 있을 때만 표시 -->
    <template v-if="student">
      <VTabs
        v-model="activeTab"
        show-arrows
        class="v-tabs-pill"
      >
        <VTab
          v-for="item in tabs"
          :key="item.icon"
          :value="item.tab"
        >
          <VIcon
            size="20"
            start
            :icon="item.icon"
          />
          {{ item.title }}
        </VTab>
      </VTabs>

      <VWindow
        v-model="activeTab"
        class="mt-5 disable-tab-transition"
        :touch="false"
      >
        <!-- Account -->
        <VWindowItem value="account">
          <StudentSettingsAccount.default :student="student" />
        </VWindowItem>

        <!-- bill -->
        <VWindowItem value="acceptance">
          <StudentSettingsAcceptance.default :student="student" />
        </VWindowItem>

        <!-- rent -->
        <VWindowItem value="rent">
          <StudentSettingsRent.default :student="student" />
        </VWindowItem>

        <!-- consultation -->
        <VWindowItem value="consultation">
          <BillingAuto.default :student="student" />
        </VWindowItem>
      </VWindow>
    </template>
  </div>
</template>
