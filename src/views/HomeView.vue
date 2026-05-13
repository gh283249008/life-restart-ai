<template>
  <div class="text-center">
    <div class="mb-10">
      <h1 class="text-5xl font-bold text-gray-800 mb-4">好薯坏薯・票务反诈局</h1>
      <p class="text-xl text-gray-600 mb-2">社交鉴别小游戏</p>
      <p class="text-gray-500">你将和神秘网友聊天，识破演唱会与音乐节票务诈骗套路。</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 text-left">
      <div class="game-card">
        <h3 class="text-lg font-semibold text-gray-800 mb-2">1. 对话开局</h3>
        <p class="text-sm text-gray-600">AI 扮演神秘网友，你收到一段票务相关消息。</p>
      </div>
      <div class="game-card">
        <h3 class="text-lg font-semibold text-gray-800 mb-2">2. 做出应对</h3>
        <p class="text-sm text-gray-600">可选 AI 生成应对方式，也可实时输入你的回复。</p>
      </div>
      <div class="game-card">
        <h3 class="text-lg font-semibold text-gray-800 mb-2">3. 积分结算</h3>
        <p class="text-sm text-gray-600">成功反诈 +10，风险回复 -5，戏耍中立 0 分，5 轮后统一结算。</p>
      </div>
    </div>

    <div class="game-card mb-8 text-left max-w-3xl mx-auto">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">反诈重点</h3>
      <ul class="list-disc pl-5 space-y-2 text-gray-700 text-sm">
        <li>脱离平台私聊并要求先转账、先付定金，是高风险信号。</li>
        <li>催促你"马上拍"、"最后一张"、"错过没了"，常见于心理施压套路。</li>
          <li>完成 5 轮后进入统一科普页，形成可执行的防骗动作。</li>
        </ul>
      </div>

    <div class="flex flex-col sm:flex-row gap-4 justify-center">
      <router-link
        to="/game"
        class="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
      >
        开始鉴别
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts"></script>
