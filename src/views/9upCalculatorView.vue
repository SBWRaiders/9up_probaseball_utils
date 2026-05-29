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

// 엑셀 계산기 스타일의 스탯 상태
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

// === 기본 육성 및 팀/클랜/얼티밋 버프 로직 ===
// 1. 퍼센트(%) 뻥튀기 적용 대상
const playerLevel = ref(100)          
const collectionBuff = ref(0)         
const teamLevelBuff = ref(750)        
const careerLevelBuff = ref(149)      
const careerTeamCount = ref(0) 
const hitAceBuff = ref(0)             
const teamPlayerDignityBuff = ref(0)  
const ultimateImprintPercent = ref(0) 

// 2. 퍼센트(%) 뻥튀기 미적용 대상 (깡파워)
const binderBuff = ref(527)           
const clanBuff = ref(15)              

// 1. 퍼센트(%) 영향을 받는 버프 합산
const percentableGrowthBuffSum = computed(() => {
  return (Math.max(0, playerLevel.value - 1) * 10) + // 1렙당 개별+2, 파워+10
         (collectionBuff.value || 0) + 
         (teamLevelBuff.value || 0) + 
         (careerLevelBuff.value || 0) + 
         ((careerTeamCount.value || 0) * 112) + 
         (hitAceBuff.value || 0) +
         (teamPlayerDignityBuff.value || 0)
})

// 2. 퍼센트(%) 영향을 받지 않는 깡파워 버프 합산
const unpercentableGrowthBuffSum = computed(() => {
  return (binderBuff.value || 0) + 
         (clanBuff.value || 0)
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

// === 한계 돌파(Breakthrough) 시스템 로직 ===
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
  if (['SEA', 'ASG', 'POS'].includes(grade)) return 30
  if (['TEA', 'ROY', 'MMVP'].includes(grade)) return 50
  if (['HIT', 'ACE', 'GG', 'TOP'].includes(grade)) return 100
  return 0
})

const autoBreakthroughFixed = computed(() => {
  if (breakthroughLevel.value === 0 || !selectedPlayer.value) return 0
  const grade = String(selectedPlayer.value.grade).toUpperCase()
  const lvl = breakthroughLevel.value
  
  if (['SEA', 'ASG', 'POS'].includes(grade)) {
    const mults = [0, 1, 3, 6, 10, 15, 21, 28, 36]
    return 30 * (mults[lvl] || 0)
  } else if (['TEA', 'ROY', 'MMVP'].includes(grade)) {
    const mults = [0, 1, 3, 6, 10, 15, 21, 28, 36]
    return 50 * (mults[lvl] || 0)
  } else if (['HIT', 'ACE', 'GG', 'TOP'].includes(grade)) {
    const mults = [0, 1, 2.5, 4.5, 7, 10, 15, 21, 28] 
    return 100 * (mults[lvl] || 0)
  }
  return 0
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
  "믿
