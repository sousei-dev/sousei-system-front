<script lang="ts" setup>
import { buildingService, type BuildingOption, type EmptyRoomOption } from '@/services/building';
import { companyService, type Company } from '@/services/company';
import { gradeService, type Grade } from '@/services/grade';
import { studentService, type Student } from '@/services/student';
import avatar1 from '@images/avatars/avatar-1.png';
import { onMounted, ref, watch } from 'vue';

const props = defineProps<{
  student: Student
}>()

const form = ref({
  avatarImg: props.student.avatar || avatar1,
  name: props.student.name,
  name_katakana: props.student.name_katakana,
  phone: props.student.phone,
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
  cooperation_submitted_date: props.student.cooperation_submitted_date,
  cooperation_submitted_place: props.student.cooperation_submitted_place,
  experience_over_2_years: props.student.experience_over_2_years,
  arrival_type: props.student.arrival_type,
  entry_date: props.student.entry_date,
  pre_guidance_date: props.student.pre_guidance_date,
  orientation_date: props.student.orientation_date,
  certification_application_date: props.student.certification_application_date,
  student_type: props.student.student_type,
})

const loading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const refInputEl = ref<HTMLElement>()
const companies = ref<Company[]>([])
const grades = ref<Grade[]>([])
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
      b.label.includes(props.student.current_room!.building_name)
    )
    
    if (building) {
      // 건물 설정
      form.value.building = building.value
      
      // 해당 빌딩의 빈 호실 조회
      await fetchEmptyRooms(building.value)
      
      // 방번호로 방 찾기
      const room = emptyRoomOptions.value.find(r => 
        r.room_number === props.student.current_room!.room_number
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

onMounted(async () => {
  await fetchCompanies()
  await fetchGrades()
  await fetchBuildingOptions()
  
  // current_room 데이터가 있으면 우선 사용
  if (props.student.current_room) {
    await setBuildingAndRoomFromCurrentRoom()
  }
  // current_room_id가 있으면 건물과 방 자동 설정
  else if (props.student.current_room_id) {
    await setBuildingAndRoomFromRoomId(props.student.current_room_id)
  }
})

// student prop이 변경될 때마다 form 데이터 업데이트
watch(() => props.student, async (newStudent) => {
  form.value = {
    avatarImg: newStudent.avatar || avatar1,
    name: newStudent.name,
    name_katakana: newStudent.name_katakana,
    phone: newStudent.phone,
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
    cooperation_submitted_date: newStudent.cooperation_submitted_date,
    cooperation_submitted_place: newStudent.cooperation_submitted_place,
    entry_date: newStudent.entry_date,
    pre_guidance_date: newStudent.pre_guidance_date,
    orientation_date: newStudent.orientation_date,
    certification_application_date: newStudent.certification_application_date,
    student_type: newStudent.student_type,
  }
  
  // current_room 데이터가 있으면 우선 사용
  if (newStudent.current_room) {
    await setBuildingAndRoomFromCurrentRoom()
  }
  // current_room_id가 있으면 건물과 방 자동 설정
  else if (newStudent.current_room_id) {
    await setBuildingAndRoomFromRoomId(newStudent.current_room_id)
  }
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

      // API 호출
      const response = await studentService.uploadAvatar(props.student.id, files[0])
        
      // 성공 시 이미지 업데이트
      form.value.avatarImg = response.avatar
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

const isResignationDate = () => {
  if (!form.value.resignation_date) return 'ACTIVE'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const resignDay = new Date(form.value.resignation_date)
  
  if (resignDay > today) {
    return 'PENDING_RESIGNATION'
  } else {
    return 'RESIGNED'
  }
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
      cooperation_submitted_date: form.value.cooperation_submitted_date || undefined,
      cooperation_submitted_place: form.value.cooperation_submitted_place || undefined,
      entry_date: form.value.entry_date || undefined,
      pre_guidance_date: form.value.pre_guidance_date || undefined,
      orientation_date: form.value.orientation_date || undefined,
      certification_application_date: form.value.certification_application_date || undefined,
      student_type: form.value.student_type,
    })

    success.value = '学生情報が正常に修正されました。'
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
              { title: '技能実習', value: 'GENERAL' }
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

        <VCol cols="12" md="6">
          <VTextField
            v-model="form.resignation_date"
            label="退職日"
            type="date"
            placeholder="退職日を入力してください"
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

        <!-- 입국 일 -->
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

        <!-- 빌딩 선택 -->
        <VCol cols="12" md="6">
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
        </VCol>

        <!-- 호실 선택 -->
        <VCol cols="12" md="6">
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
            v-model="form.local_address"
            label="国籍の本住所"
            variant="outlined"
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
          <VSelect
            v-model="form.japanese_level"
            :items="['N1', 'N2', 'N3', 'N4']"
            label="日本語レベル"
            placeholder="日本語レベルを選択してください"
            :disabled="loading"
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
</template>
