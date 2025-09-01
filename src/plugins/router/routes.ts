export const routes = [
  { path: '/', redirect: '/dashboard' },
  {
    path: '/',
    component: () => import('@/layouts/default.vue'),
    children: [
      {
        path: 'dashboard',
        component: () => import('@/pages/dashboard.vue'),
      },
      {
        path: 'student-list',
        component: () => import('@/pages/student-list.vue'),
      },
      {
        path: 'all-student-list',
        component: () => import('@/pages/student-list.vue'),
      },
      {
        path: 'special-student-list',
        component: () => import('@/pages/student-list.vue'),
      },
      {
        path: 'student-create',
        component: () => import('@/pages/student-create.vue'),
      },
      {
        path: 'student-detail/:id',
        component: () => import('@/pages/student-detail.vue'),
      },
      {
        path: 'account-settings',
        component: () => import('@/pages/account-settings.vue'),
      },
      {
        path: 'calendar',
        component: () => import('@/pages/calendar.vue'),
      },
      {
        path: 'billing',
        component: () => import('@/pages/billing.vue'),
      },
      {
        path: 'building-list',
        component: () => import('@/pages/building-list.vue'),
      },
      {
        path: 'building-create',
        component: () => import('@/pages/building-create.vue'),
      },
      {
        path: 'building-detail/:id',
        component: () => import('@/pages/building-detail.vue'),
      },
      {
        path: 'room-create',
        component: () => import('@/pages/room-create.vue'),
      },
      {
        path: 'room-detail/:id',
        component: () => import('@/pages/room-detail.vue'),
      },
      {
        path: 'resident-detail/:id',
        component: () => import('@/pages/resident-detail.vue'),
      },
      {
        path: 'care-facility-meal-record',
        component: () => import('@/pages/care-facility-meal-record.vue'),
      },
      {
        path: 'elderly-list',
        component: () => import('@/pages/elderly-list.vue'),
      },
      {
        path: 'elderly-create',
        component: () => import('@/pages/elderly-create.vue'),
      },
      {
        path: 'elderly-building-list',
        component: () => import('@/pages/building-list.vue'),
      },
      {
        path: 'typography',
        component: () => import('@/pages/typography.vue'),
      },
      {
        path: 'icons',
        component: () => import('@/pages/icons.vue'),
      },
      {
        path: 'cards',
        component: () => import('@/pages/cards.vue'),
      },
      {
        path: 'tables',
        component: () => import('@/pages/tables.vue'),
      },
      {
        path: 'form-layouts',
        component: () => import('@/pages/form-layouts.vue'),
      },
      {
        path: 'chat',
        component: () => import('@/pages/chat.vue'),
      },
    ],
  },
  {
    path: '/',
    component: () => import('@/layouts/blank.vue'),
    children: [
      {
        path: 'login',
        component: () => import('@/pages/login.vue'),
      },
      {
        path: 'register',
        component: () => import('@/pages/register.vue'),
      },
      {
        path: '/:pathMatch(.*)*',
        component: () => import('@/pages/[...error].vue'),
      },
    ],
  },
]
