<template>
  <div v-if="snapshot" class="max-w-4xl mx-auto space-y-6">
    <div class="game-card border-blue-200 bg-blue-50">
      <h2 class="text-2xl font-bold text-blue-900">结算：骗子{{ snapshot.finalReport.result }}</h2>
      <p class="mt-2 text-sm text-blue-800">最终积分：{{ snapshot.score }}</p>
      <p v-if="snapshot.theme" class="mt-1 text-xs text-blue-700">对局情节：{{ snapshot.theme.name }}</p>
    </div>

    <div class="game-card">
      <h3 class="text-lg font-semibold text-gray-800 mb-2">骗子总结</h3>
      <p class="text-gray-700">{{ snapshot.finalReport.scammerSummary }}</p>
    </div>

    <div class="game-card">
      <h3 class="text-lg font-semibold text-gray-800 mb-2">反诈科普</h3>
      <ul class="list-disc pl-5 text-sm text-gray-700 space-y-1">
        <li v-for="(tip, idx) in snapshot.finalReport.tips" :key="idx">{{ tip }}</li>
      </ul>
    </div>

    <div class="flex flex-col sm:flex-row gap-3">
      <button class="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" @click="goPoster">生成分享海报</button>
      <button class="px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50" @click="openSafeShuProfile">关注安全薯</button>
      <button class="px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50" @click="playAgain">再来一局</button>
      <button class="px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50" @click="backLobby">返回大厅</button>
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
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { loadGameResultSnapshot } from '@/services/gameSessionStore'
import { openSafeShuProfile } from '@/services/safeShuLink'

const router = useRouter()
const snapshot = computed(() => loadGameResultSnapshot())

async function goPoster() {
  await router.push('/poster')
}

async function playAgain() {
  await router.replace('/game')
}

async function backLobby() {
  await router.replace('/lobby')
}
</script>
