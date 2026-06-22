<template>
  <div class="poster-canvas">
    <img class="poster-background" :src="posterBackgroundImage" alt="" aria-hidden="true" />
    <img class="poster-logo" :src="posterLogoImage" alt="小红书" />
    <div class="poster-result-title">
      <p class="poster-result-scenario">{{ resultScenarioTitle }}</p>
      <p class="poster-result-finish">调查完毕！</p>
    </div>
    <div class="poster-anti-fraud-copy">
      <p v-for="tip in resultTips" :key="tip">{{ tip }}</p>
    </div>
    <div class="poster-villain-card">
      <p class="poster-villain-eyebrow">今日坏瓜图鉴</p>
      <p class="poster-villain-name">{{ resultVillainCard.name }}</p>
      <p class="poster-villain-desc">{{ resultVillainCard.desc }}</p>
      <p class="poster-villain-review">{{ resultPlayerSummary }}</p>
    </div>
    <img class="poster-search" :src="posterSearchImage" alt="小红书搜索 红薯地安全指南" />
  </div>
</template>

<script setup lang="ts">
import { loadGameResultSnapshot } from '@/services/gameSessionStore'
import posterBackgroundImage from '@/assets/game/poster-background.webp'
import posterLogoImage from '@/assets/game/poster-logo.webp'
import posterSearchImage from '@/assets/game/poster-search.webp'

const snapshot = loadGameResultSnapshot()
const resultScenarioTitle = snapshot?.theme?.name || '本局情景'
const SCENARIO_VILLAIN_CARD_MAP: Record<string, { name: string; desc: string }> = {
  star_concert: { name: '假票瓜', desc: '票是P的，码是假的，人是跑路的。' },
  music_festival: { name: '缩水瓜', desc: '三天通票变单日，比泡面包装还能缩。' },
  school_show: { name: '拼单瓜', desc: '群里喊拼单，最后只有群主拼到了钱。' },
  last_minute: { name: '捡漏瓜', desc: '你以为是捡漏，其实是捡了个坑。' },
  fan_group: { name: '代抢瓜', desc: '帮你抢票是假，帮你花钱是真。' },
  overseas_show: { name: '海淘瓜', desc: '“我在海外帮你买”，IP一查在隔壁县。' },
  sports_event: { name: '假赛瓜', desc: '赛事还没官宣，它的票已经印好了。' },
  scalper_ticket: { name: '黄牛瓜', desc: '加价三倍，检票口一照，无效。' },
  fake_platform: { name: '山寨瓜', desc: '网页和官方一模一样，除了收款人。' },
  refund_scam: { name: '连环瓜', desc: '票没了，手续费也没了，人也没了。' },
  world_cup: { name: '赌球瓜', desc: '票没买到，倒先输了一套房。' }
}
const resultVillainCard =
  (snapshot?.theme?.id && SCENARIO_VILLAIN_CARD_MAP[snapshot.theme.id]) ||
  { name: '坏瓜', desc: '套路很多，但破绽也很明显。' }
const resultPlayerSummary =
  snapshot?.finalReport?.playerSummary ||
  '这局你完成了关键识别，记住所有绕开平台、催促转账、索要隐私的行为都要提高警惕。'
const resultTips = (
  snapshot?.finalReport?.tips?.length
    ? snapshot.finalReport.tips
    : [
        '坚持平台担保交易，不私下转账。',
        '验证码、身份证、银行卡信息不要发给陌生人。',
        '遇到催促付款、绕开验真的话术，先停下来核实。'
      ]
).slice(0, 2)
</script>

<style scoped>
.poster-canvas {
  position: relative;
  width: 768px;
  height: 1371px;
  flex: 0 0 auto;
  overflow: hidden;
}

.poster-background {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: fill;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
}

.poster-logo {
  position: absolute;
  left: 333px;
  top: 20px;
  z-index: 2;
  display: block;
  width: 103px;
  height: auto;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
}

.poster-search {
  position: absolute;
  left: 229px;
  bottom: 0px;
  z-index: 2;
  display: block;
  width: 310px;
  height: auto;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
}

.poster-result-title {
  position: absolute;
  left: 78px;
  top: 480px;
  z-index: 2;
  width: 420px;
  color: #4a2712;
  text-align: center;
  pointer-events: none;
}

.poster-result-title p {
  margin: 0;
  font-weight: 600;
  letter-spacing: 0;
  white-space: nowrap;
}

.poster-result-scenario,
.poster-result-finish {
  font-size: 46px;
  line-height: 1.12;
}

.poster-result-finish {
  margin-top: 8px !important;
}

.poster-anti-fraud-copy {
  position: absolute;
  left: 315px;
  top: 725px;
  z-index: 2;
  width: 350px;
  color: #4a2712;
  text-align: left;
  pointer-events: none;
}

.poster-anti-fraud-copy p {
  margin: 0 0 18px;
  font-size: 25px;
  line-height: 1.35;
  font-weight: 200;
  letter-spacing: 0;
  text-indent: 2em;
  word-break: break-word;
}

.poster-villain-card {
  position: absolute;
  left: 122px;
  top: 1040px;
  z-index: 2;
  width: 490px;
  color: #4a2712;
  text-align: left;
  pointer-events: none;
}

.poster-villain-card p {
  margin: 0;
  letter-spacing: 0;
  word-break: break-word;
}

.poster-villain-eyebrow {
  font-size: 26px;
  line-height: 1.1;
  font-weight: 600;
}

.poster-villain-name {
  margin-top: 8px !important;
  color: #c7382b;
  font-size: 44px;
  line-height: 1.05;
  font-weight: 800;
  white-space: nowrap;
}

.poster-villain-desc,
.poster-villain-review {
  font-size: 22px;
  line-height: 1.32;
  font-weight: 200;
}

.poster-villain-desc {
  margin-top: 12px !important;
}

.poster-villain-review {
  margin-top: 8px !important;
}
</style>
