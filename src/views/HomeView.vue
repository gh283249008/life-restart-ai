<template>
  <div class="text-center h-full flex flex-col">
    <div class="mb-4">
      <h1 class="text-3xl text-gray-800 mb-2">好薯坏薯・票务反诈局</h1>
      <p class="text-base text-gray-600 mb-1">社交鉴别小游戏</p>
      <p class="text-gray-500">你将和神秘网友聊天，识破演唱会与音乐节票务诈骗套路。</p>
    </div>

    <div class="game-card p-4 mb-4 text-left max-w-3xl mx-auto">
      <h3 class="text-lg text-gray-800 mb-4">反诈重点</h3>
      <ul class="list-disc pl-5 space-y-2 text-gray-700 text-sm">
        <li>脱离平台私聊并要求先转账、先付定金，是高风险信号。</li>
        <li>催促你"马上拍"、"最后一张"、"错过没了"，常见于心理施压套路。</li>
          <li>完成 5 轮后进入统一科普页，形成可执行的防骗动作。</li>
        </ul>
      </div>

    <div class="mt-auto pt-2 flex flex-col sm:flex-row gap-3 justify-center">
      <button
        type="button"
        :disabled="!hasFollowedSafeShu"
        :class="[
          'px-8 py-3 text-white rounded-lg transition-colors',
          hasFollowedSafeShu
            ? 'bg-primary-600 hover:bg-primary-700'
            : 'bg-slate-300 cursor-not-allowed'
        ]"
        @click="startGame"
      >
        开始鉴别
      </button>
      <button
        type="button"
        class="px-8 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        @click="handleFollowSafeShu"
      >
        关注安全薯
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { openSafeShuProfile } from '@/services/safeShuLink'

const SAFE_SHU_FOLLOWED_KEY = 'safe_shu_followed'

const router = useRouter()
const hasFollowedSafeShu = ref(localStorage.getItem(SAFE_SHU_FOLLOWED_KEY) === '1')

function handleFollowSafeShu() {
  openSafeShuProfile()
  hasFollowedSafeShu.value = true
  localStorage.setItem(SAFE_SHU_FOLLOWED_KEY, '1')
}

function startGame() {
  if (!hasFollowedSafeShu.value) return
  router.push('/game')
}
</script>
