<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch } from 'vue'
import Papa from 'papaparse'
import { Search, Calculator, Star, Shield, Zap, TrendingUp, X } from 'lucide-vue-next'

type Raw = Record<string, any>

const isLoading = ref(true)
const players = ref<Raw[]>([])
const searchQuery = ref('')
const selectedPlayer = ref<Raw | null>(null)

// 엑셀 계산기 스타일의 스탯 상태 (타자용, 투수용)
const batterStats = reactive({
  contact: { base: 0, enhance: 0, skill: 0, synergy: 0, label: '컨택' },
  gapPower: { base: 0, enhance: 0, skill: 0, synergy: 0, label: '갭파워' },
  homeRunPower: { base: 0, enhance: 0, skill: 0, synergy: 0, label: '홈런파워' },
  plateDiscipline: { base: 0, enhance: 0, skill: 0, synergy: 0, label: '선구' },
  strikeoutAvoidance: { base: 0, enhance: 0, skill: 0, synergy: 0, label: '삼진회피' },
  stealing: { base: 0, enhance: 0, skill: 0, synergy: 0, label: '도루' },
  baseRunning: { base: 0, enhance: 0, skill: 0, synergy: 0, label: '주루' },
  defense: { base: 0, enhance: 0, skill: 0, synergy: 0, label: '수비' },
})

const pitcherStats = reactive({
  movement: { base: 0, enhance: 0, skill: 0, synergy: 0, label: '무브먼트' },
  longHitSup: { base: 0, enhance: 0, skill: 0, synergy: 0, label: '장타억제' },
  hrSup: { base: 0, enhance: 0, skill: 0, synergy: 0, label: '홈런억제' },
  control: { base: 0, enhance: 0, skill: 0, synergy: 0, label: '컨트롤' },
  stuff: { base: 0, enhance: 0, skill: 0, synergy: 0, label: '스터프(구위)' },
  defense: { base: 0, enhance: 0, skill: 0, synergy: 0, label: '수비' },
  pitchLimit: { base: 0, enhance: 0, skill: 0, synergy: 0, label: '한계투구' },
  runnerCtrl: { base: 0, enhance: 0, skill: 0, synergy: 0, label: '주자견제' },
})

const isPitcher = computed(() => {
  if (!selectedPlayer.value) return false
  const pos = String(selectedPlayer.value.position || '').toUpperCase()
  return pos.includes('SP') || pos.includes('RP') || !!selectedPlayer.value.movement
})

// 카드 성수(rarity)에 따른 '스킬' 슬롯 개수 계산 (1~3성: 1개, 4성: 2개, 5~6성: 3개)
const maxSkillSlots = computed(() => {
  if (!selectedPlayer.value) return 0
  const r = Number(selectedPlayer.value.rarity || 0)
  if (r <= 3) return 1
  if (r === 4) return 2
  return 3
})

// 선수가 보유한 전체 스킬 목록 (기본 + 강화)
const availableSkills = computed(() => {
  if (!selectedPlayer.value) return []
  const getArray = (str: any) => {
    if (!str) return []
    return String(str).split(',').map(s => s.trim()).filter(Boolean)
  }
  const baseSkills = getArray(selectedPlayer.value.skill)
  const enhancedSkills = getArray(selectedPlayer.value.enhancedSkill)
  
  // 포수 전용 스킬 필터링 (파워 계산에서 아예 제외)
  const excludedCatcherSkills = ["야전사령관", "인사이드 워크", "투수 리드", "친화력", "도루 저지"]
  const filteredSkills = [...baseSkills, ...enhancedSkills].filter(s => !excludedCatcherSkills.includes(s))
  
  return Array.from(new Set(filteredSkills))
})

// 통합된 스킬 선택 슬롯
const selectedSkills = ref(['', '', ''])

// 수정 및 검수 완료된 스킬 상시 효과 데이터베이스 (조건부 스탯 철저히 배제)
const SKILL_EFFECTS: Record<string, any> = {
  "1번": {"powerPercent": 10.0, "stats": {}}, 
  "2번": {"powerPercent": 10.0, "stats": {}}, 
  "3번": {"powerPercent": 10.0, "stats": {}}, 
  "4번": {"powerPercent": 10.0, "stats": {}}, 
  "5번": {"powerPercent": 10.0, "stats": {}}, 
  "6번": {"powerPercent": 10.0, "stats": {}}, 
  "7번": {"powerPercent": 10.0, "stats": {}}, 
  "8번": {"powerPercent": 10.0, "stats": {}}, 
  "9번": {"powerPercent": 10.0, "stats": {}}, 
  "OPS형 타자": {"powerPercent": 0, "stats": {"gapPower": 10.0, "homeRunPower": 10.0}}, 
  "갭 히터": {"powerPercent": 0, "stats": {"gapPower": 15.0}}, 
  "게스히팅": {"powerPercent": 0, "stats": {"gapPower": 8.0, "homeRunPower": 10.0, "strikeoutAvoidance": -5.0}}, 
  "공갈포": {"powerPercent": 0, "stats": {"homeRunPower": 20.0, "contact": -7.0, "strikeoutAvoidance": -7.0}}, 
  "그라운드볼러": {"powerPercent": 0, "stats": {"movement": -5.0, "hrSup": 10.0, "longHitSup": 10.0}}, 
  "그린라이트": {"powerPercent": 0, "stats": {}}, 
  "너클볼": {"powerPercent": 0, "stats": {"stuff": 20.0, "hrSup": -5.0, "longHitSup": -5.0, "movement": 20.0, "control": 20.0}}, 
  "더티 무브먼트": {"powerPercent": 0, "stats": {"movement": 25.0}}, 
  "라이징 무브먼트": {"powerPercent": 0, "stats": {"stuff": 20.0}}, 
  "로우볼 히터": {"powerPercent": 0, "stats": {"gapPower": 5.0, "homeRunPower": 10.0, "plateDiscipline": -5.0}}, 
  "롱맨": {"powerPercent": 10.0, "stats": {}}, 
  "맞춰잡기": {"powerPercent": 0, "stats": {"control": 15.0, "pitchLimit": 10.0}}, 
  "묵직함": {"powerPercent": 0, "stats": {"longHitSup": 10.0, "hrSup": 10.0}}, 
  "믿을맨": {"powerPercent": 10.0, "stats": {}}, 
  "배드볼히터": {"powerPercent": 0, "stats": {"contact": 15.0, "gapPower": 20.0, "plateDiscipline": -3.0}}, 
  "배럴 히터": {"powerPercent": 0, "stats": {"contact": 10.0, "gapPower": 10.0, "strikeoutAvoidance": 10.0}}, 
  "변칙타순": {"powerPercent": 4.0, "stats": {}}, 
  "변칙투구": {"powerPercent": 0, "stats": {}}, 
  "선구안": {"powerPercent": 0, "stats": {"strikeoutAvoidance": 15.0, "plateDiscipline": 15.0}}, 
  "셋업": {"powerPercent": 10.0, "stats": {}}, 
  "스토퍼": {"powerPercent": 10.0, "stats": {}}, 
  "스플리터": {"powerPercent": 0, "stats": {"movement": 15.0, "stuff": 25.0, "control": -5.0}}, 
  "스피드스터": {"powerPercent": 0, "stats": {}}, 
  "슬랩 히터": {"powerPercent": 0, "stats": {"contact": 20.0, "baseRunning": 10.0}}, 
  "싱커": {"powerPercent": 0, "stats": {"hrSup": 20.0, "stuff": -5.0}}, 
  "에이스": {"powerPercent": 9.0, "stats": {}}, 
  "와일드씽": {"powerPercent": 0, "stats": {"control": -3.0, "stuff": 10.0}}, 
  "원투펀치": {"powerPercent": 8.0, "stats": {}}, 
  "원포인터": {"powerPercent": 10.0, "stats": {}}, 
  "이닝이팅": {"powerPercent": 0, "stats": {"pitchLimit": 5.0}}, 
  "적극성": {"powerPercent": 0, "stats": {"contact": 15.0}}, 
  "지명타자": {"powerPercent": 8.5, "stats": {}}, 
  "체인지업": {"powerPercent": 0, "stats": {"longHitSup": 15.0}}, 
  "커브": {"powerPercent": 0, "stats": {"movement": 15.0, "longHitSup": 10.0}}, 
  "컨택터": {"powerPercent": 0, "stats": {"contact": 20.0}}, 
  "클로저": {"powerPercent": 10.0, "stats": {}}, 
  "클린업": {"powerPercent": 8.0, "stats": {}}, 
  "타격 전략": {"powerPercent": 0, "stats": {"contact": 20.0}}, 
  "테이블세터": {"powerPercent": 7.0, "stats": {}}, 
  "파워": {"powerPercent": 0, "stats": {"gapPower": 15.0, "homeRunPower": 15.0}}, 
  "파이어볼러": {"powerPercent": 0, "stats": {"stuff": 15.0}}, 
  "펀치력": {"powerPercent": 0, "stats": {"gapPower": 10.0, "homeRunPower": 5.0}}, 
  "플라이볼피쳐": {"powerPercent": 0, "stats": {"movement": 20.0, "hrSup": -5.0}}, 
  "하위타선": {"powerPercent": 8.0, "stats": {"defense": 10.0}}, 
  "하이볼 히터": {"powerPercent": 0, "stats": {"contact": 10.0, "strikeoutAvoidance": 5.0, "homeRunPower": -5.0}}
}

// 자동 계산되는 총합 % 상태
const autoPowerPercent = ref(0)

// 수동 파워 보너스 입력 (시너지 등)
const manualPowerFixed = ref(0)
const manualPowerPercent = ref(0)

// 데이터 불러오기
onMounted(async () => {
  try {
    const response = await fetch('/DB/player_sorted.csv', { cache: 'no-store' })
    const csvText = await response.text()
    const result: Raw[] = []
    Papa.parse(csvText, {
      header: true, skipEmptyLines: true,
      complete: ({ data }) => (data as Raw[]).forEach(row => result.push(row))
    })
    players.value = result
  } catch (e) {
    console.error(e)
  } finally {
    isLoading.value = false
  }
})

// 검색 필터링
const filteredPlayers = computed(() => {
  if (!searchQuery.value.trim()) return []
  const query = searchQuery.value.toLowerCase().trim()
  return players.value.filter(p => 
    String(p.name || '').toLowerCase().includes(query) ||
    String(p.team || '').toLowerCase().includes(query)
  ).slice(0, 50)
})

// 선수 선택 시 스탯 초기화 및 데이터 연동
const selectPlayer = (p: Raw) => {
  selectedPlayer.value = p
  searchQuery.value = ''
  selectedSkills.value = ['', '', '']
  manualPowerFixed.value = 0
  manualPowerPercent.value = 0
  autoPowerPercent.value = 0
  
  // 모든 스탯 초기화
  Object.values(batterStats).forEach(stat => { stat.base=0; stat.enhance=0; stat.skill=0; stat.synergy=0 })
  Object.values(pitcherStats).forEach(stat => { stat.base=0; stat.enhance=0; stat.skill=0; stat.synergy=0 })
  
  if (isPitcher.value) {
    pitcherStats.movement.base = Number(p.movement || 0)
    pitcherStats.longHitSup.base = Number(p.longHitSuppression || 0)
    pitcherStats.hrSup.base = Number(p.homeRunSuppression || 0)
    pitcherStats.control.base = Number(p.control || 0)
    pitcherStats.stuff.base = Number(p.stuff || 0)
    pitcherStats.defense.base = Number(p.defense || 0)
    pitcherStats.pitchLimit.base = Number(p.pitchLimit || 0)
    pitcherStats.runnerCtrl.base = Number(p.runnerControl || 0)
  } else {
    batterStats.contact.base = Number(p.contact || 0)
    batterStats.gapPower.base = Number(p.gapPower || 0)
    batterStats.homeRunPower.base = Number(p.homeRunPower || 0)
    batterStats.plateDiscipline.base = Number(p.plateDiscipline || 0)
    batterStats.strikeoutAvoidance.base = Number(p.strikeoutAvoidance || 0)
    batterStats.stealing.base = Number(p.stealing || 0)
    batterStats.baseRunning.base = Number(p.baseRunning || 0)
    batterStats.defense.base = Number(p.defense || 0)
  }
}

// 스킬 선택 시 자동으로 표의 [스킬 (+)] 칸에 수치를 채워넣는 로직
watch(selectedSkills, () => {
  let totalPowerP = 0
  let statPercents: Record<string, number> = {
    contact: 0, gapPower: 0, homeRunPower: 0, plateDiscipline: 0, strikeoutAvoidance: 0, stealing: 0, baseRunning: 0, defense: 0,
    movement: 0, longHitSup: 0, hrSup: 0, control: 0, stuff: 0, pitchLimit: 0, runnerCtrl: 0
  }
  
  selectedSkills.value.forEach(s => {
    if (s && SKILL_EFFECTS[s]) {
      totalPowerP += SKILL_EFFECTS[s].powerPercent || 0
      for (const [key, val] of Object.entries(SKILL_EFFECTS[s].stats || {})) {
        statPercents[key] += Number(val)
      }
    }
  })
  
  autoPowerPercent.value = totalPowerP
  
  if (isPitcher.value) {
    Object.keys(pitcherStats).forEach(key => {
      const statKey = key as keyof typeof pitcherStats
      pitcherStats[statKey].skill = statPercents[statKey] 
        ? Math.floor(pitcherStats[statKey].base * (statPercents[statKey] / 100))
        : 0
    })
  } else {
    Object.keys(batterStats).forEach(key => {
      const statKey = key as keyof typeof batterStats
      batterStats[statKey].skill = statPercents[statKey] 
        ? Math.floor(batterStats[statKey].base * (statPercents[statKey] / 100))
        : 0
    })
  }
}, { deep: true })

// 개별 스탯 가로 총합 계산기
const getStatTotal = (stat: { base: number, enhance: number, skill: number, synergy: number }) => {
  return stat.base + (stat.enhance || 0) + (stat.skill || 0) + (stat.synergy || 0)
}

// 전체 파워(종합 OVR) 계산기
const totalPower = computed(() => {
  let baseSum = 0, enhanceSum = 0, skillSum = 0, synergySum = 0
  
  const stats = isPitcher.value ? Object.values(pitcherStats) : Object.values(batterStats)
  
  stats.forEach(s => {
    baseSum += s.base
    enhanceSum += (s.enhance || 0)
    skillSum += (s.skill || 0)
    synergySum += (s.synergy || 0)
  })
  
  const rawTotalPower = baseSum + enhanceSum + skillSum + synergySum + manualPowerFixed.value
  const totalPercentBonus = autoPowerPercent.value + manualPowerPercent.value
  
  // % 보너스 적용
  const finalSum = Math.floor(rawTotalPower * (1 + totalPercentBonus / 100))
  
  return { baseSum, enhanceSum, skillSum, synergySum, finalSum, rawTotalPower, totalPercentBonus }
})
</script>

<template>
  <div class="bg-neutral-50 dark:bg-neutral-900 min-h-screen transition-colors p-4 lg:p-8">
    <div class="max-w-[1500px] mx-auto">
      <!-- 헤더 -->
      <header class="mb-6 flex items-center gap-3">
        <div class="p-3 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-600/20">
          <Calculator class="w-6 h-6" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">스탯 계산기</h1>
          <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-1">타순 및 모든 9UP 스킬 상시 효과가 자동으로 파워/세부 스탯에 합산됩니다.</p>
        </div>
      </header>

      <div v-if="isLoading" class="flex h-64 items-center justify-center">
        <div class="animate-spin rounded-full border-4 border-neutral-300 dark:border-neutral-600 border-t-blue-600 h-10 w-10"></div>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <!-- 왼쪽: 선수 검색 -->
        <div class="lg:col-span-3 flex flex-col gap-6">
          <section class="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-5">
            <h2 class="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2">
              <Search class="w-4 h-4 text-blue-500" /> 선수 찾기
            </h2>
            <div class="relative mb-4">
              <input 
                v-model="searchQuery" 
                type="text" 
                placeholder="이름이나 팀명으로 검색..." 
                class="w-full pl-10 pr-4 py-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors text-neutral-900 dark:text-neutral-100"
              />
              <Search class="w-5 h-5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <button v-if="searchQuery" @click="searchQuery = ''" class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                <X class="w-4 h-4" />
              </button>
            </div>
            
            <div v-if="searchQuery && filteredPlayers.length > 0" class="max-h-[400px] overflow-y-auto space-y-2 pr-2">
              <button 
                v-for="p in filteredPlayers" :key="p.id" 
                @click="selectPlayer(p)"
                class="w-full text-left p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-neutral-700/50 transition-all flex items-center gap-4"
              >
                <img :src="`/assets/logos/grade/${p.grade || 'C'}.png`" class="w-10 h-10 object-contain" />
                <div>
                  <div class="font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                    {{ p.name }} <span class="text-xs font-normal bg-neutral-100 dark:bg-neutral-600 px-2 py-0.5 rounded text-neutral-600 dark:text-neutral-300">{{ p.position }}</span>
                  </div>
                  <div class="text-xs text-neutral-500 mt-1">{{ p.team }} · {{ p.year }}</div>
                </div>
              </button>
            </div>
            <div v-else-if="searchQuery && filteredPlayers.length === 0" class="text-center py-10 text-neutral-500 text-sm">
              검색 결과가 없습니다.
            </div>
          </section>
        </div>

        <!-- 오른쪽: 엑셀 형태 스탯 계산기 -->
        <div class="lg:col-span-9 flex flex-col gap-6">
          <section v-if="selectedPlayer" class="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            <!-- 선수 요약 헤더 -->
            <div class="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white flex items-center gap-6">
              <img :src="`/assets/logos/grade/${selectedPlayer.grade || 'C'}.png`" class="w-16 h-16 object-contain bg-white/10 rounded-xl p-2" />
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span class="px-2 py-0.5 bg-white/20 rounded text-xs font-semibold tracking-wide">{{ isPitcher ? '투수' : '타자' }}</span>
                  <span class="px-2 py-0.5 bg-white/20 rounded text-xs font-semibold tracking-wide">{{ selectedPlayer.position }}</span>
                  <span class="text-blue-100 text-sm ml-2">{{ selectedPlayer.team }} · {{ selectedPlayer.year }}</span>
                </div>
                <h2 class="text-3xl font-extrabold flex items-center gap-3">
                  {{ selectedPlayer.name }}
                  <div class="flex text-amber-300">
                    <Star v-for="n in Number(selectedPlayer.rarity || 0)" :key="n" class="w-4 h-4" fill="currentColor" />
                  </div>
                </h2>
              </div>
              <div class="text-right flex flex-col items-end bg-black/20 p-4 rounded-xl border border-white/10 shadow-inner">
                <span class="text-blue-200 text-xs font-semibold uppercase tracking-wider mb-1">종합 파워 (총합)</span>
                <div class="flex items-baseline gap-1">
                  <span class="text-4xl font-black tabular-nums">{{ totalPower.finalSum }}</span>
                  <span v-if="totalPower.totalPercentBonus > 0" class="text-sm font-medium text-amber-300">(+{{ totalPower.totalPercentBonus }}%)</span>
                </div>
              </div>
            </div>

            <!-- 스킬 선택 슬롯 영역 (모든 스킬 통합) -->
            <div class="p-6 bg-neutral-50/50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-700">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <Zap class="w-4 h-4 text-amber-500" /> 스킬 장착 슬롯
                </h3>
                <span class="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-bold rounded-lg text-xs border border-amber-200 dark:border-amber-800">
                  {{ Number(selectedPlayer.rarity) }}성 카드로 최대 {{ maxSkillSlots }}개 장착 가능
                </span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div v-for="i in 3" :key="i" class="flex flex-col gap-1">
                  <label class="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    슬롯 {{ i }} <span v-if="i > maxSkillSlots" class="text-red-400">(잠김)</span>
                  </label>
                  <select 
                    v-model="selectedSkills[i-1]"
                    :disabled="i > maxSkillSlots"
                    class="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg outline-none focus:border-amber-500 disabled:opacity-50 disabled:bg-neutral-100 dark:disabled:bg-neutral-900 text-sm text-neutral-900 dark:text-neutral-100 transition-colors"
                  >
                    <option value="">스킬 선택 안함</option>
                    <option v-for="skill in availableSkills" :key="skill" :value="skill">{{ skill }}</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- 계산기 테이블 -->
            <div class="p-6 pt-5">
              <div class="mb-4 flex items-center justify-between">
                <h3 class="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <TrendingUp class="w-5 h-5 text-blue-500" /> 세부 스탯 수동 계산기
                </h3>
              </div>

              <div class="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
                <table class="w-full text-sm text-center border-collapse">
                  <thead>
                    <tr class="bg-neutral-100 dark:bg-neutral-700/80 text-neutral-600 dark:text-neutral-300">
                      <th class="p-3 border-b border-r border-neutral-200 dark:border-neutral-700 font-semibold w-1/6">스탯 항목</th>
                      <th class="p-3 border-b border-r border-neutral-200 dark:border-neutral-700 font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 w-1/6">DB 기본</th>
                      <th class="p-3 border-b border-r border-neutral-200 dark:border-neutral-700 font-semibold w-1/6">강화/훈련 (+)</th>
                      <th class="p-3 border-b border-r border-neutral-200 dark:border-neutral-700 font-semibold w-1/6 bg-amber-50/30 dark:bg-amber-900/5">스킬 (+)</th>
                      <th class="p-3 border-b border-r border-neutral-200 dark:border-neutral-700 font-semibold w-1/6">시너지 (+)</th>
                      <th class="p-3 border-b border-neutral-200 dark:border-neutral-700 font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10 w-1/6">최종 스탯</th>
                    </tr>
                  </thead>
                  
                  <tbody>
                    <!-- 반복 렌더링 영역 (타자/투수에 따라 다름) -->
                    <template v-if="!isPitcher">
                      <tr v-for="(statObj, key) in batterStats" :key="key" class="border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors">
                        <td class="p-3 border-r border-neutral-200 dark:border-neutral-700 font-semibold text-neutral-800 dark:text-neutral-200 bg-neutral-50/50 dark:bg-neutral-700/20">
                          {{ statObj.label }}
                        </td>
                        <td class="p-3 border-r border-neutral-200 dark:border-neutral-700 font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/5">
                          {{ statObj.base }}
                        </td>
                        <td class="p-2 border-r border-neutral-200 dark:border-neutral-700">
                          <input type="number" v-model.number="statObj.enhance" class="w-full px-2 py-1.5 text-center bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow" />
                        </td>
                        <td class="p-2 border-r border-neutral-200 dark:border-neutral-700 bg-amber-50/10 dark:bg-amber-900/5">
                          <input type="number" v-model.number="statObj.skill" class="w-full px-2 py-1.5 text-center bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-shadow" />
                        </td>
                        <td class="p-2 border-r border-neutral-200 dark:border-neutral-700">
                          <input type="number" v-model.number="statObj.synergy" class="w-full px-2 py-1.5 text-center bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow" />
                        </td>
                        <td class="p-3 font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-900/5">
                          {{ getStatTotal(statObj) }}
                        </td>
                      </tr>
                    </template>

                    <template v-else>
                      <tr v-for="(statObj, key) in pitcherStats" :key="key" class="border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors">
                        <td class="p-3 border-r border-neutral-200 dark:border-neutral-700 font-semibold text-neutral-800 dark:text-neutral-200 bg-neutral-50/50 dark:bg-neutral-700/20">
                          {{ statObj.label }}
                        </td>
                        <td class="p-3 border-r border-neutral-200 dark:border-neutral-700 font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/5">
                          {{ statObj.base }}
                        </td>
                        <td class="p-2 border-r border-neutral-200 dark:border-neutral-700">
                          <input type="number" v-model.number="statObj.enhance" class="w-full px-2 py-1.5 text-center bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow" />
                        </td>
                        <td class="p-2 border-r border-neutral-200 dark:border-neutral-700 bg-amber-50/10 dark:bg-amber-900/5">
                          <input type="number" v-model.number="statObj.skill" class="w-full px-2 py-1.5 text-center bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-shadow" />
                        </td>
                        <td class="p-2 border-r border-neutral-200 dark:border-neutral-700">
                          <input type="number" v-model.number="statObj.synergy" class="w-full px-2 py-1.5 text-center bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow" />
                        </td>
                        <td class="p-3 font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-900/5">
                          {{ getStatTotal(statObj) }}
                        </td>
                      </tr>
                    </template>
                  </tbody>

                  <!-- 파워 (총합) 요약 로우 -->
                  <tfoot class="bg-neutral-100 dark:bg-neutral-700/50">
                    <tr>
                      <td class="p-4 border-r border-neutral-200 dark:border-neutral-700 font-extrabold text-neutral-900 dark:text-neutral-100 uppercase tracking-widest text-base bg-blue-100/50 dark:bg-blue-900/20">
                        파워 (총합)
                      </td>
                      <td class="p-4 border-r border-neutral-200 dark:border-neutral-700 font-bold text-blue-700 dark:text-blue-300 bg-blue-100/30 dark:bg-blue-900/10 text-base tabular-nums">
                        {{ totalPower.baseSum }}
                      </td>
                      <td class="p-4 border-r border-neutral-200 dark:border-neutral-700 font-bold text-neutral-700 dark:text-neutral-300 tabular-nums">
                        +{{ totalPower.enhanceSum }}
                      </td>
                      <td class="p-4 border-r border-neutral-200 dark:border-neutral-700 font-bold text-amber-700 dark:text-amber-500 tabular-nums">
                        +{{ totalPower.skillSum }}
                      </td>
                      <td class="p-4 border-r border-neutral-200 dark:border-neutral-700 font-bold text-neutral-700 dark:text-neutral-300 tabular-nums">
                        +{{ totalPower.synergySum }}
                        <div v-if="manualPowerFixed > 0" class="text-xs text-blue-500 mt-1">추가 +{{ manualPowerFixed }}</div>
                      </td>
                      <td class="p-4 font-black text-xl text-indigo-700 dark:text-indigo-400 bg-indigo-100/50 dark:bg-indigo-900/20 tabular-nums relative">
                        <span class="absolute top-1 left-0 w-full text-[10px] text-center text-indigo-400 dark:text-indigo-500 font-normal">
                          <span v-if="totalPower.totalPercentBonus > 0">스킬 합계 × {{ 100 + totalPower.totalPercentBonus }}%</span>
                        </span>
                        <div class="mt-2">{{ totalPower.finalSum }}</div>
                      </td>
                    </tr>
                    
                    <!-- 추가 파워 수동 입력 줄 -->
                    <tr>
                      <td colspan="3" class="p-3 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 border-r border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
                        기타 추가 파워 보너스 수동 입력 (시너지 등) ➔
                      </td>
                      <td class="p-2 border-r border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
                        <div class="flex items-center gap-1">
                          <span class="text-xs text-neutral-400">+</span>
                          <input type="number" v-model.number="manualPowerFixed" placeholder="고정 증가" class="w-full px-2 py-1 text-center bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded text-xs outline-none focus:border-blue-500 transition-colors" />
                        </div>
                      </td>
                      <td class="p-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
                        <div class="flex items-center gap-1">
                          <span class="text-xs text-neutral-400">+</span>
                          <input type="number" v-model.number="manualPowerPercent" placeholder="% 증가" class="w-full px-2 py-1 text-center bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded text-xs outline-none focus:border-blue-500 transition-colors" />
                          <span class="text-xs text-neutral-400">%</span>
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div class="mt-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300 flex items-start gap-2">
                <Shield class="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div class="space-y-1">
                  <p><strong>[자동 스킬 계산 탑재!]</strong> 스킬 슬롯에서 스킬을 장착하면 <strong>자동으로 엑셀 표의 [스킬 (+)] 칸에 보너스 능력치가 계산되어 기입됩니다.</strong> (원하시면 직접 수동으로 지우고 다른 숫자를 적으셔도 괜찮습니다!)</p>
                </div>
              </div>
            </div>
          </section>

          <!-- 초기 안내 화면 -->
          <section v-else class="h-full bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 flex flex-col items-center justify-center p-10 text-center min-h-[500px]">
            <div class="w-20 h-20 bg-blue-50 dark:bg-neutral-700 rounded-full flex items-center justify-center mb-6">
              <Calculator class="w-10 h-10 text-blue-500" />
            </div>
            <h2 class="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">선수를 선택해주세요</h2>
            <p class="text-neutral-500 dark:text-neutral-400 max-w-md">
              왼쪽 검색창에서 스탯을 계산할 선수를 찾아 클릭하면, 해당 선수의 모든 세부 스탯과 파워(총합)를 계산할 수 있는 테이블이 열립니다.
            </p>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 입력창 스피너(화살표) 숨기기 */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type="number"] {
  -moz-appearance: textfield;
}
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
.dark ::-webkit-scrollbar-thumb { background: #475569; }
.dark ::-webkit-scrollbar-thumb:hover { background: #64748b; }
</style>
