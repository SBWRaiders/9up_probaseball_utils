<script setup lang="ts">
import { ref, computed } from 'vue'
import { Zap, RefreshCw, ArrowRight, Check, X, Calculator, History } from 'lucide-vue-next'

/* =========================
   상수 및 확률 설정 (표 기반)
========================= */
const BASE_PROBS = [
  1.0, 1.0, 0.8, 0.6, 0.5, 0.4, 0.3, 0.2, 
  0.1, 0.075, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05
]
const FAIL_BONUS = 0.025 // 실패 시 2.5% 증가
const MAX_LEVEL = 16

/* =========================
   1. 강화 시뮬레이터 State
========================= */
const currentLevel = ref(0)
const failStack = ref(0)
const totalCardsUsed = ref(0)
const logs = ref<{ id: number, type: 'success' | 'fail', from: number, to: number, prob: number, count: number }[]>([])
let logId = 0

const currentBaseProb = computed(() => BASE_PROBS[currentLevel.value] ?? 0.05)
// 기본 확률 + (실패 횟수 * 2.5%) -> 최대 100%
const currentRealProb = computed(() => Math.min(1.0, currentBaseProb.value + failStack.value * FAIL_BONUS))

const tryEnhance = () => {
  if (currentLevel.value >= MAX_LEVEL) return

  totalCardsUsed.value++
  const r = Math.random()
  const success = r <= currentRealProb.value

  // 로그 기록
  logs.value.unshift({
    id: logId++,
    type: success ? 'success' : 'fail',
    from: currentLevel.value,
    to: success ? currentLevel.value + 1 : currentLevel.value,
    prob: currentRealProb.value,
    count: totalCardsUsed.value
  })

  // 100개까지만 로그 유지
  if (logs.value.length > 100) logs.value.pop()

  if (success) {
    currentLevel.value++
    failStack.value = 0 // 성공 시 보너스 초기화
  } else {
    failStack.value++
  }
}

const resetSimulator = () => {
  currentLevel.value = 0
  failStack.value = 0
  totalCardsUsed.value = 0
  logs.value = []
}

/* =========================
   2. 기대값 계산기 (표 자동 생성)
========================= */
// 각 레벨별 기댓값을 수식으로 완벽히 재현
const expectedValues = computed(() => {
  return BASE_PROBS.map((prob) => {
    let expectedTries = 0
    let reachProb = 1.0
    
    // 최대 100번 시도한다고 가정하고 무한급수 계산
    for (let k = 1; k < 100; k++) {
      const currentTryProb = Math.min(1.0, prob + (k - 1) * FAIL_BONUS)
      expectedTries += k * reachProb * currentTryProb
      reachProb *= (1 - currentTryProb)
      if (reachProb <= 0) break
    }
    return expectedTries
  })
})

const calcStartLevel = ref(0)
const calcTargetLevel = ref(10)

const calculatedExpectedCards = computed(() => {
  const start = calcStartLevel.value
  const target = calcTargetLevel.value
  if (start >= target) return 0
  
  let total = 0
  for (let i = start; i < target; i++) {
    total += expectedValues.value[i]
  }
  return total
})
</script>

<template>
  <div class="max-w-5xl mx-auto p-4 sm:p-6 space-y-12 font-sans text-neutral-900 dark:text-neutral-100 min-h-screen">
    
    <!-- 헤더 -->
    <header class="text-center space-y-2">
      <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight">강화 시뮬레이터 & 기대값</h1>
      <p class="text-neutral-500 dark:text-neutral-400">실패 시 확률 증가(2.5%)가 적용된 리얼 시뮬레이터입니다.</p>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      
      <!-- [왼쪽 패널] 실전 시뮬레이터 -->
      <section class="space-y-6">
        <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm flex flex-col items-center relative overflow-hidden">
          
          <div class="absolute top-4 right-4 flex items-center gap-1 text-sm font-semibold text-neutral-400">
            <RefreshCw @click="resetSimulator" class="w-5 h-5 cursor-pointer hover:text-blue-500 transition-colors" />
          </div>

          <!-- 강화 스탯 표시 -->
          <div class="text-center space-y-4 my-8">
            <div class="flex items-center justify-center gap-4 text-5xl font-black">
              <span :class="currentLevel >= MAX_LEVEL ? 'text-yellow-500' : 'text-neutral-400'">
                +{{ currentLevel }}
              </span>
              <ArrowRight v-if="currentLevel < MAX_LEVEL" class="w-8 h-8 text-neutral-300" />
              <span v-if="currentLevel < MAX_LEVEL" class="text-blue-500">
                +{{ currentLevel + 1 }}
              </span>
            </div>
            
            <div v-if="currentLevel < MAX_LEVEL" class="space-y-1">
              <p class="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                성공 확률: {{ (currentRealProb * 100).toFixed(1) }}%
              </p>
              <p v-if="failStack > 0" class="text-sm font-medium text-red-500">
                (기본 {{ (currentBaseProb * 100).toFixed(1) }}% + 실패 보너스 {{ (failStack * FAIL_BONUS * 100).toFixed(1) }}%)
              </p>
              <p v-else class="text-sm font-medium text-neutral-400">
                기본 확률 {{ (currentBaseProb * 100).toFixed(1) }}%
              </p>
            </div>
            <div v-else class="text-2xl font-bold text-yellow-500 pt-4">
              MAX LEVEL 도달! 🎉
            </div>
          </div>

          <!-- 버튼 -->
          <button 
            @click="tryEnhance"
            :disabled="currentLevel >= MAX_LEVEL"
            class="w-full sm:w-2/3 py-4 rounded-xl flex items-center justify-center gap-2 text-lg font-bold text-white transition-all transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            :class="currentLevel >= MAX_LEVEL ? 'bg-neutral-300 dark:bg-neutral-800' : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30'"
          >
            <Zap class="w-6 h-6" />
            {{ currentLevel >= MAX_LEVEL ? '최고 레벨' : '강화 시도 (카드 1장 소모)' }}
          </button>
          
          <div class="mt-6 text-neutral-500 font-medium">
            현재까지 소모된 카드: <span class="text-neutral-800 dark:text-neutral-200 font-bold">{{ totalCardsUsed }}</span> 장
          </div>
        </div>

        <!-- 시뮬레이션 로그 -->
        <div class="bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl p-4 h-64 overflow-y-auto border border-neutral-200 dark:border-neutral-800">
          <div class="flex items-center gap-2 mb-3 px-2 text-neutral-700 dark:text-neutral-300 font-semibold">
            <History class="w-5 h-5" /> 강화 기록
          </div>
          <div class="space-y-2">
            <div v-for="log in logs" :key="log.id" 
                 class="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 text-sm">
              <div class="flex items-center gap-3">
                <span v-if="log.type === 'success'" class="bg-blue-100 text-blue-600 p-1 rounded-md"><Check class="w-4 h-4"/></span>
                <span v-else class="bg-red-100 text-red-600 p-1 rounded-md"><X class="w-4 h-4"/></span>
                
                <span class="font-medium text-neutral-700 dark:text-neutral-200">
                  +{{ log.from }} ➔ +{{ log.to }}
                </span>
              </div>
              <div class="text-neutral-400 text-xs text-right">
                확률 {{ (log.prob * 100).toFixed(1) }}%<br/>
                <span class="text-neutral-300">누적 {{ log.count }}장</span>
              </div>
            </div>
            <div v-if="logs.length === 0" class="text-center text-neutral-400 py-10 text-sm">
              아직 시도한 기록이 없습니다.
            </div>
          </div>
        </div>
      </section>

      <!-- [오른쪽 패널] 기대값 계산기 및 표 -->
      <section class="space-y-6">
        
        <!-- 목표 레벨 계산기 -->
        <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
          <div class="flex items-center gap-2 mb-6 font-bold text-xl">
            <Calculator class="w-6 h-6 text-blue-500" />
            목표 레벨 필요 카드 계산기
          </div>
          
          <div class="flex items-center gap-4 mb-6">
            <div class="flex-1">
              <label class="block text-sm font-medium text-neutral-500 mb-1">시작 레벨</label>
              <select v-model="calcStartLevel" class="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500">
                <option v-for="n in 16" :key="`start-${n-1}`" :value="n-1">+{{ n-1 }}</option>
              </select>
            </div>
            <ArrowRight class="w-6 h-6 text-neutral-300 mt-6" />
            <div class="flex-1">
              <label class="block text-sm font-medium text-neutral-500 mb-1">목표 레벨</label>
              <select v-model="calcTargetLevel" class="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500">
                <option v-for="n in 16" :key="`target-${n}`" :value="n">+{{ n }}</option>
              </select>
            </div>
          </div>
          
          <div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5 text-center">
            <div class="text-sm text-blue-600 dark:text-blue-400 font-semibold mb-1">평균적으로 필요한 카드 수</div>
            <div class="text-3xl font-black text-blue-700 dark:text-blue-300">
              {{ calculatedExpectedCards > 0 ? calculatedExpectedCards.toFixed(3) : '0.000' }} <span class="text-base font-normal">장</span>
            </div>
          </div>
        </div>

        <!-- 확률 및 기대값 표 -->
        <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm text-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-center whitespace-nowrap">
              <thead class="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 text-neutral-500">
                <tr>
                  <th class="py-3 px-4 font-semibold">강화 단계</th>
                  <th class="py-3 px-4 font-semibold">기본 확률</th>
                  <th class="py-3 px-4 font-semibold">1업 기대값</th>
                  <th class="py-3 px-4 font-semibold">누적 필요 수</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
                <tr v-for="(prob, idx) in BASE_PROBS" :key="idx" 
                    :class="{'bg-blue-50/50 dark:bg-blue-900/10': currentLevel === idx}"
                    class="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                  <td class="py-2.5 px-4 font-medium text-neutral-900 dark:text-neutral-100">
                    +{{ idx }} ➔ +{{ idx + 1 }}
                  </td>
                  <td class="py-2.5 px-4">{{ (prob * 100).toFixed(1) }}%</td>
                  <td class="py-2.5 px-4">{{ expectedValues[idx].toFixed(3) }}</td>
                  <td class="py-2.5 px-4 text-blue-600 dark:text-blue-400 font-semibold">
                    {{ expectedValues.slice(0, idx + 1).reduce((a, b) => a + b, 0).toFixed(3) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </section>
    </div>
  </div>
</template>
