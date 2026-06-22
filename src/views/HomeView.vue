<template>
  <section class="lobby-screen">
    <img class="lobby-screen-image" :src="lobbyBackgroundImage" alt="Lobby 背景图" />

    <div class="lobby-screen-content">
      <button
        type="button"
        class="lobby-world-cup-button"
        @click="startWorldCupGame"
        aria-label="世界杯赛事专题"
      >
        <img class="lobby-world-cup-image" :src="worldCupTrophyImage" alt="世界杯赛事专题" />
      </button>
      <img class="lobby-world-cup-label" :src="worldCupLabelImage" alt="世界杯特辑" />
      <div class="lobby-actions">
        <div class="lobby-action-slot lobby-action-slot-start">
          <button
            type="button"
            :disabled="!hasFollowedSafeShu"
            :class="[
              'lobby-action-button lobby-action-start',
              hasFollowedSafeShu ? 'is-ready' : 'is-locked'
            ]"
            @click="startGame"
            aria-label="开始鉴别"
          >
            <img class="lobby-action-image" :src="startGameButtonAsset" alt="开始鉴别" />
          </button>
          <img
            v-if="hasFollowedSafeShu"
            class="lobby-finger-cursor lobby-finger-cursor-start"
            :src="fingerCursorImage"
            alt="点击引导"
            aria-hidden="true"
          />
        </div>
        <div class="lobby-action-slot lobby-action-slot-follow">
          <button
            type="button"
            class="lobby-action-button lobby-action-follow"
            @click="handleFollowSafeShu"
            aria-label="关注安全薯"
          >
            <img class="lobby-action-image" :src="followSafeShuButtonImage" alt="关注安全薯" />
          </button>
          <img
            v-if="!hasFollowedSafeShu"
            class="lobby-finger-cursor lobby-finger-cursor-follow"
            :src="fingerCursorImage"
            alt="点击引导"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { openSafeShuProfile } from '@/services/safeShuLink'
import lobbyBackgroundImage from '../../.monkeycode-tmp-files/a8653301-底图50dpi-12-1.webp'
import followSafeShuButtonImage from '../../.monkeycode-tmp-files/0c6936ab-关注安全薯-1.svg'
import startGameButtonImage from '../../.monkeycode-tmp-files/c8908c74-未标题-997781(2)-1.svg'
import startGameButtonDisabledImage from '../../.monkeycode-tmp-files/8652a2d7-灰色-2.svg'
import fingerCursorImage from '../../.monkeycode-tmp-files/5202eb90-小手-1.svg'
import worldCupTrophyImage from '@/assets/game/world-cup-trophy.webp'
import worldCupLabelImage from '@/assets/game/world-cup-label.png'

const SAFE_SHU_FOLLOWED_KEY = 'safe_shu_followed'

const router = useRouter()
const hasFollowedSafeShu = ref(localStorage.getItem(SAFE_SHU_FOLLOWED_KEY) === '1')

const startGameButtonAsset = computed(() => (
  hasFollowedSafeShu.value ? startGameButtonImage : startGameButtonDisabledImage
))

function handleFollowSafeShu() {
  openSafeShuProfile()
  hasFollowedSafeShu.value = true
  localStorage.setItem(SAFE_SHU_FOLLOWED_KEY, '1')
}

function startGame() {
  if (!hasFollowedSafeShu.value) return
  router.push('/game')
}

function startWorldCupGame() {
  router.push({ path: '/game', query: { theme: 'sports_event' } })
}
</script>
