<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <div class="game-card">
      <h2 class="text-2xl font-bold text-gray-800">统计后台</h2>
      <p class="text-sm text-gray-500 mt-2">按日期查看对局与选择分布</p>
    </div>

    <div class="game-card">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-800">今日统计</h3>
        <select
          v-model="selectedDate"
          class="p-2 border border-gray-300 rounded-md text-sm"
          @change="refresh"
        >
          <option v-for="d in recentDates" :key="d.date" :value="d.date">{{ d.label }}</option>
        </select>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="text-center p-4 bg-blue-50 rounded-lg">
          <div class="text-2xl font-bold text-blue-700">{{ current.totalSessions }}</div>
          <div class="text-sm text-gray-600">对局数</div>
        </div>
        <div class="text-center p-4 bg-blue-50 rounded-lg">
          <div class="text-2xl font-bold text-blue-700">{{ current.totalRounds }}</div>
          <div class="text-sm text-gray-600">总回合数</div>
        </div>
        <div class="text-center p-4 bg-blue-50 rounded-lg">
          <div class="text-2xl font-bold text-blue-700">{{ current.avgScore }}</div>
          <div class="text-sm text-gray-600">平均积分</div>
        </div>
        <div class="text-center p-4 bg-blue-50 rounded-lg">
          <div class="text-2xl font-bold text-blue-700">{{ current.totalRounds > 0 ? correctRate : '0' }}%</div>
          <div class="text-sm text-gray-600">正确率</div>
        </div>
      </div>

      <h4 class="text-md font-semibold text-gray-800 mb-3">选项分布</h4>
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-sm text-green-700 font-medium">正确选项</span>
          <div class="flex-1 mx-4">
            <div class="w-full bg-gray-200 rounded-full h-4">
              <div class="bg-green-500 h-4 rounded-full" :style="{ width: correctRate + '%' }"></div>
            </div>
          </div>
          <span class="text-sm text-gray-700 w-24 text-right">{{ current.correctCount }} 次 ({{ correctRate }}%)</span>
        </div>

        <div class="flex items-center justify-between">
          <span class="text-sm text-red-700 font-medium">错误选项</span>
          <div class="flex-1 mx-4">
            <div class="w-full bg-gray-200 rounded-full h-4">
              <div class="bg-red-500 h-4 rounded-full" :style="{ width: wrongRate + '%' }"></div>
            </div>
          </div>
          <span class="text-sm text-gray-700 w-24 text-right">{{ current.wrongCount }} 次 ({{ wrongRate }}%)</span>
        </div>

        <div class="flex items-center justify-between">
          <span class="text-sm text-purple-700 font-medium">整活选项</span>
          <div class="flex-1 mx-4">
            <div class="w-full bg-gray-200 rounded-full h-4">
              <div class="bg-purple-500 h-4 rounded-full" :style="{ width: funnyRate + '%' }"></div>
            </div>
          </div>
          <span class="text-sm text-gray-700 w-24 text-right">{{ current.funnyCount }} 次 ({{ funnyRate }}%)</span>
        </div>

        <div class="flex items-center justify-between">
          <span class="text-sm text-amber-700 font-medium">自定义回复</span>
          <div class="flex-1 mx-4">
            <div class="w-full bg-gray-200 rounded-full h-4">
              <div class="bg-amber-500 h-4 rounded-full" :style="{ width: customRate + '%' }"></div>
            </div>
          </div>
          <span class="text-sm text-gray-700 w-24 text-right">{{ customTotal }} 次 ({{ customRate }}%)</span>
        </div>

        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-500 font-medium">跳过</span>
          <div class="flex-1 mx-4">
            <div class="w-full bg-gray-200 rounded-full h-4">
              <div class="bg-gray-400 h-4 rounded-full" :style="{ width: skipRate + '%' }"></div>
            </div>
          </div>
          <span class="text-sm text-gray-700 w-24 text-right">{{ current.skipCount }} 次 ({{ skipRate }}%)</span>
        </div>
      </div>
    </div>

    <div class="game-card">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">骗子胜负</h3>
      <div class="grid grid-cols-2 gap-4">
        <div class="text-center p-4 bg-red-50 rounded-lg border border-red-200">
          <div class="text-2xl font-bold text-red-700">{{ current.scammerWonCount }}</div>
          <div class="text-sm text-gray-600">骗子得逞</div>
        </div>
        <div class="text-center p-4 bg-green-50 rounded-lg border border-green-200">
          <div class="text-2xl font-bold text-green-700">{{ current.scammerLostCount }}</div>
          <div class="text-sm text-gray-600">骗子认输</div>
        </div>
      </div>
    </div>

    <div class="game-card">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">近 7 天趋势</h3>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b">
              <th class="py-2 text-left text-gray-600">日期</th>
              <th class="py-2 text-center text-gray-600">对局</th>
              <th class="py-2 text-center text-gray-600">回合</th>
              <th class="py-2 text-center text-gray-600">正确率</th>
              <th class="py-2 text-center text-gray-600">错误率</th>
              <th class="py-2 text-center text-gray-600">整活率</th>
              <th class="py-2 text-center text-gray-600">平均积分</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in weekStats" :key="d.date" class="border-b hover:bg-gray-50">
              <td class="py-2 text-left text-gray-800">{{ d.date }}</td>
              <td class="py-2 text-center text-gray-700">{{ d.totalSessions }}</td>
              <td class="py-2 text-center text-gray-700">{{ d.totalRounds }}</td>
              <td class="py-2 text-center text-green-700">{{ d.totalRounds > 0 ? Math.round(d.correctCount / d.totalRounds * 100) : 0 }}%</td>
              <td class="py-2 text-center text-red-700">{{ d.totalRounds > 0 ? Math.round(d.wrongCount / d.totalRounds * 100) : 0 }}%</td>
              <td class="py-2 text-center text-purple-700">{{ d.totalRounds > 0 ? Math.round(d.funnyCount / d.totalRounds * 100) : 0 }}%</td>
              <td class="py-2 text-center text-blue-700">{{ d.avgScore }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getDayStats, getRecentDayStats, type DayStats } from '@/services/statsStore'

const selectedDate = ref(new Date().toISOString().slice(0, 10))
const current = ref<DayStats>(getDayStats())
const weekStats = ref<DayStats[]>([])

function refresh() {
  current.value = getDayStats(selectedDate.value)
  weekStats.value = getRecentDayStats(7)
}

const total = computed(() => current.value.totalRounds || 1)

const correctRate = computed(() => total.value > 0 ? Math.round(current.value.correctCount / total.value * 100) : 0)
const wrongRate = computed(() => total.value > 0 ? Math.round(current.value.wrongCount / total.value * 100) : 0)
const funnyRate = computed(() => total.value > 0 ? Math.round(current.value.funnyCount / total.value * 100) : 0)
const customTotal = computed(() => current.value.customSafeCount + current.value.customRiskyCount + current.value.customTeaseCount)
const customRate = computed(() => total.value > 0 ? Math.round(customTotal.value / total.value * 100) : 0)
const skipRate = computed(() => total.value > 0 ? Math.round(current.value.skipCount / total.value * 100) : 0)

const recentDates = computed(() => {
  const dates = []
  const now = new Date()
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(now.getTime() - i * 86400000)
    const dateStr = d.toISOString().slice(0, 10)
    const label = i === 0 ? '今天' : i === 1 ? '昨天' : dateStr
    dates.push({ date: dateStr, label })
  }
  return dates
})

onMounted(() => {
  refresh()
})
</script>