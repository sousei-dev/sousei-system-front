<script lang="ts" setup>
import type { NavLink } from '@layouts/types'

defineProps<{
  item: NavLink
}>()

const isTouching = ref(false)

const handleTouchStart = () => {
  isTouching.value = true
}

const handleTouchEnd = (event: TouchEvent) => {
  if (isTouching.value) {
    isTouching.value = false
  }
}

const handleClick = (event: MouseEvent) => {
  // 터치 이벤트가 발생한 경우 클릭 이벤트 무시
  if (isTouching.value) {
    event.preventDefault()
    return
  }
}
</script>

<template>
  <li
    class="nav-link"
    :class="{ disabled: item.disable }"
  >
    <Component
      :is="item.to ? 'RouterLink' : 'a'"
      :to="item.to"
      :href="item.href"
      :target="item.target"
      @touchstart="handleTouchStart"
      @touchend="handleTouchEnd"
      @click="handleClick"
    >
      <VIcon
        :icon="item.icon || 'ri-checkbox-blank-circle-line'"
        class="nav-item-icon"
      />
      <!-- 👉 Title -->
      <span class="nav-item-title">
        {{ item.title }}
      </span>
      <span
        class="nav-item-badge"
        :class="item.badgeClass"
      >
        {{ item.badgeContent }}
      </span>
    </Component>
  </li>
</template>

<style lang="scss">
.layout-vertical-nav {
  .nav-link a {
    display: flex;
    align-items: center;
    cursor: pointer;
    touch-action: manipulation; // 터치 지연 제거
    -webkit-tap-highlight-color: transparent; // 터치 하이라이트 제거
  }
}
</style>
