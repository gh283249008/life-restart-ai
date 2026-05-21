<template>
  <div v-if="snapshot" class="max-w-4xl mx-auto space-y-6">
    <div class="game-card">
      <h2 class="text-2xl font-bold text-gray-800">分享海报</h2>
      <p class="mt-2 text-sm text-gray-500">纯H5版本，可截图分享至小红书</p>
    </div>

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
      <h4 class="font-semibold text-gray-800 mb-2">分享文案</h4>
      <textarea
        readonly
        :value="shareText"
        class="w-full h-28 border border-gray-300 rounded p-3 text-sm text-gray-700"
      />
      <div class="mt-3 flex flex-col sm:flex-row gap-3">
        <button class="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" @click="copyShareText">复制文案</button>
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

const router = useRouter()
const snapshot = computed(() => loadGameResultSnapshot())
const copyTip = ref('')

const shareText = computed(() => {
  if (!snapshot.value) return ''
  const theme = snapshot.value.theme?.name || '票务反诈'
  return `我在「好薯坏薯・票务反诈局」完成了一局${theme}挑战，结果是骗子${snapshot.value.finalReport.result}，得分${snapshot.value.score}。你也来试试！`
})

async function copyShareText() {
  try {
    await navigator.clipboard.writeText(shareText.value)
    copyTip.value = '文案已复制，去发布页粘贴即可。'
  } catch {
    copyTip.value = '复制失败，请手动选择文案复制。'
  }
}

async function backResult() {
  await router.push('/result')
}

async function backLobby() {
  await router.replace('/lobby')
}
</script>
