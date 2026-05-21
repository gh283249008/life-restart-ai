<template>
  <div id="app" class="min-h-screen">
    <nav class="bg-white shadow-sm border-b">
      <div class="max-w-6xl mx-auto px-4">
        <div class="flex justify-between items-center h-16">
          <h1 class="text-xl font-bold text-gray-800">好薯坏薯・票务反诈局</h1>
          
          <!-- 右侧菜单 -->
          <div class="hidden md:flex space-x-6">
            <router-link
              to="/lobby"
              class="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md transition-colors"
              :class="{ 'text-primary-600 bg-primary-50': $route.name === 'Lobby' }"
            >
              Lobby
            </router-link>
            <router-link
              to="/game"
              class="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md transition-colors"
              :class="{ 'text-primary-600 bg-primary-50': $route.name === 'Game' }"
            >
              游戏
            </router-link>
            <router-link
              to="/result"
              class="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md transition-colors"
              :class="{ 'text-primary-600 bg-primary-50': $route.name === 'Result' }"
            >
              结算
            </router-link>
            <router-link
              to="/poster"
              class="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md transition-colors"
              :class="{ 'text-primary-600 bg-primary-50': $route.name === 'Poster' }"
            >
              海报
            </router-link>
          </div>
        </div>
      </div>
    </nav>

    <main class="max-w-6xl mx-auto px-4 py-8">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
// App组件作为应用根组件
</script>
