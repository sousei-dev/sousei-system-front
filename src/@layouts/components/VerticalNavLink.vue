<script lang="ts" setup>
import type { NavLink } from '@layouts/types'

defineProps<{
  item: NavLink
}>()
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
      class="nav-link-item"
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

<style lang="scss" scoped>
.nav-link-item {
  display: flex;
  align-items: center;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}
</style>

<style lang="scss">
/* 전역 스타일로 모바일 hover 비활성화 */
@media (hover: none) and (pointer: coarse) {
  .layout-vertical-nav {
    .nav-link a:hover,
    .nav-link div:hover,
    .nav-group-label:hover {
      background-color: transparent !important;
      color: inherit !important;
      transform: none !important;
      box-shadow: none !important;
    }
  }
}
</style>
