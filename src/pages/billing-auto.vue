<script lang="ts" setup>
import dayjs from 'dayjs'

// 더미 학생 정보
const student = {
  name: 'マスター',
  company: '株式会社テスト  そごもいテスト',
  entryDate: '2025-01-01',
}

// 청구 항목 및 단가 (사진 기준)
const billingItems = [
  { name: '日本語学費 N4', unit: 300000 },
  { name: '日本語学費 N3', unit: 400000 },
  { name: '日本語学費 N2', unit: 600000 },
  { name: '実務経験2年未満', unit: 50000 },
  { name: '実務経験2年以上', unit: 100000 },
  { name: '事前ガイダンス', unit: 30000 },
  { name: '事前オリエンテーション', unit: 50000 },
  { name: '入国前健康診断', unit: 10000 },
  { name: '入国後健康診断', unit: 10000 },
  { name: '特定技能総合保険料', unit: 12000 },
  { name: '入国時船舶到着見送り', unit: 70000 },
  { name: '入国時航空到着見送り', unit: 20000 },
  { name: '在留資格登録及び変更申請', unit: 50000 }, 
  { name: '印刷費用', unit: 6000 },
  { name: '支援費用初期3ヶ月', unit: 30000 },
  { name: '支援費用3ヶ月以降', unit: 20000 },
  { name: '支援費用1年後', unit: 10000 },
]

// 2년(24개월)간 월별 데이터 생성
const months = Array.from({ length: 24 }, (_, i) => {
  const date = dayjs(student.entryDate).add(i, 'month')
  return {
    year: date.year(),
    month: date.month() + 1,
    label: `${date.year()}.${(date.month() + 1).toString().padStart(2, '0')}`,
  }
})

// billingMatrix를 규칙에 따라 자동 생성
function generateBillingMatrix() {
  return billingItems.map(item => {
    // 인쇄비용까지는 첫 달만
    if (item.name === '日本語学費 N4' || item.name === '日本語学費 N3' || item.name === '日本語学費 N2' ||
        item.name === '実務経験2年未満' || item.name === '実務経験2年以上' || item.name === '事前ガイダンス' ||
        item.name === '事前オリエンテーション' || item.name === '入国前健康診断' || item.name === '入国後健康診断' ||
        item.name === '特定技能総合保険料' || item.name === '入国時船舶到着見送り' || item.name === '入国時航空到着見送り' ||
        item.name === '在留資格登録及び変更申請' || item.name === '印刷費用') {
      return Array.from({ length: 24 }, (_, i) => i === 0 ? item.unit : 0)
    }
    // 지원비용초기3개월: 1~3개월
    if (item.name === '支援費用初期3ヶ月') {
      return Array.from({ length: 24 }, (_, i) => (i >= 0 && i < 3) ? item.unit : 0)
    }
    // 지원비용3개월이후: 4~12, 16~24개월
    if (item.name === '支援費用3ヶ月以降') {
      return Array.from({ length: 24 }, (_, i) => (i >= 3 && i < 12) || (i >= 15 && i < 24) ? item.unit : 0)
    }
    // 지원비용1년뒤: 13, 25, ... (매년 첫 달)
    if (item.name === '支援費用1年後') {
      return Array.from({ length: 24 }, (_, i) => (i === 12 || i === 24) ? item.unit : 0)
    }
    // 기본: 모두 0
    return Array(24).fill(0)
  })
}

const billingMatrix = generateBillingMatrix()

// 월별 합계 계산
const monthlyTotals = months.map((_, colIdx) =>
  billingMatrix.reduce((sum, row) => sum + row[colIdx], 0)
)

</script>

<template>
  <VCard class="pa-6">
    <h2 class="text-h5 mb-2">月額請求書(2年)</h2>
    <div class="mb-4">
      <div>名前: <b>{{ student.name }}</b></div>
      <div>入国日: <b>{{ student.entryDate }}</b></div>
      <div>会社名: <b>{{ student.company }}</b></div>
    </div>
    <VTable>
      <thead>
        <tr>
          <th>請求項目</th>
          <th>単価</th>
          <th v-for="m in months" :key="m.label">{{ m.label }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, rowIdx) in billingItems" :key="item.name">
          <td>{{ item.name }}</td>
          <td>{{ item.unit ? item.unit.toLocaleString() : '-' }}</td>
          <td v-for="(m, colIdx) in months" :key="m.label">
            <span v-if="billingMatrix[rowIdx][colIdx] !== 0">{{ billingMatrix[rowIdx][colIdx].toLocaleString() }}</span>
          </td>
        </tr>
        <tr class="font-weight-bold">
          <td colspan="2">合計</td>
          <td v-for="(total, idx) in monthlyTotals" :key="idx">{{ total.toLocaleString() }}</td>
        </tr>
      </tbody>
    </VTable>
  </VCard>
</template>

<style scoped>
.v-table {
  background: white;
  border-radius: 4px;
}
.v-table th {
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.7);
}
.v-table td {
  color: rgba(var(--v-theme-on-surface), 0.87);
}
</style> 
