<template>
  <div id="app" class="min-h-screen">
    <nav class="bg-white shadow-sm border-b">
      <div class="max-w-6xl mx-auto px-4">
        <div class="flex justify-between items-center h-16">
          <h1 class="text-xl font-bold text-gray-800">好薯坏薯・票务反诈局</h1>
          
          <!-- 右侧菜单 -->
          <div class="hidden md:flex space-x-6">
            <router-link
              to="/"
              class="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md transition-colors"
              :class="{ 'text-primary-600 bg-primary-50': $route.name === 'Home' }"
            >
              首页
            </router-link>
            <router-link
              to="/game"
              class="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md transition-colors"
              :class="{ 'text-primary-600 bg-primary-50': $route.name === 'Game' }"
            >
              进入对局
            </router-link>
            <router-link
              to="/stats"
              class="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md transition-colors"
              :class="{ 'text-primary-600 bg-primary-50': $route.name === 'Stats' }"
            >
              统计后台
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
