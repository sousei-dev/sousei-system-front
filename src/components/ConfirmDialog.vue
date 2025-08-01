<script setup lang="ts">
import { ref, watch, defineProps, defineEmits } from 'vue'

const props = defineProps({
  open: Boolean,
  title: { type: String, default: '確認' },
  message: { type: String, default: '本当に実行しますか？' },
  confirmText: { type: String, default: 'OK' },
  cancelText: { type: String, default: 'キャンセル' },
  icon: { type: String, default: 'mdi-alert-circle-outline' },
  color: { type: String, default: 'error' },
})
const emit = defineEmits(['update:open', 'confirm', 'cancel'])

const dialog = ref(props.open)
watch(() => props.open, v => dialog.value = v)
watch(dialog, v => emit('update:open', v))

function handleConfirm() {
  emit('confirm')
  dialog.value = false
}
function handleCancel() {
  emit('cancel')
  dialog.value = false
}
</script>

<template>
  <VDialog v-model="dialog" max-width="400" transition="dialog-bottom-transition">
    <VCard :class="`pa-4 pt-6 pb-6 text-center`">
      <div class="d-flex flex-column align-center justify-center mb-2">
        <div class="text-h4 font-weight-bold mb-2">{{ title }}</div>
      </div>
      <VCardText class="mb-1" style="font-size: 1.2rem;">{{ message }}</VCardText>
      <VCardActions class="justify-end">
        <VBtn variant="text" color="grey" @click="handleCancel">{{ cancelText }}</VBtn>
        <VBtn :color="color" variant="flat" @click="handleConfirm">{{ confirmText }}</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template> 