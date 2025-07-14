<script lang="ts" setup>
import { buildingService, type BuildingOption, type EmptyRoomOption } from '@/services/building'
import { companyService, type Company } from '@/services/company'
import { gradeService, type Grade } from '@/services/grade'
import { studentService, type Student, type ResidenceCardHistory } from '@/services/student'
import avatar1 from '@images/avatars/avatar-1.png'
import { formatDate } from '@/@core/utils/formatters'
import { computed, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  student: Student
}>()

const form = ref({
  avatarImg: props.student.avatar || avatar1,
  name: props.student.name,
  name_katakana: props.student.name_katakana,
  phone: props.student.phone,
  facebook_name: props.student.facebook_name,
  company: props.student.company_id,
  assignment_date: props.student.assignment_date,
  consultant: props.student.consultant,
  gender: props.student.gender,
  birth_date: props.student.birth_date,
  nationality: props.student.nationality,
  local_address: props.student.local_address,
  address: props.student.address,
  ward: props.student.ward,
  building: props.student.current_room?.building_name || '',
  room: props.student.current_room?.room_number || '',
  residence_card_number: props.student.residence_card_number,
  residence_card_start: props.student.residence_card_start,
  residence_card_expiry: props.student.residence_card_expiry,
  resignation_date: props.student.resignation_date,
  has_spouse: props.student.has_spouse,
  japanese_level: props.student.japanese_level,
  passport_number: props.student.passport_number,
  passport_expiration_date: props.student.passport_expiration_date,
  visa_application_date: props.student.visa_application_date,
  visa_year: props.student.visa_year,
  cooperation_submitted_date: props.student.cooperation_submitted_date,
  cooperation_submitted_place: props.student.cooperation_submitted_place,
  experience_over_2_years: props.student.experience_over_2_years,
  arrival_type: props.student.arrival_type,
  entry_date: props.student.entry_date,
  pre_guidance_date: props.student.pre_guidance_date,
  orientation_date: props.student.orientation_date,
  certification_application_date: props.student.certification_application_date,
  interview_date: props.student.interview_date,
  student_type: props.student.student_type,
  grade: props.student.grade_id,
})

const loading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const refInputEl = ref<HTMLElement>()
const companies = ref<Company[]>([])
const grades = ref<Grade[]>([])
const buildingOptions = ref<BuildingOption[]>([])
const emptyRoomOptions = ref<EmptyRoomOption[]>([])
const residenceCardHistory = ref<ResidenceCardHistory[]>([])
const showResidenceCardHistory = ref(false)
const showResidenceCardDialog = ref(false)
const residenceCardForm = ref({
  residence_card_number: '',
  residence_card_start: '',
  residence_card_expiry: '',
  visa_application_date: '',
  year: '',
  note: '',
})
const residenceCardError = ref<string | null>(null)
const residenceCardErrors = ref<Record<string, boolean>>({})

// 재류카드 폼 유효성 검사
const isResidenceCardFormValid = computed(() => {
  return !!(
    residenceCardForm.value.residence_card_number &&
    residenceCardForm.value.residence_card_start &&
    residenceCardForm.value.residence_card_expiry &&
    residenceCardForm.value.visa_application_date &&
    residenceCardForm.value.year
  )
})

const nationalityOptions = [
  { title: '🇲🇲 ミャンマー', value: 'ミャンマー' },
  { title: '🇻🇳 ベトナム', value: 'ベトナム' },
  { title: '🇰🇷 韓国', value: '韓国' },
  { title: '🇰🇭 カンボジア', value: 'カンボジア' },
]

// 회사 목록 조회
const fetchCompanies = async () => {
  try {
    companies.value = await companyService.getCompanies()
  }
  catch (err: any) {
    error.value = err.response?.data?.message || '会社リストの取得に失敗しました。'
  }
}

// 등급 목록 조회
const fetchGrades = async () => {
  try {
    grades.value = await gradeService.getGrades()
  } catch (err: any) {
    error.value = err.response?.data?.message || '期生リストの取得に失敗しました。'
  }
}

// 빌딩 옵션 조회
const fetchBuildingOptions = async () => {
  try {
    const response = await buildingService.getBuildingOptions()

    buildingOptions.value = response.options
  } catch (err: any) {
    error.value = err.response?.data?.message || '建物リストの取得に失敗しました。'
  }
}

// 빈 호실 조회
const fetchEmptyRooms = async (buildingId: string) => {
  try {
    const response = await buildingService.getEmptyRoomsByBuilding(buildingId)

    emptyRoomOptions.value = response.options
  } catch (err: any) {
    error.value = err.response?.data?.message || '空室リストの取得に失敗しました。'
  }
}

// 재류카드 히스토리 조회
const fetchResidenceCardHistory = async () => {
  try {
    const data = await studentService.getResidenceCardHistory(props.student.id)
    residenceCardHistory.value = data.items
  } catch (err: any) {
    console.error('재류카드 히스토리 조회 실패:', err)
  }
}

// 재류카드 추가
const addResidenceCard = async () => {
  // 에러 상태 초기화
  residenceCardErrors.value = {}
  
  // 필수값 검증
  const errors = []
  
  if (!residenceCardForm.value.residence_card_number) {
    residenceCardErrors.value.residence_card_number = true
  }
  if (!residenceCardForm.value.residence_card_start) {
    residenceCardErrors.value.residence_card_start = true
  }
  if (!residenceCardForm.value.residence_card_expiry) {
    residenceCardErrors.value.residence_card_expiry = true
  }
  if (!residenceCardForm.value.visa_application_date) {
    residenceCardErrors.value.visa_application_date = true
  }
  if (!residenceCardForm.value.year) {
    residenceCardErrors.value.year = true
  }

  if (errors.length > 0) {
    error.value = errors.join('\n')
    return
  }

  try {
    loading.value = true
    error.value = null
    success.value = null

    const response = await studentService.addResidenceCard(props.student.id, residenceCardForm.value)

    // 현재 표시되는 재류카드 정보 업데이트
    form.value.residence_card_number = residenceCardForm.value.residence_card_number
    form.value.residence_card_start = residenceCardForm.value.residence_card_start
    form.value.residence_card_expiry = residenceCardForm.value.residence_card_expiry
    form.value.visa_application_date = residenceCardForm.value.visa_application_date
    form.value.visa_year = residenceCardForm.value.year

    // 폼 초기화
    residenceCardForm.value = {
      residence_card_number: '',
      residence_card_start: '',
      residence_card_expiry: '',
      visa_application_date: '',
      year: '',
      note: '',
    }

    // 다이얼로그 닫기
    showResidenceCardDialog.value = false

    // 히스토리 새로고침
    await fetchResidenceCardHistory()

    success.value = '在留カード情報が正常に追加されました。'
  } catch (err: any) {
    showResidenceCardDialog.value = false
    error.value = err.response?.data?.detail || '在留カード情報の追加に失敗しました。'
  } finally {
    loading.value = false
  }
}

// 방 ID로부터 건물과 방 정보 설정
const setBuildingAndRoomFromRoomId = async (roomId: string) => {
  if (!roomId) return

  try {
    // 모든 빌딩의 빈 호실을 조회하여 해당 방 찾기
    for (const building of buildingOptions.value) {
      const response = await buildingService.getEmptyRoomsByBuilding(building.value)
      const room = response.options.find(r => r.value === roomId)

      if (room) {
        // 건물과 방 설정
        form.value.building = building.value
        form.value.room = roomId

        // 빈 호실 목록 업데이트
        emptyRoomOptions.value = response.options

        // 주소 설정
        form.value.address = `${building.address} ${room.room_number}号室`
        break
      }
    }
  } catch (err: any) {
    console.error('방 정보 설정 실패:', err)
  }
}

// current_room 데이터로부터 건물과 방 정보 설정
const setBuildingAndRoomFromCurrentRoom = async () => {
  if (!props.student.current_room) return

  try {
    // current_room 데이터가 있으면 해당 빌딩 찾기
    const building = buildingOptions.value.find(b =>
      b.label.includes(props.student.current_room!.building_name),
    )

    if (building) {
      // 건물 설정
      form.value.building = building.value

      // 해당 빌딩의 빈 호실 조회
      await fetchEmptyRooms(building.value)

      // 방번호로 방 찾기
      const room = emptyRoomOptions.value.find(r =>
        r.room_number === props.student.current_room!.room_number,
      )

      if (room) {
        form.value.room = room.value
        form.value.address = `${building.address} ${room.room_number}号室`
      }
    }
  } catch (err: any) {
    console.error('current_room 정보 설정 실패:', err)
  }
}

// 빌딩 선택 시 호실 목록 업데이트
const onBuildingChange = (buildingId: string) => {
  form.value.address = '' // 주소 초기화
  emptyRoomOptions.value = [] // 호실 목록 초기화
  form.value.room = '' // 방 선택 초기화

  if (buildingId)
    fetchEmptyRooms(buildingId)
}

// 호실 선택 시 주소 자동 입력
const onRoomChange = (roomId: string) => {
  const selectedRoom = emptyRoomOptions.value.find(room => room.value === roomId)
  if (selectedRoom) {
    const selectedBuilding = buildingOptions.value.find(building => building.value === form.value.building)
    if (selectedBuilding)
      form.value.address = `${selectedBuilding.address} ${selectedRoom.room_number}号室`
  }
}

onMounted(async () => {
  await fetchCompanies()
  await fetchGrades()
  await fetchBuildingOptions()
  await fetchResidenceCardHistory()

  // current_room 데이터가 있으면 우선 사용
  if (props.student.current_room)
    await setBuildingAndRoomFromCurrentRoom()
  // current_room_id가 있으면 건물과 방 자동 설정
  else if (props.student.current_room_id)
    await setBuildingAndRoomFromRoomId(props.student.current_room_id)
})

// student prop이 변경될 때마다 form 데이터 업데이트
watch(() => props.student, async newStudent => {
  form.value = {
    avatarImg: newStudent.avatar || avatar1,
    name: newStudent.name,
    name_katakana: newStudent.name_katakana,
    phone: newStudent.phone,
    facebook_name: newStudent.facebook_name,
    company: newStudent.company_id,
    assignment_date: newStudent.assignment_date,
    consultant: newStudent.consultant,
    gender: newStudent.gender,
    birth_date: newStudent.birth_date,
    nationality: newStudent.nationality,
    local_address: newStudent.local_address,
    address: newStudent.address,
    ward: newStudent.ward,
    building: '',
    room: newStudent.current_room_id || '',
    residence_card_number: newStudent.residence_card_number,
    residence_card_start: newStudent.residence_card_start,
    residence_card_expiry: newStudent.residence_card_expiry,
    resignation_date: newStudent.resignation_date,
    has_spouse: newStudent.has_spouse,
    experience_over_2_years: newStudent.experience_over_2_years,
    arrival_type: newStudent.arrival_type,
    japanese_level: newStudent.japanese_level,
    passport_number: newStudent.passport_number,
    passport_expiration_date: newStudent.passport_expiration_date,
    visa_application_date: newStudent.visa_application_date,
    visa_year: newStudent.visa_year,
    cooperation_submitted_date: newStudent.cooperation_submitted_date,
    cooperation_submitted_place: newStudent.cooperation_submitted_place,
    entry_date: newStudent.entry_date,
    pre_guidance_date: newStudent.pre_guidance_date,
    orientation_date: newStudent.orientation_date,
    certification_application_date: newStudent.certification_application_date,
    interview_date: newStudent.interview_date,
    student_type: newStudent.student_type,
    grade: newStudent.grade_id,
  }

  // current_room 데이터가 있으면 우선 사용
  if (newStudent.current_room)
    await setBuildingAndRoomFromCurrentRoom()
  // current_room_id가 있으면 건물과 방 자동 설정
  else if (newStudent.current_room_id)
    await setBuildingAndRoomFromRoomId(newStudent.current_room_id)
}, { deep: true })

// 아바타 이미지 변경
const changeAvatar = async (file: Event) => {
  const { files } = file.target as HTMLInputElement

  if (files && files.length) {
    try {
      loading.value = true
      error.value = null
      success.value = null

      // 파일 크기 체크 (800KB)
      if (files[0].size > 5 * 1024 * 1024) {
        error.value = 'ファイルサイズは5MBを超えることはできません。'

        return
      }

      // 파일 타입 체크
      const allowedTypes = ['image/jpg', 'image/jpeg', 'image/png', 'image/gif']
      if (!allowedTypes.includes(files[0].type)) {
        error.value = 'JPG、PNG、GIFファイルのみアップロード可能です。'

        return
      }

      const fileReader = new FileReader()

      fileReader.readAsDataURL(files[0])
      fileReader.onload = () => {
        if (typeof fileReader.result === 'string')
          form.value.avatarImg = fileReader.result
      }

      // API 호출
      const response = await studentService.uploadAvatar(props.student.id, files[0])
      success.value = 'プロフィール画像が正常にアップロードされました。'
    }
    catch (err: any) {
      error.value = err.response?.data?.message || '画像のアップロードに失敗しました。'
    }
    finally {
      loading.value = false
    }
  }
}

// 아바타 이미지 초기화
const resetAvatar = () => {
  form.value.avatarImg = avatar1
}

const _isResignationDate = () => {
  if (!form.value.resignation_date) return 'ACTIVE'

  const today = new Date()

  today.setHours(0, 0, 0, 0)

  const resignDay = new Date(form.value.resignation_date)

  if (resignDay > today)
    return 'PENDING_RESIGNATION'
  else
    return 'RESIGNED'
}

// 학생 정보 수정
const updateStudent = async () => {
  try {
    loading.value = true
    error.value = null
    success.value = null

    await studentService.updateStudent(props.student.id, {
      name: form.value.name,
      name_katakana: form.value.name_katakana,
      phone: form.value.phone,
      facebook_name: form.value.facebook_name,
      company_id: form.value.company,
      assignment_date: form.value.assignment_date || undefined,
      consultant: form.value.consultant,
      avatar: form.value.avatarImg,
      gender: form.value.gender,
      birth_date: form.value.birth_date,
      nationality: form.value.nationality,
      local_address: form.value.local_address,
      address: form.value.address || undefined,
      ward: form.value.ward || undefined,
      residence_card_number: form.value.residence_card_number || undefined,
      residence_card_start: form.value.residence_card_start || undefined,
      residence_card_expiry: form.value.residence_card_expiry || undefined,
      resignation_date: form.value.resignation_date || undefined,
      has_spouse: form.value.has_spouse,
      experience_over_2_years: form.value.experience_over_2_years,
      arrival_type: form.value.arrival_type,
      japanese_level: form.value.japanese_level,
      passport_number: form.value.passport_number,
      passport_expiration_date: form.value.passport_expiration_date || undefined,
      visa_application_date: form.value.visa_application_date || undefined,
      visa_year: form.value.visa_year || undefined,
      cooperation_submitted_date: form.value.cooperation_submitted_date || undefined,
      cooperation_submitted_place: form.value.cooperation_submitted_place || undefined,
      entry_date: form.value.entry_date || undefined,
      pre_guidance_date: form.value.pre_guidance_date || undefined,
      orientation_date: form.value.orientation_date || undefined,
      certification_application_date: form.value.certification_application_date || undefined,
      interview_date: form.value.interview_date || undefined,
      student_type: form.value.student_type,
      grade_id: form.value.grade || undefined,
    })

    success.value = '学生情報が正常に修正されました。'
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  catch (err: any) {
    error.value = err.response?.data?.message || '学生情報の修正に失敗しました。'
  }
  finally {
    loading.value = false
  }
}
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

        <!-- 성공 메시지 -->
        <VCol
          v-if="success"
          cols="12"
        >
          <VAlert
            type="success"
            variant="tonal"
            class="mb-3"
          >
            {{ success }}
          </VAlert>
        </VCol>

        <!-- 아바타 섹션 -->
        <VCol cols="12">
          <div class="d-flex align-center gap-6">
            <!-- 아바타 이미지 -->
            <VAvatar
              rounded="lg"
              size="100"
              :image="form.avatarImg"
            />

            <!-- 아바타 업로드 폼 -->
            <form class="d-flex flex-column justify-center gap-5">
              <div class="d-flex flex-wrap gap-2">
                <VBtn
                  color="primary"
                  @click="refInputEl?.click()"
                >
                  <VIcon
                    icon="ri-upload-cloud-line"
                    class="d-sm-none"
                  />
                  <span class="d-none d-sm-block">新しい写真をアップロード</span>
                </VBtn>

                <input
                  ref="refInputEl"
                  type="file"
                  name="file"
                  accept=".jpeg,.png,.jpg,.gif"
                  hidden
                  @input="changeAvatar"
                >

                <VBtn
                  type="reset"
                  color="error"
                  variant="outlined"
                  @click="resetAvatar"
                >
                  <span class="d-none d-sm-block">リセット</span>
                  <VIcon
                    icon="ri-refresh-line"
                    class="d-sm-none"
                  />
                </VBtn>
              </div>

              <p class="text-body-1 mb-0">
                JPG、GIF、PNGファイルのみ可能です。最大800KB
              </p>
            </form>
          </div>
        </VCol>

        <!-- 필수항목 섹션 -->
        <VCol cols="12">
          <VCard variant="outlined" class="pa-4 mb-6">
            <VCardTitle class="text-h6 text-primary">
              <VIcon class="me-2">ri-asterisk</VIcon>
              必須項目
            </VCardTitle>
            <VRow>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.nationality"
                  :items="nationalityOptions"
                  item-title="title"
                  item-value="value"
                  label="国籍"
                  placeholder="国籍を選択してください"
                  :disabled="loading"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.student_type"
                  :items="[
                    { title: '特定技能', value: 'SPECIFIED' },
                    { title: '技能実習', value: 'GENERAL' },
                  ]"
                  item-title="title"
                  item-value="value"
                  label="学生タイプ"
                  placeholder="学生タイプを選択してください"
                  :disabled="loading"
                />
              </VCol>

              <!-- 생년월일 -->
              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.birth_date"
                  label="生年月日"
                  type="date"
                  :disabled="loading"
                />
              </VCol>

              <!-- 이름 -->
              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.name"
                  label="名前"
                  placeholder="名前を入力してください"
                  :disabled="loading"
                />
              </VCol>

              <!-- 카타카나 -->
              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.name_katakana"
                  label="カタカナ"
                  placeholder="カタカナを入力してください"
                  :disabled="loading"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.japanese_level"
                  :items="['N1', 'N2', 'N3', 'N4']"
                  label="日本語レベル"
                  placeholder="日本語レベルを選択してください"
                  :disabled="loading"
                />
              </VCol>
            </VRow>
          </VCard>
        </VCol>

        <!-- 재류카드 섹션 -->
        <VCol cols="12">
          <VCard variant="outlined" class="pa-4 mb-6">
            <VCardTitle class="text-h6 text-info d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <VIcon class="me-2">ri-id-card-line</VIcon>
                在留カード情報
              </div>
              <VBtn
                color="primary"
                size="small"
                @click="showResidenceCardDialog = true"
              >
                <VIcon class="me-2">ri-add-line</VIcon>
                追加
              </VBtn>
            </VCardTitle>
            <VRow>
              <VCol cols="12" md="6">
                <div class="d-flex flex-column">
                  <span class="text-caption text-medium-emphasis mb-1">在留番号</span>
                  <span class="text-body-1">{{ form.residence_card_number || '-' }}</span>
                </div>
              </VCol>

              <VCol cols="12" md="6">
                <div class="d-flex flex-column">
                  <span class="text-caption text-medium-emphasis mb-1">在留番号発行日</span>
                  <span class="text-body-1">{{ formatDate(form.residence_card_start) }}</span>
                </div>
              </VCol>

              <VCol cols="12" md="6">
                <div class="d-flex flex-column">
                  <span class="text-caption text-medium-emphasis mb-1">在留番号有効期限</span>
                  <span class="text-body-1">{{ formatDate(form.residence_card_expiry) }}</span>
                </div>
              </VCol>


              <VCol cols="12" md="6">
                <div class="d-flex flex-column">
                  <span class="text-caption text-medium-emphasis mb-1">ビザ申請日</span>
                  <span class="text-body-1">{{ formatDate(form.visa_application_date) }}</span>
                </div>
              </VCol>

              <VCol cols="12" md="6">
                <div class="d-flex flex-column">
                  <span class="text-caption text-medium-emphasis mb-1">ビザ年目</span>
                  <span class="text-body-1">{{ form.visa_year ? `${form.visa_year}年目` : '-' }}</span>
                </div>
              </VCol>
            </VRow>

            <!-- 재류카드 히스토리 토글 -->
            <VDivider class="my-6" />
            <VCardTitle 
              class="text-h6 text-warning d-flex align-center justify-space-between cursor-pointer"
              @click="showResidenceCardHistory = !showResidenceCardHistory"
            >
              <div class="d-flex align-center">
                <VIcon class="me-2">ri-history-line</VIcon>
                在留カード変更履歴
              </div>
              <VIcon 
                :icon="showResidenceCardHistory ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'"
                class="transition-transform"
                size="40"
              />
            </VCardTitle>
            
            <!-- 재류카드 히스토리 테이블 -->
            <VExpandTransition>
              <div v-show="showResidenceCardHistory">
                <VTable>
                  <thead>
                    <tr>
                      <th>在留番号</th>
                      <th>年次</th>
                      <th>発行日</th>
                      <th>有効期限</th>
                      <th>登録日</th>
                      <th>備考</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="history in residenceCardHistory"
                      :key="history.id"
                    >
                      <td>{{ history.card_number }}</td>
                      <td>{{ history.year ? `${history.year}年目` : '-' }}</td>
                      <td>{{ formatDate(history.start_date) }}</td>
                      <td>{{ formatDate(history.expiry_date) }}</td>
                      <td>{{ formatDate(history.registered_at) }}</td>
                      <td>{{ history.note || '-' }}</td>
                    </tr>
                    <tr v-if="residenceCardHistory.length === 0">
                      <td colspan="6" class="text-center text-medium-emphasis">
                        変更履歴がありません
                      </td>
                    </tr>
                  </tbody>
                </VTable>
              </div>
            </VExpandTransition>
          </VCard>
        </VCol>

        <!-- 일반항목 섹션 -->
        <VCol cols="12">
          <VCard variant="outlined" class="pa-4 mb-6">
            <VCardTitle class="text-h6">
              <VIcon class="me-2">ri-file-text-line</VIcon>
              一般項目
            </VCardTitle>
            <VRow>
              <!-- 성별 -->
              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.gender"
                  :items="['女', '男']"
                  label="性別"
                  placeholder="性別を選択してください"
                  :disabled="loading"
                />
              </VCol>

              <!-- 전화번호 -->
              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.phone"
                  label="連絡先"
                  type="phone"
                  placeholder="連絡先を入力してください"
                  :disabled="loading"
                />
              </VCol>

              <!-- 페이스북 이름 -->
              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.facebook_name"
                  label="フェイスブック名"
                  placeholder="フェイスブック名を入力してください"
                  :disabled="loading"
                />
              </VCol>

              <!-- 입사 일 -->
              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.assignment_date"
                  label="入社日"
                  type="date"
                  placeholder="入社日を入力してください"
                  :disabled="loading"
                />
              </VCol>

              <!-- 회사 -->
              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.company"
                  :items="companies"
                  item-title="name"
                  item-value="id"
                  label="会社"
                  placeholder="会社を選択してください"
                  :disabled="loading"
                />
              </VCol>

              <!-- 期生 -->
              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.grade"
                  :items="grades"
                  item-title="name"
                  item-value="id"
                  label="期生"
                  placeholder="期生を選択してください"
                  :disabled="loading"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.ward"
                  label="病棟"
                  placeholder="病棟を入力してください"
                  :disabled="loading"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.local_address"
                  label="在留住所"
                  variant="outlined"
                  :disabled="loading"
                />
              </VCol>

              <!-- 빌딩 선택 -->
              <!-- <VCol cols="12" md="6">
                <VSelect
                  v-model="form.building"
                  :items="buildingOptions"
                  item-title="label"
                  item-value="value"
                  label="建物"
                  placeholder="建物を選択してください"
                  readonly
                  @update:model-value="onBuildingChange"
                >
                </VSelect>
              </VCol> -->

              <!-- 호실 선택 -->
              <!-- <VCol cols="12" md="6">
                <VSelect
                  v-model="form.room"
                  :items="emptyRoomOptions"
                  item-title="label"
                  item-value="value"
                  label="部屋選択"
                  placeholder="部屋を選択してください"
                  readonly
                  @update:model-value="onRoomChange"
                >
                </VSelect>
              </VCol> -->

              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.address"
                  label="現地住所"
                  variant="outlined"
                  :disabled="loading"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.entry_date"
                  label="入国日"
                  type="date"
                  :disabled="loading"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.pre_guidance_date"
                  label="ガイダンス日"
                  type="date"
                  :disabled="loading"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.orientation_date"
                  label="オリエンテーション日"
                  type="date"
                  :disabled="loading"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.certification_application_date"
                  label="認定申請日"
                  type="date"
                  :disabled="loading"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.interview_date"
                  label="面接日"
                  type="date"
                  :disabled="loading"
                />
              </VCol>

              <!-- 상담 횟수 (읽기 전용) -->
              <VCol cols="12" md="6">
                <VTextField
                  :model-value="form.consultant"
                  label="相談回数"
                  variant="outlined"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.passport_number"
                  label="パスポート番号"
                  placeholder="パスポート番号を入力してください"
                  :disabled="loading"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.passport_expiration_date"
                  label="パスポート期限"
                  variant="outlined"
                  type="date"
                  :disabled="loading"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.has_spouse"
                  :items="[
                    { title: 'あり', value: true },
                    { title: 'なし', value: false },
                  ]"
                  item-title="title"
                  item-value="value"
                  label="配偶者同伴"
                  placeholder="配偶者同伴の有無を選択してください"
                  :disabled="loading"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.experience_over_2_years"
                  :items="[
                    { title: 'あり', value: true },
                    { title: 'なし', value: false },
                  ]"
                  item-title="title"
                  item-value="value"
                  label="2年以上の経験"
                  placeholder="2年以上の経験の有無を選択してください"
                  :disabled="loading"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.arrival_type"
                  :items="[
                    { title: '船舶', value: 'SHIP' },
                    { title: '飛行機', value: 'FLIGHT' },
                  ]"
                  item-title="title"
                  item-value="value"
                  label="入国方法"
                  placeholder="入国方法を選択してください"
                  :disabled="loading"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.cooperation_submitted_date"
                  label="協力確認書提出日"
                  type="date"
                  placeholder="協力確認書提出日を選択してください"
                  :disabled="loading"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.cooperation_submitted_place"
                  label="協力確認書提出先"
                  placeholder="協力確認書提出先を入力してください"
                  :disabled="loading"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.resignation_date"
                  label="退職日"
                  type="date"
                  placeholder="退職日を入力してください"
                  :disabled="loading"
                  color="error"
                  variant="outlined"
                  class="resignation-date-field"
                />
              </VCol>
            </VRow>
          </VCard>
        </VCol>

        <!-- 저장 버튼 -->
        <VCol cols="12">
          <VBtn
            color="primary"
            :loading="loading"
            @click="updateStudent"
          >
            保存
          </VBtn>
        </VCol>
      </VRow>
    </VCardText>
  </VCard>

  <!-- 재류카드 추가 다이얼로그 -->
  <VDialog
    v-model="showResidenceCardDialog"
    max-width="600px"
    persistent
  >
    <VCard>
      <VCardTitle class="text-h6">
        <VIcon class="me-2">ri-add-line</VIcon>
        在留カード情報追加
      </VCardTitle>
      
      <VCardText>
        <VRow>
          <VCol cols="12" md="6">
            <VTextField
              v-model="residenceCardForm.residence_card_number"
              label="在留番号 *"
              placeholder="在留番号を入力してください"
              :disabled="loading"
              :error="residenceCardErrors.residence_card_number"
              :error-messages="residenceCardErrors.residence_card_number ? '在留番号を入力してください' : ''"
              required
            />
          </VCol>

          <VCol cols="12" md="6">
            <VTextField
              v-model="residenceCardForm.residence_card_start"
              label="発行日 *"
              type="date"
              :disabled="loading"
              :error="residenceCardErrors.residence_card_start"
              :error-messages="residenceCardErrors.residence_card_start ? '発行日を入力してください' : ''"
              required
            />
          </VCol>

          <VCol cols="12" md="6">
            <VTextField
              v-model="residenceCardForm.residence_card_expiry"
              label="有効期限 *"
              type="date"
              :disabled="loading"
              :error="residenceCardErrors.residence_card_expiry"
              :error-messages="residenceCardErrors.residence_card_expiry ? '有効期限を入力してください' : ''"
              required
            />
          </VCol>

          <VCol cols="12" md="6">
            <VTextField
              v-model="residenceCardForm.visa_application_date"
              label="ビザ申請日 *"
              type="date"
              :disabled="loading"
              :error="residenceCardErrors.visa_application_date"
              :error-messages="residenceCardErrors.visa_application_date ? 'ビザ申請日を入力してください' : ''"
              required
            />
          </VCol>

          <VCol cols="12" md="6">
            <VSelect
              v-model="residenceCardForm.year"
              :items="[
                { title: '1年目', value: '1' },
                { title: '2年目', value: '2' },
                { title: '3年目', value: '3' },
                { title: '4年目', value: '4' },
                { title: '5年目', value: '5' },
              ]"
              item-title="title"
              item-value="value"
              label="年次 *"
              placeholder="年次を選択してください"
              :disabled="loading"
              :error="residenceCardErrors.year"
              :error-messages="residenceCardErrors.year ? '年次を選択してください' : ''"
              required
            />
          </VCol>

          <VCol cols="12">
            <VTextField
              v-model="residenceCardForm.note"
              label="備考"
              placeholder="備考を入力してください"
              :disabled="loading"
              variant="outlined"
              rows="3"
            />
          </VCol>
        </VRow>
      </VCardText>

      <VCardActions>
        <VSpacer />
        <VBtn
          color="grey-darken-1"
          variant="text"
          :disabled="loading"
          @click="showResidenceCardDialog = false"
        >
          キャンセル
        </VBtn>
        <VBtn
          color="primary"
          :loading="loading"
          :disabled="!isResidenceCardFormValid"
          @click="addResidenceCard"
        >
          追加
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
/* 기본 상태에서도 진한 색상 유지 */
.resignation-date-field :deep(.v-field__outline) {
  border-color: #d32f2f !important;
  color: red !important;
}

.resignation-date-field :deep(.v-field__outline__start) {
  border-color: #d32f2f !important;
}

.resignation-date-field :deep(.v-field__outline__end) {
  border-color: #d32f2f !important;
}

.resignation-date-field :deep(.v-field__outline__notch) {
  border-color: #d32f2f !important;
}

.resignation-date-field :deep(.v-field__outline__notch::before) {
  border-color: #d32f2f !important;
}

.resignation-date-field :deep(.v-field__outline__notch::after) {
  border-color: #d32f2f !important;
}

/* 포커스 상태에서도 동일한 색상 유지 */
.resignation-date-field :deep(.v-field--focused .v-field__outline) {
  border-color: #d32f2f !important;
}

.resignation-date-field :deep(.v-field--focused .v-field__outline__start) {
  border-color: #d32f2f !important;
}

.resignation-date-field :deep(.v-field--focused .v-field__outline__end) {
  border-color: #d32f2f !important;
}

.resignation-date-field :deep(.v-field--focused .v-field__outline__notch) {
  border-color: #d32f2f !important;
}

.resignation-date-field :deep(.v-field--focused .v-field__outline__notch::before) {
  border-color: #d32f2f !important;
}

.resignation-date-field :deep(.v-field--focused .v-field__outline__notch::after) {
  border-color: #d32f2f !important;
}
.resignation-date-field :deep(.v-field) {
  color: red !important;
}

/* 호버 상태에서도 진한 색상 유지 */
.resignation-date-field :deep(.v-field:hover .v-field__outline) {
  border-color: #d32f2f !important;
}

.resignation-date-field :deep(.v-field:hover .v-field__outline__start) {
  border-color: #d32f2f !important;
}

.resignation-date-field :deep(.v-field:hover .v-field__outline__end) {
  border-color: #d32f2f !important;
}

.resignation-date-field :deep(.v-field:hover .v-field__outline__notch) {
  border-color: #d32f2f !important;
}

.resignation-date-field :deep(.v-field:hover .v-field__outline__notch::before) {
  border-color: #d32f2f !important;
}

.resignation-date-field :deep(.v-field:hover .v-field__outline__notch::after) {
  border-color: #d32f2f !important;
}
</style>
