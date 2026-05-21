import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'

import App from './App.vue'
import './style.css'

// 路由配置
import HomeView from './views/HomeView.vue'
import GameView from './views/GameView.vue'
import ResultView from './views/ResultView.vue'
import PosterView from './views/PosterView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/lobby' },
    { path: '/lobby', name: 'Lobby', component: HomeView },
    { path: '/game', name: 'Game', component: GameView },
    { path: '/result', name: 'Result', component: ResultView },
    { path: '/poster', name: 'Poster', component: PosterView }
  ]
})

const app = createApp(App)
app.use(router)

app.mount('#app')
