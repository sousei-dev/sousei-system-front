<script setup lang="ts">
import { defineProps, nextTick } from 'vue'

const props = defineProps({
  residents: Array,
  daysInMonth: Array,
  getMealRecord: Function,
  updateMealRecord: Function,
})

const scrollToToday = () => {
  const tableContainer = document.querySelector('.v-table__wrapper')
  if (tableContainer) {
    const todayIndex = props.daysInMonth.findIndex(day => day.isToday)
    if (todayIndex >= 0) {

      const ths = tableContainer.querySelectorAll('th')
      const targetTh = ths[todayIndex] as HTMLElement
      if (targetTh) {
        tableContainer.scrollTo({
          left: targetTh.offsetLeft - 150, // 이름 컬럼 너비만큼 보정
          behavior: 'smooth'
        })
      }
    }
  }
}

onMounted(() => {
  // 오늘 날짜로 스크롤
  nextTick(() => {
    scrollToToday()
  })
})
</script>

<template>
  <div class="table-container">
    <VTable class="meal-record-table" density="compact">
      <thead>
        <tr>
          <th v-for="header in [
            { title: '名前', key: 'name', fixed: true, width: '150px' },
            { title: '部屋番号', key: 'room_number', fixed: false, width: '100px' },
            { title: '年齢', key: 'age', fixed: false, width: '80px' },
            { title: '性別', key: 'gender', fixed: false, width: '80px' },
            ...props.daysInMonth.map(day => ({
              title: `${day.day}日(${day.dayOfWeek})`,
              key: `date_${day.date}`,
              width: '120px',
              date: day.date,
              isToday: day.isToday,
            }))
          ]"
          :key="header.key"
          :style="{ width: header.width, minWidth: header.width }"
          :class="{ 'fixed-column': header.fixed, 'today-column': header.isToday }"
          >
            <div class="d-flex flex-column align-center">
              <span class="text-caption">{{ header.title }}</span>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="resident in props.residents" :key="resident.id">
          <td class="fixed-column">
            <div class="d-flex align-center">
              <VAvatar size="32" class="me-2" :color="resident.gender === 'male' ? 'primary' : 'secondary'">
                <VIcon>{{ resident.gender === 'male' ? 'ri-user-line' : 'ri-user-line' }}</VIcon>
              </VAvatar>
              <span class="font-weight-medium">{{ resident.name }}</span>
            </div>
          </td>
          <td class="text-center">{{ resident.room_number }}</td>
          <td class="text-center">{{ resident.age }}歳</td>
          <td class="text-center">{{ resident.gender === 'male' ? '男性' : '女性' }}</td>
          <td v-for="day in props.daysInMonth" :key="`${resident.id}_${day.date}`" :class="{ 'today-column': day.isToday }">
            <div class="d-flex flex-column gap-1">
              <div class="d-flex align-center justify-space-between">
                <span class="text-caption">朝食:</span>
                <VBtn :color="props.getMealRecord(resident.id, day.date, 'breakfast') ? 'error' : 'default'" variant="text" size="small" class="meal-btn" @click="props.updateMealRecord(resident.id, day.date, 'breakfast', !props.getMealRecord(resident.id, day.date, 'breakfast'))">
                  <span v-if="props.getMealRecord(resident.id, day.date, 'breakfast')" class="meal-x">✕</span>
                  <span v-else class="meal-o">○</span>
                </VBtn>
              </div>
              <div class="d-flex align-center justify-space-between">
                <span class="text-caption">昼食:</span>
                <VBtn :color="props.getMealRecord(resident.id, day.date, 'lunch') ? 'error' : 'default'" variant="text" size="small" class="meal-btn" @click="props.updateMealRecord(resident.id, day.date, 'lunch', !props.getMealRecord(resident.id, day.date, 'lunch'))">
                  <span v-if="props.getMealRecord(resident.id, day.date, 'lunch')" class="meal-x">✕</span>
                  <span v-else class="meal-o">○</span>
                </VBtn>
              </div>
              <div class="d-flex align-center justify-space-between">
                <span class="text-caption">夕食:</span>
                <VBtn :color="props.getMealRecord(resident.id, day.date, 'dinner') ? 'error' : 'default'" variant="text" size="small" class="meal-btn" @click="props.updateMealRecord(resident.id, day.date, 'dinner', !props.getMealRecord(resident.id, day.date, 'dinner'))">
                  <span v-if="props.getMealRecord(resident.id, day.date, 'dinner')" class="meal-x">✕</span>
                  <span v-else class="meal-o">○</span>
                </VBtn>
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </VTable>
  </div>
</template>

<style lang="scss" scoped>
.table-container {
  overflow-x: scroll; // 항상 스크롤바 표시
  border-radius: 8px;
  border: 1px solid rgb(var(--v-border-color));
}

.meal-record-table {
  min-width: 100%;
  
  th, td {
    border: 1px solid rgb(var(--v-border-color));
    padding: 8px;
    text-align: center;
    vertical-align: middle;
    color: #222 !important;
    font-weight: 500 !important;
    font-size: 15px;
  }
  
  // 헤더 고정
  thead {
    position: sticky;
    top:0;
    z-index:2; 
    background-color: rgb(var(--v-theme-surface));
  }
  
  .fixed-column {
    position: sticky;
    left:0;  
    background-color: rgb(var(--v-theme-surface));
    z-index: 1;
    border-right:2px solid rgb(var(--v-border-color));
  }
  
  .today-column {
    background-color: rgba(var(--v-theme-primary), 0.1);
  }
  
  .meal-btn {
    min-width: 32px !important;
    width: 32px !important;
    height: 32px !important;
    padding: 0 !important;
    margin: 0;
    
    :deep(.v-btn__content) {
      font-size: 16px;
      font-weight: bold;
      
      .meal-x {
        color: #d32f2f !important;
        font-weight: bold;
        text-shadow: 0 0 1px #d32f2f;
      }
      .meal-o {
        color: #333 !important;
        font-weight: bold;
        text-shadow: 0 0 1px #333;
      }
    }
  }
  
  // 캡션 등도 선명하게
  .text-caption {
    color: #222 !important;
    font-weight: 500 !important;
    font-size: 14px !important;
  }
}

// 스크롤바 스타일링
.table-container::-webkit-scrollbar {
  height: 12px;
  background: #eee;
}

.table-container::-webkit-scrollbar-track {
  background: #eee;
  border-radius: 6px;
}

.table-container::-webkit-scrollbar-thumb {
  background: #bdbdbd;
  border-radius: 6px;
  border: 2px solid #eee;
}

.table-container::-webkit-scrollbar-thumb:hover {
  background: #888;
}
</style> 