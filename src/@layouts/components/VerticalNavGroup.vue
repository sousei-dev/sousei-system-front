<script lang="ts" setup>
import type { NavGroup } from '@layouts/types'

defineProps<{
  item: Omit<NavGroup, 'children'>
}>()

const isOpen = ref(false)
const isTouching = ref(false)

const handleTouchStart = () => {
  isTouching.value = true
}

const handleTouchEnd = (event: TouchEvent) => {
  if (isTouching.value) {
    event.preventDefault()
    isOpen.value = !isOpen.value
    isTouching.value = false
  }
}

const handleClick = (event: MouseEvent) => {
  // 터치 이벤트가 발생한 경우 클릭 이벤트 무시
  if (isTouching.value) {
    event.preventDefault()
    return
  }
  isOpen.value = !isOpen.value
}
</script>

<template>
  <li
    class="nav-group"
    :class="isOpen && 'open'"
  >
    <div
      class="nav-group-label"
      @touchstart.passive="handleTouchStart"
      @touchend="handleTouchEnd"
      @click="handleClick"
    >
      <VIcon
        :icon="item.icon || 'ri-checkbox-blank-circle-line'"
        class="nav-item-icon"
      />
      <span class="nav-item-title">{{ item.title }}</span>
      <span
        class="nav-item-badge"
        :class="item.badgeClass"
      >
        {{ item.badgeContent }}
      </span>
      <VIcon
        icon="ri-arrow-right-s-line"
        class="nav-group-arrow"
      />
    </div>
    <div class="nav-group-children-wrapper">
      <ul class="nav-group-children">
        <slot />
      </ul>
    </div>
  </li>
</template>

<style lang="scss" scoped>
.nav-group-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
  
  // 모바일에서 hover 효과 완전 비활성화
  @media (hover: none) and (pointer: coarse) {
    &:hover {
      background-color: transparent !important;
      color: inherit !important;
      transform: none !important;
      box-shadow: none !important;
    }
  }
}

.nav-group-children-wrapper {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s ease-in-out;

  .nav-group-children {
    overflow: hidden;
  }
}

.nav-group.open {
  .nav-group-children-wrapper {
    grid-template-rows: 1fr;
  }
}
</style>

<style lang="scss">
// 전역 스타일로 모바일 hover 비활성화
@media (hover: none) and (pointer: coarse) {
  .layout-vertical-nav {
    .nav-group-label:hover {
      background-color: transparent !important;
      color: inherit !important;
      transform: none !important;
      box-shadow: none !important;
    }
  }
}
</style>
