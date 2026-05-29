<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch } from 'vue'
import Papa from 'papaparse'
import { Search, Calculator, Star, Shield, Zap, TrendingUp, X, Users, ArrowUpCircle, Sparkles } from 'lucide-vue-next'

type Raw = Record<string, any>

interface JsonBonus { unit: 'percent' | 'fixed'; value: number }
interface JsonCond  {
  count: (
      | { op: string, value: number }
      | { op: 'between', min: number, max: number }
      ),
  stat: string
  bonus: JsonBonus
}
interface JsonSynergy {
  id: number | string
  synergy: string
  conditions: JsonCond[]
}

const isLoading = ref(true)
const players = ref<Raw[]>([])
const synergys = ref<JsonSynergy[]>([])
const searchQuery = ref('')
const selectedPlayer = ref<Raw | null>(null)

// 엑셀 계산기 스타일의 스탯 상태 (타자용, 투수용) 
// 개별 enhance, synergy 삭제 -> imprint (각인) 추가
const batterStats = reactive({
  contact: { base: 0, skill: 0, career: 0, imprint: 0, label: '컨택', isCore: true },
  gapPower: { base: 0, skill: 0, career: 0, imprint: 0, label: '갭파워', isCore: true },
  homeRunPower: { base: 0, skill: 0, career: 0, imprint: 0, label: '홈런파워', isCore: true },
  plateDiscipline: { base: 0, skill: 0, career: 0, imprint: 0, label: '선구', isCore: true },
  strikeoutAvoidance: { base: 0, skill: 0, career: 0, imprint: 0, label: '삼진회피', isCore: true },
  stealing: { base: 0, skill: 0, career: 0, imprint: 0, label: '도루', isCore: false },
  baseRunning: { base: 0, skill: 0, career: 0, imprint: 0, label: '주루', isCore: false },
  defense: { base: 0, skill: 0, career: 0, imprint: 0, label: '수비', isCore: false },
})

const pitcherStats = reactive({
  movement: { base: 0, skill: 0, career: 0, imprint: 0, label: '무브먼트', isCore: true },
  longHitSup: { base: 0, skill: 0, career: 0, imprint: 0, label: '장타억제', isCore: true },
  hrSup: { base: 0, skill: 0, career: 0, imprint: 0, label: '홈런억제', isCore: true },
  control: { base: 0, skill: 0, career: 0, imprint: 0, label: '컨트롤', isCore: true },
  stuff: { base: 0, skill: 0, career: 0, imprint: 0, label: '스터프(구위)', isCore: true },
  defense: { base: 0, skill: 0, career: 0, imprint: 0, label: '수비', isCore: false },
  pitchLimit: { base: 0, skill: 0, career: 0, imprint: 0, label: '한계투구', isCore: false },
  runnerCtrl: { base: 0, skill: 0, career: 0, imprint: 0, label: '주자견제', isCore: false },
})

const isPitcher = computed(() => {
  if (!selectedPlayer.value) return false
  const pos = String(selectedPlayer.value.position || '').toUpperCase()
  return pos.includes('SP') || pos.includes('RP') || !!selectedPlayer.value.movement
})

// === 기본 육성 및 버프 로직 ===
const playerLevel = ref(100)
const collectionBuff = ref(0)
const teamLevelBuff = ref(750)
const binderBuff = ref(527)
const careerLevelBuff = ref(149) 
const careerTeamCount = ref(0) 
const hitAceBuff = ref(0)

const growthBuffSum = computed(() => {
  return ((playerLevel.value || 0) * 10) + 
         (collectionBuff.value || 0) + 
         (teamLevelBuff.value || 0) + 
         (binderBuff.value || 0) + 
         (careerLevelBuff.value || 0) + 
         ((careerTeamCount.value || 0) * 112) + 
         (hitAceBuff.value || 0)
})

// === 강화 시스템 로직 ===
const enhancementLevel = ref(0) 

const maxEnhanceLevel = computed(() => {
  if (!selectedPlayer.value) return 15
  const grade = String(selectedPlayer.value.grade).toUpperCase()
  return grade === 'DGN' ? 10 : 15
})

const enhanceMultiplier = computed(() => {
  if (!selectedPlayer.value) return 0
  const grade = String(selectedPlayer.value.grade).toUpperCase()
  const map: Record<string, number> = {
    'SEA': 30, 'ASG': 30,
    'POS': 40, 'TEA': 40, 'MMVP': 40,
    'ROY': 50, 'HIT': 50, 'ACE': 50, 'GG': 50, 'TOP': 50,
    'DGN': 300
  }
  return map[grade] || 0
})

const autoEnhanceFixed = computed(() => {
  return enhancementLevel.value * enhanceMultiplier.value
})

// === 한계 돌파 시스템 로직 ===
const breakthroughLevel = ref(0)

const maxBreakthrough = computed(() => {
  if (!selectedPlayer.value) return 0
  const grade = String(selectedPlayer.value.grade).toUpperCase()
  if (grade === 'DGN') return 0 
  return Number(selectedPlayer.value.rarity || 0) + 1
})

const breakthroughBase = computed(() => {
  if (!selectedPlayer.value) return 0
  const grade = String(selectedPlayer.value.grade).toUpperCase()
  const map: Record<string, number> = {
    'SEA': 30, 'ASG': 30, 'POS': 30,
    'TEA': 50, 'ROY': 50, 'MMVP': 50,
    'HIT': 100, 'ACE': 100, 'GG': 100, 'TOP': 100,
    'DGN': 0
  }
  return map[grade] || 0
})

const autoBreakthroughFixed = computed(() => {
  if (breakthroughLevel.value === 0) return 0
  const multipliers = [0, 1, 2.5, 4.5, 7, 10, 15, 21, 28] 
  return breakthroughBase.value * (multipliers[breakthroughLevel.value] || 0)
})

// === 스킬 시스템 로직 ===
const maxSkillSlots = computed(() => {
  if (!selectedPlayer.value) return 0
  const r = Number(selectedPlayer.value.rarity || 0)
  if (r <= 3) return 1
  if (r === 4) return 2
  return 3
})

const getArray = (str: any) => {
  if (!str) return []
  return String(str).split(',').map(s => s.trim()).filter(Boolean)
}

const availableSkills = computed(() => {
  if (!selectedPlayer.value) return []
  const baseSkills = getArray(selectedPlayer.value.skill)
  const enhancedSkills = getArray(selectedPlayer.value.enhancedSkill)
  
  const excludedCatcherSkills = ["야전사령관", "인사이드 워크", "투수 리드", "친화력", "도루 저지"]
  const filteredSkills = [...baseSkills, ...enhancedSkills].filter(s => !excludedCatcherSkills.includes(s))
  
  return Array.from(new Set(filteredSkills))
})

const selectedSkills = ref<string[]>([])

const toggleSkill = (skill: string) => {
  if (selectedSkills.value.includes(skill)) {
    selectedSkills.value = selectedSkills.value.filter(s => s !== skill)
  } else {
    if (selectedSkills.value.length >= maxSkillSlots.value) {
      alert(`이 카드는 별 ${selectedPlayer.value?.rarity}개 등급이므로 최대 ${maxSkillSlots.value}개의 스킬만 장착할 수 있습니다.`)
      return
    }
    selectedSkills.value.push(skill)
  }
}

const SKILL_EFFECTS: Record<string, any> = {
  "1번": {"powerPercent": 10.0, "stats": {}}, "2번": {"powerPercent": 10.0, "stats": {}}, 
  "3번": {"powerPercent": 10.0, "stats": {}}, "4번": {"powerPercent": 10.0, "stats": {}}, 
  "5번": {"powerPercent": 10.0, "stats": {}}, "6번": {"powerPercent": 10.0, "stats": {}}, 
  "7번": {"powerPercent": 10.0, "stats": {}}, "8번": {"powerPercent": 10.0, "stats": {}}, 
  "9번": {"powerPercent": 10.0, "stats": {}}, "OPS형 타자": {"powerPercent": 0, "stats": {"gapPower": 10.0, "homeRunPower": 10.0}}, 
  "갭 히터": {"powerPercent": 0, "stats": {"gapPower": 15.0}}, "게스히팅": {"powerPercent": 0, "stats": {"gapPower": 8.0, "homeRunPower": 10.0, "strikeoutAvoidance": -5.0}}, 
  "공갈포": {"powerPercent": 0, "stats": {"homeRunPower": 20.0, "contact": -7.0, "strikeoutAvoidance": -7.0}}, "그라운드볼러": {"powerPercent": 0, "stats": {"movement": -5.0, "hrSup": 10.0, "longHitSup": 10.0}}, 
  "그린라이트": {"powerPercent": 0, "stats": {}}, "너클볼": {"powerPercent": 0, "stats": {"stuff": 20.0, "hrSup": -5.0, "longHitSup": -5.0, "movement": 20.0, "control": 20.0}}, 
  "더티 무브먼트": {"powerPercent": 0, "stats": {"movement": 25.0}}, "라이징 무브먼트": {"powerPercent": 0, "stats": {"stuff": 20.0}}, 
  "로우볼 히터": {"powerPercent": 0, "stats": {"gapPower": 5.0, "homeRunPower": 10.0, "plateDiscipline": -5.0}}, "롱맨": {"powerPercent": 10.0, "stats": {}}, 
  "맞춰잡기": {"powerPercent": 0, "stats": {"control": 15.0, "pitchLimit": 10.0}}, "묵직함": {"powerPercent": 0, "stats": {"longHitSup": 10.0, "hrSup": 10.0}}, 
  "믿을맨": {"powerPercent": 10.0, "stats": {}}, "배드볼히터": {"powerPercent": 0, "stats": {"contact": 15.0, "gapPower": 20.0, "plateDiscipline": -3.0}}, 
  "배럴 히터": {"powerPercent": 0, "stats": {"contact": 10.0, "gapPower": 10.0, "strikeoutAvoidance": 10.0}}, "변칙타순": {"powerPercent": 4.0, "stats": {}}, 
  "변칙투구": {"powerPercent": 0, "stats": {}}, "선구안": {"powerPercent": 0, "stats": {"strikeoutAvoidance": 15.0, "plateDiscipline": 15.0}}, 
  "셋업": {"powerPercent": 10.0, "stats": {}}, "스토퍼": {"powerPercent": 10.0, "stats": {}}, "스플리터": {"powerPercent": 0, "stats": {"movement": 15.0, "stuff": 25.0, "control": -5.0}}, 
  "스피드스터": {"powerPercent": 0, "stats": {}}, "슬랩 히터": {"powerPercent": 0, "stats": {"contact": 20.0, "baseRunning": 10.0}}, "싱커": {"powerPercent": 0, "stats": {"hrSup": 20.0, "stuff": -5.0}}, 
  "에이스": {"powerPercent": 9.0, "stats": {}}, "와일드씽": {"powerPercent": 0, "stats": {"control": -3.0, "stuff": 10.0}}, "원투펀치": {"powerPercent": 8.0, "stats": {}}, 
  "원포인터": {"powerPercent": 10.0, "stats": {}}, "이닝이팅": {"powerPercent": 0, "stats": {"pitchLimit": 5.0}}, "적극성": {"powerPercent": 0, "stats": {"contact": 15.0}}, 
  "지명타자": {"powerPercent": 8.5, "stats": {}}, "체인지업": {"powerPercent": 0, "stats": {"longHitSup": 15.0}}, "커브": {"powerPercent": 0, "stats": {"movement": 15.0, "longHitSup": 10.0}}, 
  "컨택터": {"powerPercent": 0, "stats": {"contact": 20.0}}, "클로저": {"powerPercent": 10.0, "stats": {}}, "클린업": {"powerPercent": 8.0, "stats": {}}, 
  "타격 전략": {"powerPercent": 0, "stats": {"contact": 20.0}}, "테이블세터": {"powerPercent": 7.0, "stats": {}}, "파워": {"powerPercent": 0, "stats": {"gapPower": 15.0, "homeRunPower": 15.0}}, 
  "파이어볼러": {"powerPercent": 0, "stats": {"stuff": 15.0}}, "펀치력": {"powerPercent": 0, "stats": {"gapPower": 10.0, "homeRunPower": 5.0}}, 
  "플라이볼피쳐": {"powerPercent": 0, "stats": {"movement": 20.0, "hrSup": -5.0}}, "하위타선": {"powerPercent": 8.0, "stats": {"defense": 10.0}}, 
  "하이볼 히터": {"powerPercent": 0, "stats": {"contact": 10.0, "strikeoutAvoidance": 5.0, "homeRunPower": -5.0}}
}

const autoPowerPercent = ref(0)
const manualPowerFixed = ref(0)
const manualPowerPercent = ref(0)
const careerAllStatFlat = ref(0) 

// === 신규: 각인(Imprint) 시스템 전역 파워 ===
const imprintMainPower = ref(0)
const imprintSubPower = ref(0)
const imprintStarterPower = ref(0)

// === 시너지 시스템 로직 ===
const activeSynergyConditions = ref<Record<string, number>>({})

const playerSynergiesData = computed(() => {
  if (!selectedPlayer.value) return []
  const synNames = getArray(selectedPlayer.value.synergy)
  return synergys.value.filter(s => synNames.includes(s.synergy))
})

const toggleSynergyCondition = (synName: string, idx: number) => {
  if (activeSynergyConditions.value[synName] === idx) {
    const newObj = { ...activeSynergyConditions.value }
    delete newObj[synName]
    activeSynergyConditions.value = newObj
  } else {
    activeSynergyConditions.value = { ...activeSynergyConditions.value, [synName]: idx }
  }
}

const formatConditionText = (cond: any) => {
  if (!cond.count) return ''
  if (cond.count.op === 'between') return `${cond.count.min}~${cond.count.max}명`
  return `${cond.count.value}명 이상`
}

const autoSynergyFixed = computed(() => {
  let total = 0
  for (const [synName, condIdx] of Object.entries(activeSynergyConditions.value)) {
    const syn = synergys.value.find(s => s.synergy === synName)
    if (syn && syn.conditions[condIdx]) {
      const cond = syn.conditions[condIdx]
      if (cond.stat === 'power' && cond.bonus.unit === 'fixed') total += cond.bonus.value
    }
  }
  return total
})

const autoSynergyPercent = computed(() => {
  let total = 0
  for (const [synName, condIdx] of Object.entries(activeSynergyConditions.value)) {
    const syn = synergys.value.find(s => s.synergy === synName)
    if (syn && syn.conditions[condIdx]) {
      const cond = syn.conditions[condIdx]
      if (cond.stat === 'power' && cond.bonus.unit === 'percent') total += cond.bonus.value
    }
  }
  return total
})

// === 앱 초기화 로직 ===
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
    
    const synRes = await fetch('/DB/synergys.json', { cache: 'no-store' })
    if (synRes.ok) {
      const synJson = await synRes.json()
      synergys.value = (Array.isArray(synJson) ? synJson : [])
        .filter((it: any) => Array.isArray(it?.conditions) && it.conditions.length > 0)
    }
  } catch (e) {
    console.error(e)
  } finally {
    isLoading.value = false
  }
})

const filteredPlayers = computed(() => {
  if (!searchQuery.value.trim()) return []
  const query = searchQuery.value.toLowerCase().trim()
  return players.value.filter(p => 
    String(p.name || '').toLowerCase().includes(query) ||
    String(p.team || '').toLowerCase().includes(query)
  ).slice(0, 50)
})

// 선수 선택 시 모든 상태 초기화
const selectPlayer = (p: Raw) => {
  selectedPlayer.value = p
  searchQuery.value = ''
  selectedSkills.value = [] 
  activeSynergyConditions.value = {}
  manualPowerFixed.value = 0
  manualPowerPercent.value = 0
  careerAllStatFlat.value = 0
  autoPowerPercent.value = 0
  enhancementLevel.value = 0
  breakthroughLevel.value = 0
  
  // 각인 초기화
  imprintMainPower.value = 0
  imprintSubPower.value = 0
  imprintStarterPower.value = 0
  
  playerLevel.value = 100
  teamLevelBuff.value = 750
  binderBuff.value = 527
  careerLevelBuff.value = 149
  careerTeamCount.value = 0 
  
  const grade = String(p.grade || '').toUpperCase()
  if (['SEA', 'ASG'].includes(grade)) collectionBuff.value = 800
  else if (['POS', 'TEA', 'MMVP', 'GG', 'HIT', 'ACE'].includes(grade)) collectionBuff.value = 900
  else if (grade === 'ROY') collectionBuff.value = 1000
  else if (grade === 'TOP') collectionBuff.value = 1200
  else collectionBuff.value = 0 

  if (['HIT', 'ACE'].includes(grade)) hitAceBuff.value = 896
  else hitAceBuff.value = 0
  
  Object.values(batterStats).forEach(stat => { stat.base=0; stat.skill=0; stat.career=0; stat.imprint=0 })
  Object.values(pitcherStats).forEach(stat => { stat.base=0; stat.skill=0; stat.career=0; stat.imprint=0 })
  
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
        ? Math.floor(pitcherStats[statKey].base * (statPercents[statKey] / 100)) : 0
    })
  } else {
    Object.keys(batterStats).forEach(key => {
      const statKey = key as keyof typeof batterStats
      batterStats[statKey].skill = statPercents[statKey] 
        ? Math.floor(batterStats[statKey].base * (statPercents[statKey] / 100)) : 0
    })
  }
}, { deep: true })

// 개별 스탯 1개의 최종합 계산기
const getStatTotal = (stat: { base: number, skill: number, career: number, imprint: number, isCore: boolean }) => {
  let raw = stat.base + (stat.skill || 0)
  
  if (stat.isCore) {
    // 1. 퍼센트 영향을 받는 항목들 (수동파워, 자동시너지, 강화, 성장버프+커리어자팀)
    raw += ((manualPowerFixed.value + autoSynergyFixed.value + autoEnhanceFixed.value + growthBuffSum.value) / 5)
    
    // 2. 퍼센트 곱연산 적용
    const totalPercentBonus = autoPowerPercent.value + manualPowerPercent.value + autoSynergyPercent.value
    raw = Math.floor(raw * (1 + totalPercentBonus / 100))
    
    // 3. 퍼센트 영향을 받지 않는 깡스탯 합산 (돌파 + 커리어 전능 + 각인 주옵/부옵/선발)
    let imprintGlobal = (imprintMainPower.value || 0) + (imprintSubPower.value || 0)
    if (isPitcher.value) imprintGlobal += (imprintStarterPower.value || 0)
    
    raw += ((autoBreakthroughFixed.value + careerAllStatFlat.value + imprintGlobal) / 5)
  }
  
  // 4. 개별 커리어 깡스탯 & 개별 각인 부옵션 깡스탯 (퍼센트 비적용)
  raw += (stat.career || 0)
  raw += (stat.imprint || 0)
  
  return raw
}

// 전체 파워(종합 OVR) 계산기
const totalPower = computed(() => {
  let baseSum = 0, skillSum = 0, careerSum = 0, imprintSum = 0, finalSum = 0
  
  const stats = isPitcher.value ? Object.values(pitcherStats) : Object.values(batterStats)
  
  stats.forEach(s => {
    baseSum += s.base
    skillSum += (s.skill || 0)
    
    let car = (s.career || 0)
    if (s.isCore) { car += (careerAllStatFlat.value / 5) }
    careerSum += car
    
    let imp = (s.imprint || 0)
    if (s.isCore) { 
      let impG = (imprintMainPower.value || 0) + (imprintSubPower.value || 0)
      if (isPitcher.value) impG += (imprintStarterPower.value || 0)
      imp += (impG / 5) 
    }
    imprintSum += imp
    
    finalSum += getStatTotal(s)
  })
  
  const totalPercentBonus = autoPowerPercent.value + manualPowerPercent.value + autoSynergyPercent.value
  const globalFixed = manualPowerFixed.value + autoSynergyFixed.value + growthBuffSum.value + autoEnhanceFixed.value
  
  return { baseSum, skillSum, careerSum, imprintSum, finalSum, totalPercentBonus, globalFixed, autoBreakthroughFixed: autoBreakthroughFixed.value }
})
</script>

<template>
  <div class="bg-neutral-50 dark:bg-neutral-900 min-h-screen transition-colors p-4 lg:p-8">
    <div class="max-w-[1600px] mx-auto">
      <header class="mb-6 flex items-center gap-3">
        <div class="p-3 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-600/20">
          <Calculator class="w-6 h-6" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">스탯 계산기</h1>
          <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-1">각인 시스템이 새롭게 추가되었습니다. 깡파워와 퍼센트의 복잡한 로직을 웹에서 간편하게 처리하세요!</p>
        </div>
      </header>

      <div v-if="isLoading" class="flex h-64 items-center justify-center">
        <div class="animate-spin rounded-full border-4 border-neutral-300 dark:border-neutral-600 border-t-blue-600 h-10 w-10"></div>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
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

        <div class="lg:col-span-9 flex flex-col gap-6">
          <section v-if="selectedPlayer" class="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            <div class="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white flex items-center gap-6">
              <img :src="`/assets/logos/grade/${selectedPlayer.grade || 'C'}.png`" class="w-16 h-16 object-contain bg-white/10 rounded-xl p-2" />
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span class="px-2 py-0.5 bg-white/20 rounded text-xs font-semibold tracking-wide">{{ isPitcher ?
