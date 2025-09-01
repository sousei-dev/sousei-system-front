// @ts-nocheck
<script lang="ts" setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import draggable from 'vuedraggable'
import { invoiceService, type InvoiceItem, type MonthlyItemSortOrderUpdate } from '@/services/invoice'
import type { Student } from '@/services/student'

const props = defineProps<{
  student: Student
}>()

// 状態管理
const loading = ref(false)
const error = ref<string | null>(null)
const selectedYear = ref(new Date().getFullYear())
const billingItems = ref<BillingItem[]>([])

// エラーメッセージ表示関数
const showError = (message: string) => {
  error.value = message
}

// vuedraggable使用のための状態
const isDragging = ref(false)

// 請求書項目タイプ
interface BillingItem {
  id: string
  name: string
  amount: number
  sort_order: number
  description?: string
}

// 月別データタイプ
interface MonthlyData {
  [month: number]: {
    [item_name: string]: {
      id: string
      unit_price: number
      quantity: number
      amount: number
      memo: string
    }
  }
}

const monthlyData = ref<MonthlyData>({})

// 年度オプション（現在年度基準前後2年）
const yearOptions = computed(() => {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: 6 }, (_, i) => currentYear - 3 + i)
})

// 月オプション
const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)

// 月別データ初期化
const initializeMonthlyData = () => {
  monthlyData.value = {}
  monthOptions.forEach(month => {
    monthlyData.value[month] = {}
    billingItems.value.forEach(item => {
      monthlyData.value[month][item.id] = {
        id: item.id,
        unit_price: item.amount,
        quantity: 1,
        amount: item.amount,
        memo: item.description || ''
      }
    })
  })
}

// 年度変更時データ初期化
const handleYearChange = () => {
  initializeMonthlyData()
  fetchMonthlyInvoices()
}

// 新しい請求書項目追加
const newItemName = ref('')
const isAddingItem = ref(false)
const newItemInput = ref<HTMLElement>()

const addBillingItem = () => {
  isAddingItem.value = true
  newItemName.value = ''
  // 次のtickで入力にフォーカス
  nextTick(() => {
    if (newItemInput.value) {
      newItemInput.value.focus()
    }
  })
}

const confirmAddItem = async () => {
  if (!newItemName.value || newItemName.value.trim() === '') {
    isAddingItem.value = false
    newItemName.value = ''
    return
  }

  try {
    loading.value = true
    // 新しいAPIで項目作成
    await invoiceService.createStudentMonthlyItems(
      props.student.id,
      {
        student_id: props.student.id,
        item_name: newItemName.value.trim(),
        memo: ''
      },
      selectedYear.value
    )

    // 項目作成後データを再取得してマッチング
    await fetchMonthlyInvoices()

    // 入力モード終了及び入力値初期化
    isAddingItem.value = false
    newItemName.value = ''
  } catch (error: any) {
    console.error('項目追加中にエラー:', error)
    
    // エラーメッセージ処理
    let errorMessage = '請求書項目の追加中にエラーが発生しました。'
    
    if (error.response?.data?.detail) {
      errorMessage = error.response.data.detail
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error.message) {
      errorMessage = error.message
    } else if (error.response?.status === 400) {
      errorMessage = '不正なリクエストです。入力値を確認してください。'
    } else if (error.response?.status === 401) {
      errorMessage = '認証が必要です。再度ログインしてください。'
    } else if (error.response?.status === 403) {
      errorMessage = '権限がありません。'
    } else if (error.response?.status === 404) {
      errorMessage = '要求されたリソースが見つかりません。'
    } else if (error.response?.status === 500) {
      errorMessage = 'サーバーエラーが発生しました。しばらくしてから再試行してください。'
    }
    
    showError(errorMessage)
    
    // エラー発生時にも入力モード終了
    isAddingItem.value = false
    newItemName.value = ''
  } finally {
    loading.value = false
  }
}

const cancelAddItem = () => {
  isAddingItem.value = false
  newItemName.value = ''
}

// 個別項目更新関数
const updateIndividualItem = async (itemId: string, itemData: any) => {
  console.log(itemId, itemData)
  try {
    await invoiceService.updateMonthlyItem(itemId, {
      amount: itemData.amount,
      memo: itemData.memo
    })
  } catch (error: any) {
    console.error(`項目${itemId}更新中にエラー:`, error)
    
    let errorMessage = `項目の更新中にエラーが発生しました。`
    
    if (error.response?.data?.detail) {
      errorMessage = error.response.data.detail
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error.message) {
      errorMessage = error.message
    }
    
    showError(errorMessage)
  }
}

// 個別月保存関数
const saveIndividualMonth = async (month: number) => {
  try {
    loading.value = true
    // 該当月の全項目について個別更新
    const monthData = monthlyData.value[month]
    if (!monthData) return

    let successCount = 0
    let errorCount = 0

    for (const [itemId, data] of Object.entries(monthData)) {
      try {
        // APIから受け取ったitem_idを使用して更新
        const item = billingItems.value.find(bi => bi.id === itemId)
        if (item) {
          await invoiceService.updateMonthlyItem(itemId, {
            amount: data.amount,
            memo: data.memo
          })
          successCount++
        }
      } catch (error: any) {
        console.error(`項目${itemId}更新中にエラー:`, error)
        errorCount++
      }
    }

    if (successCount > 0) {
      showError(`${month}月のデータ保存中に${errorCount}個の項目でエラーが発生しました。`)
    } else {
      showError(`${month}月のデータ保存に失敗しました。`)
    }
  } catch (error: any) {
    console.error(`${month}月保存中にエラー:`, error)
    
    let errorMessage = `${month}月の保存中にエラーが発生しました。`
    
    if (error.response?.data?.detail) {
      errorMessage = error.response.data.detail
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error.message) {
      errorMessage = error.message
    }
    
    showError(errorMessage)
  } finally {
    loading.value = false
  }
}

// 1～12月全体保存関数
const saveAllMonths = async () => {
  try {
    loading.value = true
    let successCount = 0
    let errorCount = 0

    for (const month of monthOptions) {
      try {
        await saveIndividualMonth(month)
        successCount++
      } catch (error) {
        console.error(`${month}月保存中にエラー:`, error)
        errorCount++
      }
    }

    if (successCount > 0) {
      showError(`全体保存中に${errorCount}個の月でエラーが発生しました。`)
    } else {
      showError('全体保存に失敗しました。')
    }
  } catch (error: any) {
    console.error('全体保存中にエラー:', error)
    
    let errorMessage = '全体保存中にエラーが発生しました。'
    
    if (error.response?.data?.detail) {
      errorMessage = error.response.data.detail
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error.message) {
      errorMessage = error.message
    }
    
    showError(errorMessage)
  } finally {
    loading.value = false
  }
}

// 請求書項目削除
const removeBillingItem = async (itemId: string) => {
  try {
    // 削除確認ダイアログ
    const confirmed = confirm('この項目を削除しますか？この操作は元に戻せません。')
    if (!confirmed) return

    loading.value = true
    
    // API呼び出しで項目削除
    await invoiceService.deleteMonthlyItem(props.student.id, selectedYear.value, itemId)
    
    // 削除後データを再取得してマッチング
    await fetchMonthlyInvoices()

  } catch (error: any) {
    console.error('項目削除中にエラー:', error)
    
    let errorMessage = '請求書項目の削除中にエラーが発生しました。'
    
    if (error.response?.data?.detail) {
      errorMessage = error.response.data.detail
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error.message) {
      errorMessage = error.message
    } else if (error.response?.status === 400) {
      errorMessage = '不正なリクエストです。入力値を確認してください。'
    } else if (error.response?.status === 401) {
      errorMessage = '認証が必要です。再度ログインしてください。'
    } else if (error.response?.status === 403) {
      errorMessage = '権限がありません。'
    } else if (error.response?.status === 404) {
      errorMessage = '要求されたリソースが見つかりません。'
    } else if (error.response?.status === 500) {
      errorMessage = 'サーバーエラーが発生しました。しばらくしてから再試行してください。'
    }
    
    showError(errorMessage)
  } finally {
    loading.value = false
  }
}

// 請求書項目編集
const editingItemId = ref<string | null>(null)
const editingItemName = ref('')

const editBillingItem = (itemId: string) => {
  const item = billingItems.value.find(bi => bi.id === itemId)
  if (item) {
    editingItemId.value = itemId
    editingItemName.value = item.name
  }
}

const saveBillingItemName = async (itemId: string) => {
  try {
    const item = billingItems.value.find(bi => bi.id === itemId)
    if (item && editingItemName.value.trim() !== '') {
      // TODO: API 호출로 이름 업데이트
      await invoiceService.updateMonthlyItemName(props.student.id, selectedYear.value, item.name, editingItemName.value.trim())
      
      // 로컬 상태 업데이트
      item.name = editingItemName.value.trim()
      
      // 편집 모드 종료
      editingItemId.value = null
      editingItemName.value = ''
    }
  } catch (error: any) {
    console.error('項目名更新中にエラー:', error)
    showError('項目名の更新に失敗しました。')
  }
}

const cancelBillingItemEdit = () => {
  editingItemId.value = null
  editingItemName.value = ''
}


// 月別請求書照会
const fetchMonthlyInvoices = async () => {
  try {
    loading.value = true
    error.value = null

    // 新しいAPIで月別管理費項目照会
    const response = await invoiceService.getStudentMonthlyItems(
      props.student.id,
      selectedYear.value
    )
    
    // 応答データ処理
    if (response && response.items) {
      // 既存項目初期化
      billingItems.value = []
      monthlyData.value = {}

      // 各項目別に処理
      response.items.forEach((item: any) => {
        // 新しい項目追加
        const newBillingItem: BillingItem = {
          id: item.item_name, // 項目名をIDとして使用（一意性保証）
          name: item.item_name,
          amount: 0,
          sort_order: item.sort_order
        }
        billingItems.value.push(newBillingItem)
        
        // 全月に該当項目初期化
        monthOptions.forEach(month => {
          if (!monthlyData.value[month]) {
            monthlyData.value[month] = {}
          }
          monthlyData.value[month][newBillingItem.id] = {
            id: item.id,
            unit_price: 0,
            quantity: 1,
            amount: 0,
            memo: ''
          }
        })
        
        // 各月別データ設定
        item.months.forEach((monthData: any) => {
          if (!monthlyData.value[monthData.month]) {
            monthlyData.value[monthData.month] = {}
          }
          monthlyData.value[monthData.month][newBillingItem.id] = {
            id: monthData.id,
            unit_price: 0,
            quantity: 1,
            amount: monthData.amount || 0,
            memo: monthData.memo || ''
          }
        })
      })
    }
    // データがない時のみ自動追加ボタン有効化
    if (billingItems.value.length === 0) {
      addBillingItem()
    }
  } catch (err: any) {
    console.error('月別管理費項目取得中にエラー:', err)
    
    let errorMessage = '月別管理費項目の取得中にエラーが発生しました。'
    
    if (err.response?.data?.detail) {
      errorMessage = err.response.data.detail
    } else if (err.response?.data?.message) {
      errorMessage = err.response.data.message
    } else if (err.message) {
      errorMessage = err.message
    } else if (err.response?.status === 400) {
      errorMessage = '不正なリクエストです。入力値を確認してください。'
    } else if (err.response?.status === 401) {
      errorMessage = '認証が必要です。再度ログインしてください。'
    } else if (err.response?.status === 403) {
      errorMessage = '権限がありません。'
    } else if (err.response?.status === 404) {
      errorMessage = '要求されたリソースが見つかりません。'
    } else if (err.response?.status === 500) {
      errorMessage = 'サーバーエラーが発生しました。しばらくしてから再試行してください。'
    }
    
    showError(errorMessage)
  } finally {
    loading.value = false
  }
}

// 項目金額計算
const calculateItemAmount = (month: number, itemId: string) => {
  if (monthlyData.value[month] && monthlyData.value[month][itemId]) {
    const item = monthlyData.value[month][itemId]
    item.amount = item.unit_price * item.quantity
  }
}

// 月別総金額計算
const getMonthlyTotal = (month: number) => {
  if (!monthlyData.value[month]) return 0

  return Object.values(monthlyData.value[month]).reduce((sum, item) => {
    const amount = Number(item.amount) || 0
    return sum + amount
  }, 0)
}

// 金額フォーマット
const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('ja-JP').format(amount)
}

// 請求書保存
const saveInvoice = async (month: number) => {
  if (!monthlyData.value[month]) return

  try {
    loading.value = true
    error.value = null

    // 有効な項目のみフィルタリング
    const validItems: InvoiceItem[] = []

    Object.entries(monthlyData.value[month]).forEach(([itemId, itemData]) => {
      if (itemData.amount > 0) {
        const billingItem = billingItems.value.find(item => item.id === itemId)
        if (billingItem) {
          validItems.push({
            name: billingItem.name,
            unit_price: itemData.unit_price,
            quantity: itemData.quantity,
            sort_order: billingItem.sort_order,
            amount: itemData.amount,
            memo: itemData.memo,
          })
        }
      }
    })

    if (validItems.length === 0) {
      error.value = '有効な請求項目がありません。'
      return
    }

    // 請求書作成
    await invoiceService.createInvoice({
      student_id: props.student.id,
      year: selectedYear.value,
      month: month,
      items: validItems
    })
  } catch (err: any) {
    console.error('請求書保存中にエラー:', err)
    let errorMessage = '請求書の保存中にエラーが発生しました。'

    if (err.response?.data?.detail) {
      errorMessage = err.response.data.detail
    }
    showError(errorMessage)
  } finally {
    loading.value = false
  }
}

// 状態による色返却
const getStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return 'warning'
    case 'SAVED':
      return 'success'
    case 'OVERDUE':
      return 'error'
    default:
      return 'primary'
  }
}

// 状態によるテキスト返却
const getStatusText = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return '未保存'
    case 'SAVED':
      return '保存完了'
    case 'OVERDUE':
      return '延滞'
    default:
      return status
  }
}

// vuedraggableイベントハンドラー
const onDragStart = () => {
  isDragging.value = true
  console.log('ドラッグ開始')
}

const onDragEnd = () => {
  isDragging.value = false
  console.log('ドラッグ終了')
}

const onDragUpdate = (evt: any) => {
  console.log('ドラッグ更新:', evt)
}

// vuedraggable changeイベントハンドラー
const onDragChange = (evt: any) => {
  console.log('ドラッグ変更:', evt)
  
  // evt.addedまたはevt.movedイベント処理
  if (evt.added) {
    console.log('アイテム追加:', evt.added.element.name, '位置:', evt.added.newIndex)
    saveItemOrder()
  } else if (evt.moved) {
    console.log('アイテム移動:', evt.moved.element.name, '位置:', evt.moved.newIndex)
    saveItemOrder()
  }
}

// アイテム順序をサーバーに保存する関数
const saveItemOrder = async () => {
  try {
    // 各アイテムの新しい順序をサーバーに送信
    const orderData: MonthlyItemSortOrderUpdate['items'] = billingItems.value.map((item, index) => ({
      item_name: item.id,
      sort_order: index + 1,
    }))
    
    // API呼び出しで順序保存
    await invoiceService.updateMonthlyItemsSortOrder({
      student_id: props.student.id,
      year: selectedYear.value,
      items: orderData
    })
    
    console.log('アイテム順序保存完了:', orderData)
  } catch (error: any) {
    console.error('アイテム順序保存中にエラー:', error)
    
    let errorMessage = '項目順序の保存中にエラーが発生しました。'
    
    if (error.response?.data?.detail) {
      errorMessage = error.response.data.detail
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error.message) {
      errorMessage = error.message
    }
    
    showError(errorMessage)
  }
}

// ドラッグ＆ドロップテスト関数
const testDragAndDrop = () => {
  console.log('=== ドラッグ&ドロップテスト ===')
  console.log('billingItems:', billingItems.value)
  console.log('isDragging:', isDragging.value)
}

onMounted(() => {
  fetchMonthlyInvoices()
})
</script>

<template>
  <div>
    <!-- エラーメッセージ -->
    <VAlert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-4"
    >
      {{ error }}
    </VAlert>

    <!-- ヘッダー -->
    <VCard class="mb-6">
      <VCardTitle class="text-h5">
        <VIcon class="me-2">ri-file-list-line</VIcon>
        {{ selectedYear }}年 月別請求書管理
      </VCardTitle>
      
      <VCardText>
        <VRow>
          <!-- 年度選択 -->
          <VCol cols="12" md="3">
            <VSelect
              v-model="selectedYear"
              :items="yearOptions"
              label="年"
              variant="outlined"
              @update:model-value="handleYearChange"
            />
          </VCol>
          

        </VRow>
      </VCardText>
    </VCard>



    <!-- 月別請求書テーブル -->
    <VCard>
      <VCardTitle class="text-h6">
        <VIcon class="me-2">ri-calendar-line</VIcon>
        月別請求書一覧
      </VCardTitle>
      
      <VCardText>
        <!-- ローディング状態 -->
        <div v-if="loading" class="d-flex justify-center align-center py-8">
          <VProgressCircular
            indeterminate
            color="primary"
            size="64"
          />
          <span class="ml-4 text-body-1">データを読み込み中...</span>
        </div>

        <!-- テーブル -->
        <div v-else class="table-container">
          <VTable>
            <thead>
              <tr>
                <th class="fixed-column">項目名</th>
                <th v-for="month in monthOptions" :key="month" class="month-column">
                  {{ month }}月
                </th>
                <th class="total-column">合計</th>
              </tr>
            </thead>
            <draggable
              v-model="billingItems"
              :group="{ name: 'billing-items' }"
              item-key="id"
              @start="onDragStart"
              @end="onDragEnd"
              @change="onDragChange"
              @update="onDragUpdate"
              class="billing-items-list"
              tag="tbody"
            >
              <template #item="{ element: item }">
                <tr 
                  :key="item.id"
                  :data-item-id="item.id"
                  :class="{ 'dragging': isDragging }"
                >
                  <td class="fixed-column item-name">
                    <div class="d-flex align-center justify-space-between">
                      <div class="d-flex align-center">
                        <div class="drag-handle me-2">
                          <VIcon 
                            color="grey"
                            size="small"
                            class="drag-icon"
                          >
                            ri-draggable
                          </VIcon>
                        </div>
                        <!-- 편집 모드일 때 -->
                        <div v-if="editingItemId === item.id" class="d-flex align-center gap-2">
                          <VTextField
                            v-model="editingItemName"
                            density="compact"
                            hide-details
                            variant="outlined"
                            size="small"
                            style="min-width: 120px;"
                            @keyup.esc="cancelBillingItemEdit"
                          />
                        </div>
                        <!-- 일반 모드일 때 -->
                        <span v-else class="font-weight-bold">{{ item.name }}</span>
                      </div>
                      <div class="d-flex align-center">
                        <!-- 편집 모드일 때 -->
                        <div v-if="editingItemId === item.id" class="d-flex align-center gap-2">
                          <VBtn
                            icon
                            variant="text"
                            color="success"
                            size="small"
                            @click="saveBillingItemName(item.id)"
                          >
                            <VIcon>ri-check-line</VIcon>
                          </VBtn>
                          <VBtn
                            icon
                            variant="text"
                            color="error"
                            size="small"
                            @click="cancelBillingItemEdit"
                          >
                            <VIcon>ri-close-line</VIcon>
                          </VBtn>
                        </div>
                        <!-- 일반 모드일 때 -->
                        <div v-else class="d-flex align-center gap-2">
                          <VBtn
                            icon
                            variant="text"
                            color="primary"
                            size="small"
                            @click="editBillingItem(item.id)"
                          >
                            <VIcon>ri-edit-line</VIcon>
                          </VBtn>
                          <VBtn
                            icon
                            variant="text"
                            color="error"
                            size="small"
                            @click="removeBillingItem(item.id)"
                          >
                            <VIcon>ri-delete-bin-line</VIcon>
                          </VBtn>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td 
                    v-for="month in monthOptions" 
                    :key="month"
                    class="month-cell"
                  >
                    <div class="d-flex flex-column">
                      <VTextField
                        :model-value="monthlyData[month]?.[item.id]?.amount || 0"
                        type="number"
                        min="0"
                        density="compact"
                        hide-details
                        class="mb-1"
                        placeholder="単価"
                        @update:model-value="(value) => {
                          if (!monthlyData[month]) monthlyData[month] = {}
                          if (!monthlyData[month][item.id]) monthlyData[month][item.id] = { id: item.id, unit_price: 0, quantity: 1, amount: 0, memo: '' }
                          monthlyData[month][item.id].amount = Number(value) || 0
                          calculateItemAmount(month, monthlyData[month][item.id].id)
                        }"
                        @blur="() => {
                          if (monthlyData[month]?.[item.id]) {
                            updateIndividualItem(monthlyData[month][item.id].id, monthlyData[month][item.id])
                          }
                        }"
                      />
                    </div>
                  </td>
                  <td class="total-column">
                    <span class="font-weight-bold">
                      ¥{{ formatAmount(monthOptions.reduce((monthSum, month) => {
                        const amount = Number(monthlyData[month]?.[item.id]?.amount) || 0
                        return monthSum + amount
                      }, 0)) }}
                    </span>
                  </td>
                </tr>
              </template>
            </draggable>
            <tbody>
              <!-- 追加ボタン行 -->
              <tr class="add-item-row" v-if="isAddingItem">
                <td class="fixed-column">
                  <div class="d-flex align-center gap-2">
                    <VTextField
                      v-model="newItemName"
                      placeholder="項目名を入力"
                      density="compact"
                      hide-details
                      variant="outlined"
                      size="small"
                      @keyup.esc="cancelAddItem"
                      style="min-width: 120px;"
                      ref="newItemInput"
                    />
                    <VBtn
                      icon
                      variant="text"
                      color="success"
                      size="small"
                      @click="confirmAddItem"
                    >
                      <VIcon>ri-check-line</VIcon>
                    </VBtn>
                    <VBtn
                      icon
                      variant="text"
                      color="error"
                      size="small"
                      @click="cancelAddItem"
                    >
                      <VIcon>ri-close-line</VIcon>
                    </VBtn>
                  </div>
                </td>
                <td
                  v-for="month in monthOptions"
                  :key="month"
                  class="add-cell"
                >
                  <!-- 空セル -->
                </td>
                <td class="total-column">
                  <!-- 空セル -->
                </td>
              </tr>
              <tr class="add-item-row" v-else>
                <td class="fixed-column">
                  <VBtn
                    icon
                    variant="text"
                    color="primary"
                    size="small"
                    @click="addBillingItem"
                  >
                    <VIcon>ri-add-line</VIcon>
                  </VBtn>
                </td>
                <td
                  v-for="month in monthOptions"
                  :key="month"
                  class="add-cell"
                >
                  <!-- 空セル -->
                </td>
                <td class="total-column">
                  <!-- 空セル -->
                </td>
              </tr>
              <!-- 月別合計行 -->
              <tr class="monthly-total-row">
                <td class="fixed-column">
                  <span class="font-weight-bold">月別合計</span>
                </td>
                <td 
                  v-for="month in monthOptions" 
                  :key="month"
                  class="monthly-total-cell"
                >
                  <div class="d-flex flex-column align-center">
                    <span class="font-weight-bold">
                      ¥{{ formatAmount(getMonthlyTotal(month)) }}
                    </span>
                  </div>
                </td>
                <td class="total-column">
                  <span class="font-weight-bold">
                    ¥{{ formatAmount(monthOptions.reduce((sum, month) => {
                      const monthlyTotal = getMonthlyTotal(month)
                      return sum + monthlyTotal
                    }, 0)) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </VTable>
        </div>
      </VCardText>
    </VCard>
  </div>
</template>

<style scoped>
.table-container {
  overflow-x: auto;
  max-width: 100%;
}

.billing-table {
  min-width: 1200px;
  background: white;
  border-radius: 4px;
}

.billing-table th {
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.7);
  text-align: center;
  padding: 12px 8px;
  border-bottom: 2px solid rgba(var(--v-theme-border-color), var(--v-theme-border-opacity));
}

.billing-table td {
  color: rgba(var(--v-theme-on-surface), 0.87);
  padding: 8px;
  border-bottom: 1px solid rgba(var(--v-theme-border-color), var(--v-theme-border-opacity));
}

.fixed-column {
  position: sticky;
  left: 0;
  background: white;
  z-index: 1;
  min-width: 280px;
  max-width: 280px;
}

.month-column {
  min-width: 150px;
  text-align: center;
}

.total-column {
  min-width: 120px;
  text-align: center;
  background: rgba(var(--v-theme-primary), 0.1);
}

.add-item-row {
  background: rgba(var(--v-theme-primary), 0.02);
}

.add-cell {
  text-align: center;
}

.action-column {
  min-width: 80px;
  text-align: center;
}

.month-cell {
  text-align: center;
}

.monthly-total-row {
  background: rgba(var(--v-theme-primary), 0.05);
}

.monthly-total-cell {
  text-align: center;
}

.amount-display {
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(var(--v-theme-primary), 0.8);
  margin-top: 4px;
}

.item-name {
  font-weight: 500;
}

.v-table {
  background: white;
  border-radius: 4px;
}

/* vuedraggable関連スタイル */
.billing-items-list {
  display: table-row-group;
}

.billing-items-list tr {
  display: table-row;
}

.billing-items-list td {
  display: table-cell;
}

.dragging {
  opacity: 0.3;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  position: relative;
}

.drag-handle {
  cursor: grab;
  transition: all 0.2s ease;
  padding: 8px;
  border-radius: 8px;
  user-select: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  min-height: 32px;
  position: relative;
  z-index: 100;
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid transparent;
  /* ドラッグ安定性のための追加属性 */
  touch-action: none;
  -webkit-user-drag: element;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  /* 強制ドラッグ有効化 */
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  /* ドラッグ領域強化 */
  outline: none;
  box-sizing: border-box;
}

.drag-handle:hover {
  background: rgba(var(--v-theme-primary), 0.1);
  transform: scale(1.05);
  border: 1px solid rgba(var(--v-theme-primary), 0.3);
}

.drag-handle:hover .v-icon {
  color: var(--v-theme-primary) !important;
}

/* ドラッグハンドル領域可視化（開発用） */
.drag-handle::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border: 1px dashed rgba(128, 128, 128, 0.3);
  border-radius: 8px;
  pointer-events: none;
}

.drag-handle:active {
  cursor: grabbing;
  transform: scale(0.98);
  background: rgba(var(--v-theme-primary), 0.15);
}

/* ドラッグアイコンスタイル */
.drag-icon {
  pointer-events: none;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

tr:hover .drag-handle {
  color: var(--v-theme-primary) !important;
}

/* 드래그 중인 행 스타일 */
tr.dragging {
  background: rgba(var(--v-theme-primary), 0.1) !important;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

/* 드롭 영역 표시 */
tbody tr:hover {
  background: rgba(var(--v-theme-primary), 0.05);
  transition: background-color 0.2s ease;
}

/* 드래그 오버 상태 */
tbody tr.drag-over {
  background: rgba(var(--v-theme-primary), 0.15) !important;
  border: 2px dashed var(--v-theme-primary);
  transform: scale(1.02);
  transition: all 0.2s ease;
}

/* 드래그 중인 행이 다른 행 위에 있을 때 */
tbody tr.drag-over .drag-handle {
  color: var(--v-theme-primary) !important;
  transform: scale(1.1);
}
</style>


