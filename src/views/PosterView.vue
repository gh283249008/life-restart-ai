<template>
  <div v-if="snapshot" class="max-w-4xl mx-auto space-y-6">
    <div id="poster-card" class="rounded-2xl p-6 bg-gradient-to-br from-blue-600 via-cyan-500 to-teal-500 text-white shadow-xl">
      <p class="text-sm opacity-90">好薯坏薯・票务反诈局</p>
      <h3 class="mt-3 text-3xl font-bold">骗子{{ snapshot.finalReport.result }}</h3>
      <p class="mt-2 text-lg">我的积分：{{ snapshot.score }}</p>
      <p class="mt-4 text-sm leading-6 bg-white/15 rounded-lg p-3">{{ snapshot.finalReport.scammerSummary }}</p>
      <div class="mt-4 bg-white/10 rounded-lg p-3">
        <h4 class="font-semibold mb-2">反诈三招</h4>
        <ul class="list-disc pl-5 text-sm space-y-1">
          <li v-for="(tip, idx) in snapshot.finalReport.tips" :key="idx">{{ tip }}</li>
        </ul>
      </div>
    </div>

    <div class="game-card">
      <div class="flex flex-col sm:flex-row gap-3">
        <button class="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" @click="shareToXiaohongshu">一键分享到小红书</button>
        <button class="px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50" @click="openSafeShuProfile">关注安全薯</button>
        <button class="px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50" @click="backResult">返回结算页</button>
        <button class="px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50" @click="backLobby">返回大厅</button>
      </div>
      <p v-if="copyTip" class="mt-2 text-sm text-green-700">{{ copyTip }}</p>
    </div>
  </div>

  <div v-else class="max-w-3xl mx-auto">
    <div class="game-card text-center">
      <p class="text-gray-700">没有可用结算数据，请先完成一局游戏。</p>
      <button class="mt-4 px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" @click="backLobby">前往大厅</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { loadGameResultSnapshot } from '@/services/gameSessionStore'
import { openSafeShuProfile } from '@/services/safeShuLink'

const router = useRouter()
const snapshot = computed(() => loadGameResultSnapshot())
const copyTip = ref('')
const XHS_PUBLISH_DEEPLINK =
  'xhsdiscover://post_new_note?page=photo_publish&attach=%7B%22topics%22%3A%5B%7B%22page_id%22%3A%22695a6dae0017000000000002%22%7D%5D%7D&config=%7B%7D'

function shareToXiaohongshu() {
  copyTip.value = '正在打开小红书发布页...'
  const startedAt = Date.now()

  const timer = window.setTimeout(() => {
    if (Date.now() - startedAt < 1300) return
    copyTip.value = '未检测到小红书客户端，请确认已安装后重试。'
  }, 1500)

  const onVisibilityChange = () => {
    if (document.hidden) {
      window.clearTimeout(timer)
      copyTip.value = ''
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }

  document.addEventListener('visibilitychange', onVisibilityChange)
  window.location.href = XHS_PUBLISH_DEEPLINK
}

async function backResult() {
  await router.push('/result')
}

async function backLobby() {
  await router.replace('/lobby')
}
</script>
