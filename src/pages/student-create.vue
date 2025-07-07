<script lang="ts" setup>
import { buildingService, type BuildingOption, type EmptyRoomOption } from '@/services/building';
import { companyService, type Company } from '@/services/company';
import { studentService } from '@/services/student';
import avatar1 from '@images/avatars/avatar-1.png';
import { computed, onMounted, ref } from 'vue';

const router = useRouter()
const refInputEl = ref<HTMLElement>()

const form = ref({
  avatarImg: avatar1,
  // 필수항목
  name: '',
  name_katakana: '',
  birth_date: '',
  nationality: '',
  japanese_level: '',
  student_type: '',
  // 일반항목
  email: '',
  phone: '',
  company: '',
  assignment_date: '',
  consultant: 0,
  gender: '',
  local_address: '',
  address: '',
  ward: '',
  building: '',
  room: '',
  residence_card_number: '',
  residence_card_start: '',
  residence_card_expiry: '',
  has_spouse: false,
  passport_number: '',
  cooperation_submitted_date: '',
  cooperation_submitted_place: '',
  experience_over_2_years: false,
  arrival_type: '',
  entry_date: '',
  pre_guidance_date: '',
  orientation_date: '',
  certification_application_date: '',
  interview_date: '',
})

const loading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const companies = ref<Company[]>([])
const buildingOptions = ref<BuildingOption[]>([])
const emptyRoomOptions = ref<EmptyRoomOption[]>([])

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
    companies.value.unshift({ id: null, name: '未定' })
  }
  catch (err: any) {
    error.value = err.response?.data?.message || '会社リストの取得に失敗しました。'
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

// 빌딩 선택 시 호실 목록 업데이트
const onBuildingChange = (buildingId: string) => {
  form.value.address = ''
  emptyRoomOptions.value = []
  form.value.room = ''
  
  if (buildingId) {
    fetchEmptyRooms(buildingId)
  }
}

// 호실 선택 시 주소 자동 입력
const onRoomChange = (roomId: string) => {
  const selectedRoom = emptyRoomOptions.value.find(room => room.value === roomId)
  if (selectedRoom) {
    const selectedBuilding = buildingOptions.value.find(building => building.value === form.value.building)
    if (selectedBuilding) {
      form.value.address = `${selectedBuilding.address} ${selectedRoom.room_number}号室`
    }
  }
}

// 아바타 이미지 변경
const changeAvatar = async (file: Event) => {
  const { files } = file.target as HTMLInputElement

  if (files && files.length) {
    try {
      // 파일 크기 체크 (5MB)
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
    }
    catch (err: any) {
      error.value = err.response?.data?.message || '画像のアップロードに失敗しました。'
    }
  }
}

// 아바타 이미지 초기화
const resetAvatar = () => {
  form.value.avatarImg = avatar1
}

// 필수항목 검증
const isFormValid = computed(() => {
  return !!(
    form.value.name &&
    form.value.name_katakana &&
    form.value.birth_date &&
    form.value.nationality &&
    form.value.japanese_level &&
    form.value.student_type
  )
})

onMounted(() => {
  fetchCompanies()
  fetchBuildingOptions()
})

// 학생 정보 생성
const createStudent = async () => {
  try {
    loading.value = true
    error.value = null
    success.value = null

    await studentService.createStudent({
      name: form.value.name,
      name_katakana: form.value.name_katakana,
      email: form.value.email,
      phone: form.value.phone,
      consultant: form.value.consultant,
      assignment_date: form.value.assignment_date,
      company_id: form.value.company,
      avatar: form.value.avatarImg,
      gender: form.value.gender,
      birth_date: form.value.birth_date,
      nationality: form.value.nationality,
      local_address: form.value.local_address,
      address: form.value.address || '',
      ward: form.value.ward || '',
      residence_card_number: form.value.residence_card_number || '',
      residence_card_start: form.value.residence_card_start || '',
      residence_card_expiry: form.value.residence_card_expiry || '',
      has_spouse: form.value.has_spouse,
      experience_over_2_years: form.value.experience_over_2_years,
      arrival_type: form.value.arrival_type,
      japanese_level: form.value.japanese_level,
      passport_number: form.value.passport_number,
      cooperation_submitted_date: form.value.cooperation_submitted_date || '',
      cooperation_submitted_place: form.value.cooperation_submitted_place || '',
      entry_date: form.value.entry_date || '',
      pre_guidance_date: form.value.pre_guidance_date || '',
      orientation_date: form.value.orientation_date || '',
      certification_application_date: form.value.certification_application_date || '',
      student_type: form.value.student_type,
    })

    success.value = '学生情報が正常に作成されました。'
    router.push('/student-list')
  }
  catch (err: any) {
    error.value = err.response?.data?.message || '学生情報の作成に失敗しました。'
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
                JPG、GIF、PNGファイルのみ可能です。最大5MB
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
                  label="国籍 *"
                  placeholder="国籍を選択してください"
                  :disabled="loading"
                  :rules="[v => !!v || '国籍は必須項目です']"
                  required
                />
              </VCol>

              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.student_type"
                  :items="[
                    { title: '特定技能', value: 'SPECIFIED' },
                    { title: '技能実習', value: 'GENERAL' }
                  ]"
                  item-title="title"
                  item-value="value"
                  label="学生タイプ *"
                  placeholder="学生タイプを選択してください"
                  :disabled="loading"
                  :rules="[v => !!v || '学生タイプは必須項目です']"
                  required
                />
              </VCol>

              <!-- 생년월일 -->
              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.birth_date"
                  label="生年月日 *"
                  type="date"
                  :disabled="loading"
                  :rules="[v => !!v || '生年月日は必須項目です']"
                  required
                />
              </VCol>

              <!-- 이름 -->
              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.name"
                  label="名前 *"
                  placeholder="名前を入力してください"
                  :disabled="loading"
                  :rules="[v => !!v || '名前は必須項目です']"
                  required
                />
              </VCol>

              <!-- 카타카나 -->
              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.name_katakana"
                  label="カタカナ *"
                  placeholder="カタカナを入力してください"
                  :disabled="loading"
                  :rules="[v => !!v || 'カタカナは必須項目です']"
                  required
                />
              </VCol>

              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.japanese_level"
                  :items="['N1', 'N2', 'N3', 'N4']"
                  label="日本語レベル *"
                  placeholder="日本語レベルを選択してください"
                  :disabled="loading"
                  :rules="[v => !!v || '日本語レベルは必須項目です']"
                  required
                />
              </VCol>
            </VRow>
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
              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.building"
                  :items="buildingOptions"
                  item-title="label"
                  item-value="value"
                  label="建物"
                  placeholder="建物を選択してください"
                  :disabled="loading"
                  @update:model-value="onBuildingChange"
                >
                </VSelect>
              </VCol>

              <!-- 호실 선택 -->
              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.room"
                  :items="emptyRoomOptions"
                  item-title="label"
                  item-value="value"
                  label="部屋"
                  placeholder="部屋を選択してください"
                  :disabled="loading || !form.building"
                  @update:model-value="onRoomChange"
                >
                </VSelect>
              </VCol>

              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.address"
                  label="現地住所"
                  variant="outlined"
                  :disabled="loading"
                  readonly
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
                  v-model="form.residence_card_number"
                  label="在留番号"
                  variant="outlined"
                  :disabled="loading"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.residence_card_start"
                  label="在留番号発行日"
                  type="date"
                  variant="outlined"
                  :disabled="loading"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.residence_card_expiry"
                  label="在留番号有効期限"
                  variant="outlined"
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
                <VSelect
                  v-model="form.has_spouse"
                  :items="[
                    { title: 'あり', value: true },
                    { title: 'なし', value: false }
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
                    { title: 'なし', value: false }
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
                    { title: '飛行機', value: 'FLIGHT' }
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
            </VRow>
          </VCard>
        </VCol>

        <!-- 저장 버튼 -->
        <VCol cols="12">
          <VBtn
            color="primary"
            :loading="loading"
            :disabled="!isFormValid"
            @click="createStudent"
          >
            保存
          </VBtn>
        </VCol>
      </VRow>
    </VCardText>
  </VCard>
</template>
