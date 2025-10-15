<script lang="ts" setup>
import VerticalNavLink from '@layouts/components/VerticalNavLink.vue';
import VerticalNavSectionTitle from '@layouts/components/VerticalNavSectionTitle.vue';
import VerticalNavGroup from '@layouts/components/VerticalNavGroup.vue';
import { authService } from '@/services/auth'
import { computed } from 'vue'
import { getCurrentUserPermission } from '@/utils/permissions'
import { useChatNotificationStore } from '@/stores/chatNotification'

// 사용자 권한 가져오기
const currentPermission = computed(() => getCurrentUserPermission());

// 관리자 권한 확인
const isAdmin = computed(() => currentPermission.value === 'admin');

// 特定技能 관리자 권한 확인
const isManagerSpecified = computed(() => currentPermission.value === 'manager_specified');

// 技能実習 관리자 권한 확인
const isManagerGeneral = computed(() => currentPermission.value === 'manager_general');

// 技能実習 관리자 권한 확인
const isUser = computed(() => currentPermission.value === 'user' || currentPermission.value === 'mishima_user');

const mishimaUser = computed(() => currentPermission.value === 'mishima_user');

// 介護管理 권한 확인
const isCareUser = computed(() => currentPermission.value === 'care_user');

// 채팅 알림 store
const chatNotificationStore = useChatNotificationStore()

// 스킬생 관리 권한 확인 (관리자 또는 스킬생 관리자)
const canManageStudents = computed(() => {
  return isAdmin.value || isManagerSpecified.value || isManagerGeneral.value
})
</script>

<template>
  <!-- care_user인 경우 care-dashboard만 표시 -->
  <template v-if="isCareUser">
    <VerticalNavLink
      :item="{
        title: '管理ダッシュボード',
        icon: 'ri-dashboard-line',
        to: '/care-dashboard',
      }"
    />
  </template>
  
  <!-- care_user가 아닌 경우 일반 메뉴 표시 -->
  <template v-else>
    <!-- 👉 Dashboards -->
    <VerticalNavLink
      :item="{
        title: 'Dashboards',
        icon: 'ri-home-smile-line',
        to: '/dashboard',
      }"
    />
    <template v-if="isAdmin || isUser">
      <VerticalNavLink
        :item="{
          title: 'チャット',
          icon: 'ri-message-2-line',
          to: '/chat',
          badgeContent: chatNotificationStore.totalUnreadCount > 0 ? chatNotificationStore.totalUnreadCount.toString() : undefined,
          badgeClass: chatNotificationStore.hasNotification ? 'bg-error' : undefined,
        }"
      />
    </template>
  </template>

  <!-- 
  <VerticalNavGroup
    :item="{
      title: 'Dashboards',
      badgeContent: '5',
      badgeClass: 'bg-error',
      icon: 'ri-home-smile-line',
    }"
  >
    <VerticalNavLink
      :item="{
        title: 'Analytics',
        to: '/dashboard',
      }"
    /> 
    <!-- <VerticalNavLink
      :item="{
        title: 'CRM',
        href: 'https://demos.themeselection.com/materio-vuetify-vuejs-admin-template/demo-1/dashboards/crm',
        target: '_blank',
        badgeContent: 'Pro',
        badgeClass: 'bg-light-primary text-primary',
      }"
    />
    <VerticalNavLink
      :item="{
        title: 'ECommerce',
        href: 'https://demos.themeselection.com/materio-vuetify-vuejs-admin-template/demo-1/dashboards/ecommerce',
        target: '_blank',
        badgeContent: 'Pro',
        badgeClass: 'bg-light-primary text-primary',
      }"
    />
    <VerticalNavLink
      :item="{
        title: 'Academy',
        href: 'https://demos.themeselection.com/materio-vuetify-vuejs-admin-template/demo-1/dashboards/academy',
        target: '_blank',
        badgeContent: 'Pro',
        badgeClass: 'bg-light-primary text-primary',
      }"
    />
    <VerticalNavLink
      :item="{
        title: 'Logistics',
        href: 'https://demos.themeselection.com/materio-vuetify-vuejs-admin-template/demo-1/dashboards/logistics',
        target: '_blank',
        badgeContent: 'Pro',
        badgeClass: 'bg-light-primary text-primary',
      }"
    /> -->
  <!-- </VerticalNavGroup> -->

  <!-- 👉 Front Pages -->
  <!-- <VerticalNavGroup
    :item="{
      title: 'Front Pages',
      icon: 'ri-file-copy-line',
      badgeContent: 'Pro',
      badgeClass: 'bg-light-primary text-primary',
    }"
  >
    <VerticalNavLink
      :item="{
        title: 'Landing',
        href: 'https://demos.themeselection.com/materio-vuetify-vuejs-admin-template/demo-1/front-pages/landing-page',
        target: '_blank',
      }"
    />
    <VerticalNavLink
      :item="{
        title: 'Pricing',
        href: 'https://demos.themeselection.com/materio-vuetify-vuejs-admin-template/demo-1/front-pages/pricing',
        target: '_blank',
      }"
    />
    <VerticalNavLink
      :item="{
        title: 'Payment',
        href: 'https://demos.themeselection.com/materio-vuetify-vuejs-admin-template/demo-1/front-pages/payment',
        target: '_blank',
      }"
    />
    <VerticalNavLink
      :item="{
        title: 'Checkout',
        href: 'https://demos.themeselection.com/materio-vuetify-vuejs-admin-template/demo-1/front-pages/checkout',
        target: '_blank',
      }"
    />
    <VerticalNavLink
      :item="{
        title: 'Help Center',
        href: 'https://demos.themeselection.com/materio-vuetify-vuejs-admin-template/demo-1/front-pages/help-center',
        target: '_blank',
      }"
    />
  </VerticalNavGroup> -->

  <!-- 스킬생 관리 섹션 - 권한에 따라 제한 -->
  <template v-if="canManageStudents">
    <VerticalNavSectionTitle
      :item="{
        heading: '技能生管理',
      }"
    />
    
    <!-- 관리자는 모든 메뉴 표시 -->
    <template v-if="isAdmin">
      <VerticalNavLink
        :item="{
          title: '全て',
          icon: 'ri-group-3-line',
          to: '/all-student-list?type=ALL',
        }"
      />
      <VerticalNavLink
        :item="{
          title: '技能',
          icon: 'ri-user-line',
          to: '/student-list?type=GENERAL',
        }"
      />
      <VerticalNavLink
        :item="{
          title: '特定',
          icon: 'ri-user-star-line',
          to: '/special-student-list?type=SPECIFIED',
        }"
      />
    </template>
    
    <!-- 特定技能 관리자는 特定 메뉴만 표시 -->
    <template v-else-if="isManagerSpecified">
      <VerticalNavLink
        :item="{
          title: '特定',
          icon: 'ri-user-star-line',
          to: '/special-student-list?type=SPECIFIED',
        }"
      />
    </template>
    
    <!-- 技能実習 관리자는 技能 메뉴만 표시 -->
    <template v-else-if="isManagerGeneral">
      <VerticalNavLink
        :item="{
          title: '技能',
          icon: 'ri-user-line',
          to: '/student-list?type=GENERAL',
        }"
      />
    </template>
  </template>
  <template v-if="isAdmin">
    <VerticalNavSectionTitle
      :item="{
        heading: '請求管理',
      }"
    />
    <VerticalNavLink
      :item="{
        title: '家賃請求',
        icon: 'ri-money-cny-circle-line',
        to: '/billing',
      }"
    />
    <VerticalNavSectionTitle
      :item="{
        heading: '技能生家賃管理',
      }"
    />
    <VerticalNavLink
      :item="{
        title: '物件',
        icon: 'ri-community-line',
        to: '/building-list?type=student',
      }"
    />
  </template>

  <template v-if="isAdmin || mishimaUser">
    <VerticalNavSectionTitle
      :item="{
        heading: '介護管理',
      }"
    />
    <VerticalNavLink
      :item="{
        title: '管理ダッシュボード',
        icon: 'ri-dashboard-line',
        to: '/care-dashboard',
      }"
    />
    <VerticalNavSectionTitle
      :item="{
        heading: '介護賃管理',
      }"
    />
    <VerticalNavLink
      :item="{
        title: '物件',
        icon: 'ri-community-line',
        to: '/elderly-building-list?type=elderly',
      }"
    />  
  </template>
  <!-- <VerticalNavLink
    :item="{
      title: 'スケジュール',
      icon: 'ri-calendar-line',
      to: '/calendar',
    }"
  /> -->

  <!-- 👉 Apps & Pages -->
  <!-- <VerticalNavSectionTitle
    :item="{
      heading: 'Apps & Pages',
    }"
  />
  <VerticalNavLink
    :item="{
      title: 'Email',
      icon: 'ri-mail-line',
      href: 'https://demos.themeselection.com/materio-vuetify-vuejs-admin-template/demo-1/apps/email',
      target: '_blank',
      badgeContent: 'Pro',
      badgeClass: 'bg-light-primary text-primary',
    }"
  />
  <VerticalNavLink
    :item="{
      title: 'Chat',
      icon: 'ri-wechat-line',
      href: 'https://demos.themeselection.com/materio-vuetify-vuejs-admin-template/demo-1/apps/chat',
      target: '_blank',
      badgeContent: 'Pro',
      badgeClass: 'bg-light-primary text-primary',
    }"
  />
  <VerticalNavLink
    :item="{
      title: 'Calendar',
      icon: 'ri-calendar-line',
      href: 'https://demos.themeselection.com/materio-vuetify-vuejs-admin-template/demo-1/apps/calendar',
      target: '_blank',
      badgeContent: 'Pro',
      badgeClass: 'bg-light-primary text-primary',
    }"
  />
  <VerticalNavLink
    :item="{
      title: 'Kanban',
      icon: 'ri-drag-drop-line',
      href: 'https://demos.themeselection.com/materio-vuetify-vuejs-admin-template/demo-1/apps/kanban',
      target: '_blank',
      badgeContent: 'Pro',
      badgeClass: 'bg-light-primary text-primary',
    }"
  />

  <VerticalNavLink
    :item="{
      title: 'Account Settings',
      icon: 'ri-user-settings-line',
      to: '/account-settings',
    }"
  />

  <VerticalNavLink
    :item="{
      title: 'Login',
      icon: 'ri-login-box-line',
      to: '/login',
    }"
  />
  <VerticalNavLink
    :item="{
      title: 'Register',
      icon: 'ri-user-add-line',
      to: '/register',
    }"
  />
  <VerticalNavLink
    :item="{
      title: 'Error',
      icon: 'ri-information-line',
      to: '/no-existence',
    }"
  /> -->

  <!-- 👉 User Interface -->
  <!-- <VerticalNavSectionTitle
    :item="{
      heading: 'User Interface',
    }"
  />
  <VerticalNavLink
    :item="{
      title: 'Typography',
      icon: 'ri-text',
      to: '/typography',
    }"
  />
  <VerticalNavLink
    :item="{
      title: 'Icons',
      icon: 'ri-remixicon-line',
      to: '/icons',
    }"
  />
  <VerticalNavLink
    :item="{
      title: 'Cards',
      icon: 'ri-bar-chart-box-line',
      to: '/cards',
    }"
  /> -->

  <!-- 👉 Forms & Tables -->
  <!-- <VerticalNavSectionTitle
    :item="{
      heading: 'Forms & Tables',
    }"
  />
  <VerticalNavLink
    :item="{
      title: 'Form Layouts',
      icon: 'ri-layout-4-line',
      to: '/form-layouts',
    }"
  />
  <VerticalNavLink
    :item="{
      title: 'Form Validation',
      icon: 'ri-checkbox-multiple-line',
      href: 'https://demos.themeselection.com/materio-vuetify-vuejs-admin-template/demo-1/forms/form-validation',
      target: '_blank',
      badgeContent: 'Pro',
      badgeClass: 'bg-light-primary text-primary',
    }"
  />
  <VerticalNavLink
    :item="{
      title: 'Form Wizard',
      icon: 'ri-git-commit-line',
      href: 'https://demos.themeselection.com/materio-vuetify-vuejs-admin-template/demo-1/forms/form-wizard-numbered',
      target: '_blank',
      badgeContent: 'Pro',
      badgeClass: 'bg-light-primary text-primary',
    }"
  />
  <VerticalNavLink
    :item="{
      title: 'Tables',
      icon: 'ri-table-alt-line',
      to: '/tables',
    }"
  /> -->

  <!-- 👉 Others -->
  <!-- <VerticalNavSectionTitle
    :item="{
      heading: 'Others',
    }"
  />
  <VerticalNavLink
    :item="{
      title: 'Access Control',
      icon: 'ri-shield-line',
      href: 'https://demos.themeselection.com/materio-vuetify-vuejs-admin-template/demo-1/access-control',
      target: '_blank',
      badgeContent: 'Pro',
      badgeClass: 'bg-light-primary text-primary',
    }"
  />
  <VerticalNavLink
    :item="{
      title: 'Documentation',
      icon: 'ri-article-line',
      href: 'https://demos.themeselection.com/materio-vuetify-vuejs-admin-template/documentation/',
      target: '_blank',
    }"
  />
  <VerticalNavLink
    :item="{
      title: 'Raise Support',
      href: 'https://github.com/themeselection/materio-vuetify-vuejs-admin-template-free/issues',
      icon: 'ri-lifebuoy-line',
      target: '_blank',
    }"
  /> -->
</template>
