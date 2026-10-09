import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import './style.css'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: () => import('./views/DashboardView.vue') },
    { path: '/week', component: () => import('./views/WeekView.vue') },
    { path: '/report', component: () => import('./views/ReportView.vue') },
    { path: '/settings', component: () => import('./views/SettingsView.vue') },
  ],
})

createApp(App).use(createPinia()).use(router).mount('#app')
