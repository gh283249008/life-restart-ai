import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

import App from './App.vue'
import './style.css'

// 路由配置
import HomeView from './views/HomeView.vue'
import GameView from './views/GameView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'Home', component: HomeView },
    { path: '/game', name: 'Game', component: GameView }
  ]
})

const app = createApp(App)
app.use(router)

app.mount('#app')
