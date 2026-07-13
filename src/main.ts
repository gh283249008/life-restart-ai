import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'

import App from './App.vue'
import './style.css'
import { initBgm } from './services/bgm'

// 路由配置
import HomeView from './views/HomeView.vue'
import GameView from './views/GameView.vue'
import LoadingView from './views/LoadingView.vue'
import ResultView from './views/ResultView.vue'
import PosterView from './views/PosterView.vue'
import StatsView from './views/StatsView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/loading' },
    { path: '/loading', name: 'Loading', component: LoadingView },
    { path: '/lobby', name: 'Lobby', component: HomeView },
    { path: '/game', name: 'Game', component: GameView },
    { path: '/result', name: 'Result', component: ResultView },
    { path: '/poster', name: 'Poster', component: PosterView },
    { path: '/stats', name: 'Stats', component: StatsView }
  ]
})

const app = createApp(App)
app.use(router)

initBgm()
app.mount('#app')
