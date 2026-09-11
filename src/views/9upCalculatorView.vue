<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch } from 'vue'
import Papa from 'papaparse'
import { Search, Calculator, Star, Shield, Zap, TrendingUp, X, Users, ArrowUpCircle, Sparkles, UserSearch } from 'lucide-vue-next'

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

const filterGrades = ['DGN', 'TOP', 'GG', 'GGY', 'HIT', 'ACE', 'ROY', 'MMVP', 'TEA', 'POS', 'ASG', 'SEA']

// 전역 데이터 (한 번만 로드하여 두 계산기가 공유)
const isLoading = ref(true)
const players = ref<Raw[]>([])
const synergys = ref<JsonSynergy[]>([])
const normalSkillData = ref<any[]>([])

// === 툴팁 상태 (공유) ===
const tooltipState = reactive({
  show: false, skill: '', x: 0, y: 0, transform: 'translate(-50%, -100%)', arrowLeft: '50%'
})

const showSkillTooltip = (e: MouseEvent, sk: string) => {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  let x = rect.left + rect.width / 2
  let y = rect.top
  let transform = 'translate(-50%, -100%)'
  let arrowLeft = '50%'
  if (x < 130) { transform = 'translate(-20%, -100%)'; arrowLeft = '20%' } 
  else if (window.innerWidth - x < 130) { transform = 'translate(-80%, -100%)'; arrowLeft = '80%' }
  tooltipState.skill = sk; tooltipState.x = x; tooltipState.y = y; tooltipState.transform = transform; tooltipState.arrowLeft = arrowLeft; tooltipState.show = true
}
const hideSkillTooltip = () => { tooltipState.show = false }

// === 스킬 효과 정의 ===
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
  "스피드스터": {"powerPercent": 0, "stats": {}}, "슬랩 히터": {"powerPercent": 0, "stats": {"contact": 20.0, "baseRunning": 10.0}}, "싱커(투심)": {"powerPercent": 0, "stats": {"hrSup": 20.0, "stuff": -5.0}}, 
  "에이스": {"powerPercent": 9.0, "stats": {}}, "와일드씽": {"powerPercent": 0, "stats": {"control": -3.0, "stuff": 10.0}}, "원투펀치": {"powerPercent": 8.0, "stats": {}}, 
  "원포인터": {"powerPercent": 10.0, "stats": {}}, "이닝이팅": {"powerPercent": 0, "stats": {"pitchLimit": 5.0}}, "적극성": {"powerPercent": 0, "stats": {"contact": 15.0}}, 
  "지명타자": {"powerPercent": 8.5, "stats": {}}, "체인지업": {"powerPercent": 0, "stats": {"longHitSup": 15.0}}, "커브": {"powerPercent": 0, "stats": {"movement": 15.0, "longHitSup": 10.0}}, 
  "컨택터": {"powerPercent": 0, "stats": {"contact": 20.0}}, "클로저": {"powerPercent": 10.0, "stats": {}}, "클린업": {"powerPercent": 8.0, "stats": {}}, 
  "타격 전략": {"powerPercent": 0, "stats": {"contact": 20.0}}, "테이블세터": {"powerPercent": 7.0, "stats": {}}, "파워": {"powerPercent": 0, "stats": {"gapPower": 15.0, "homeRunPower": 15.0}}, 
  "파이어볼러": {"powerPercent": 0, "stats": {"stuff": 15.0}}, "펀치력": {"powerPercent": 0, "stats": {"gapPower": 10.0, "homeRunPower": 5.0}}, 
  "플라이볼피쳐": {"powerPercent": 0, "stats": {"movement": 20.0, "hrSup": -5.0}}, "하위타선": {"powerPercent": 8.0, "stats": {"defense": 10.0}}, 
  "하이볼 히터": {"powerPercent": 0, "stats": {"contact": 10.0, "strikeoutAvoidance": 5.0, "homeRunPower": -5.0}}
}
const getArray = (str: any) => str ? String(str).split(',').map(s => s.trim()).filter(Boolean) : []
const matchSkillInfo = (skill: string) => normalSkillData.value.find((s) => s.skill === skill)?.image || ''
const getNormalSkillDescription = (skillName: string) => {
  const data = normalSkillData.value.find(s => s.skill === skillName)
  const effectText = data?.effects || data?.effect
  if (effectText) return Array.isArray(effectText) ? effectText.map(e => e.startsWith('-') ? e : `- ${e}`).join('\n') : String(effectText).replace(/\\n/g, '\n')
  const eff = SKILL_EFFECTS[skillName]
  if (eff) {
    const parts = []
    if (eff.powerPercent) parts.push(`- 파워 +${eff.powerPercent}%`)
    const STAT_LABELS: Record<string, string> = { contact: '컨택트', gapPower: '갭파워', homeRunPower: '홈런파워', plateDiscipline: '선구', strikeoutAvoidance: '삼진회피', stealing: '도루', baseRunning: '주루', defense: '수비', movement: '무브먼트', longHitSup: '장타억제', hrSup: '홈런억제', control: '컨트롤', stuff: '스터프', runnerCtrl: '주자견제', pitchLimit: '한계투구' }
    for (const [k, v] of Object.entries(eff.stats || {})) parts.push(`- ${STAT_LABELS[k] || k} +${v}`)
    if (parts.length > 0) return parts.join('\n')
  }
  return '- 특수 조건 발동 스킬'
}

const synergyHierarchy: Record<string, string[]> = {
  '190안타 클럽': ['180안타 클럽', '170안타 클럽'], '180안타 클럽': ['170안타 클럽'], '40홈런 클럽': ['30홈런 클럽'], '40도루 클럽': ['30도루 클럽'],
  '20승 클럽': ['15승 클럽'], '180탈삼진 클럽': ['150탈삼진 클럽'], '200이닝 클럽': ['180이닝 클럽'], '30세이브 클럽': ['20세이브 클럽'], '30홀드 클럽': ['20홀드 클럽'],
  '계투 80이닝 클럽': ['계투 70이닝 클럽'], '3-30-100-100 클럽': ['3-30-100 클럽', '100득점-100타점 클럽', '100타점 클럽', '30홈런 클럽'], '3-30-100 클럽': ['100타점 클럽', '30홈런 클럽'],
  '100득점-100타점 클럽': ['100타점 클럽'], '통산 2000경기 클럽': ['통산 1500경기 클럽'], '통산 1500경기 클럽': [], '통산 700경기 클럽': ['통산 500경기 클럽'], '통산 500경기 클럽': [],
  '통산 2000안타 클럽': ['통산 1500안타 클럽'], '통산 300도루 클럽': ['통산 200도루 클럽'], '통산 300홈런 클럽': ['통산 200홈런 클럽']
}

// ==========================================
// 🚀 단일 계산기 코어 (Factory Function)
// ==========================================
function createCalculator(name: string) {
  const searchQuery = ref('')
  const searchFocused = ref(false)
  const selectedGrade = ref('')
  const selectedPlayer = ref<Raw | null>(null)

  const batterStats = reactive({
    contact: { base: 0, skill: 0, career: 0, imprint: 0, manager: 0, label: '컨택', isCore: true },
    gapPower: { base: 0, skill: 0, career: 0, imprint: 0, manager: 0, label: '갭파워', isCore: true },
    homeRunPower: { base: 0, skill: 0, career: 0, imprint: 0, manager: 0, label: '홈런파워', isCore: true },
    plateDiscipline: { base: 0, skill: 0, career: 0, imprint: 0, manager: 0, label: '선구', isCore: true },
    strikeoutAvoidance: { base: 0, skill: 0, career: 0, imprint: 0, manager: 0, label: '삼진회피', isCore: true },
    stealing: { base: 0, skill: 0, career: 0, imprint: 0, manager: 0, label: '도루', isCore: false },
    baseRunning: { base: 0, skill: 0, career: 0, imprint: 0, manager: 0, label: '주루', isCore: false },
    defense: { base: 0, skill: 0, career: 0, imprint: 0, manager: 0, label: '수비', isCore: false },
  })

  const pitcherStats = reactive({
    movement: { base: 0, skill: 0, career: 0, imprint: 0, manager: 0, label: '무브먼트', isCore: true },
    longHitSup: { base: 0, skill: 0, career: 0, imprint: 0, manager: 0, label: '장타억제', isCore: true },
    hrSup: { base: 0, skill: 0, career: 0, imprint: 0, manager: 0, label: '홈런억제', isCore: true },
    control: { base: 0, skill: 0, career: 0, imprint: 0, manager: 0, label: '컨트롤', isCore: true },
    stuff: { base: 0, skill: 0, career: 0, imprint: 0, manager: 0, label: '스터프(구위)', isCore: true },
    defense: { base: 0, skill: 0, career: 0, imprint: 0, manager: 0, label: '수비', isCore: false },
    pitchLimit: { base: 0, skill: 0, career: 0, imprint: 0, manager: 0, label: '한계투구', isCore: false },
    runnerCtrl: { base: 0, skill: 0, career: 0, imprint: 0, manager: 0, label: '주자견제', isCore: false },
  })

  const isPitcher = computed(() => {
    if (!selectedPlayer.value) return false
    const pos = String(selectedPlayer.value.position || '').toUpperCase()
    return pos.includes('SP') || pos.includes('RP') || !!selectedPlayer.value.movement
  })

  const playerLevel = ref(100); const collectionBuff = ref(0); const teamLevelBuff = ref(750); const careerLevelBuff = ref(149)
  const careerTeamCount = ref(0); const hitAceBuff = ref(0); const teamPlayerDignityBuff = ref(0)
  const binderBuff = ref(537); const clanBuff = ref(15)
  const ultimateImprintPercent = ref(0); const imprintStarterPower = ref(0); const careerAllStatFlat = ref(0)
  const enhancementLevel = ref(15); const breakthroughLevel = ref(0)
  const autoPowerPercent = ref(0); const selectedSkills = ref<string[]>([])
  const activeSynergyConditions = ref<Record<string, number>>({})

  const parsedRarity = computed(() => selectedPlayer.value ? Math.max(0, parseInt(String(selectedPlayer.value.rarity), 10) || 0) : 0)

  // 🌟 imprintStarterPower를 percentableGrowthB로 이동 (스킬 % 적용 받도록 수정 완료)
  const percentableGrowthA = computed(() => Number(Math.max(0, playerLevel.value - 1) * 10) + Number(collectionBuff.value || 0) + Number(teamLevelBuff.value || 0) + Number(careerLevelBuff.value || 0))
  const percentableGrowthB = computed(() => Number((careerTeamCount.value || 0) * 112) + Number(hitAceBuff.value || 0) + Number(teamPlayerDignityBuff.value || 0) + Number(imprintStarterPower.value || 0))
  const unpercentableGrowthC = computed(() => Number(binderBuff.value || 0) + Number(clanBuff.value || 0) + (Number(careerAllStatFlat.value || 0) * 5))

  const maxEnhanceLevel = computed(() => selectedPlayer.value && String(selectedPlayer.value.grade).toUpperCase() === 'DGN' ? 10 : 15)
  const enhanceMultiplier = computed(() => {
    if (!selectedPlayer.value) return 0
    const grade = String(selectedPlayer.value.grade).toUpperCase()
    const map: Record<string, number> = { 'SEA': 30, 'ASG': 30, 'POS': 40, 'TEA': 40, 'MMVP': 40, 'ROY': 50, 'HIT': 50, 'ACE': 50, 'GG': 50, 'TOP': 50, 'GGY': 50, 'DGN': 300 }
    return map[grade] || 0
  })
  const autoEnhanceFixed = computed(() => Number(enhancementLevel.value) * Number(enhanceMultiplier.value))

  const maxBreakthrough = computed(() => selectedPlayer.value && String(selectedPlayer.value.grade).toUpperCase() !== 'DGN' ? parsedRarity.value + 1 : 0)
  const autoBreakthroughFixed = computed(() => {
    if (breakthroughLevel.value === 0 || !selectedPlayer.value) return 0
    const grade = String(selectedPlayer.value.grade).toUpperCase()
    const lvl = Number(breakthroughLevel.value)
    if (['SEA', 'ASG', 'POS'].includes(grade)) return 30 * ([0, 1, 3, 6, 10, 15, 21, 28, 36][lvl] || 0)
    if (['TEA', 'ROY', 'MMVP'].includes(grade)) return 50 * ([0, 1, 3, 6, 10, 15, 21, 28, 36][lvl] || 0)
    if (['HIT', 'ACE', 'GG', 'TOP', 'GGY'].includes(grade)) return 100 * ([0, 1, 2.5, 4.5, 7, 10, 15, 21, 28][lvl] || 0)
    return 0
  })

  const maxSkillSlots = computed(() => parsedRarity.value <= 3 ? 1 : parsedRarity.value === 4 ? 2 : 3)
  const availableSkills = computed(() => {
    if (!selectedPlayer.value) return []
    const baseSkills = getArray(selectedPlayer.value.skill)
    const enhancedSkills = getArray(selectedPlayer.value.enhancedSkill)
    const excluded = ["야전사령관", "인사이드 워크", "투수 리드", "친화력", "도루 저지"]
    return Array.from(new Set([...baseSkills, ...enhancedSkills].filter(s => !excluded.includes(s))))
  })

  watch(selectedSkills, () => {
    let totalPowerP = 0
    let statPercents: Record<string, number> = { contact: 0, gapPower: 0, homeRunPower: 0, plateDiscipline: 0, strikeoutAvoidance: 0, stealing: 0, baseRunning: 0, defense: 0, movement: 0, longHitSup: 0, hrSup: 0, control: 0, stuff: 0, pitchLimit: 0, runnerCtrl: 0 }
    selectedSkills.value.forEach(s => {
      if (s && SKILL_EFFECTS[s]) {
        totalPowerP += SKILL_EFFECTS[s].powerPercent || 0
        for (const [key, val] of Object.entries(SKILL_EFFECTS[s].stats || {})) statPercents[key] += Number(val)
      }
    })
    autoPowerPercent.value = totalPowerP
    const targetStats = isPitcher.value ? pitcherStats : batterStats
    Object.keys(targetStats).forEach(key => targetStats[key as keyof typeof targetStats].skill = statPercents[key] || 0)
  }, { deep: true })

  const playerSynergiesData = computed(() => {
    if (!selectedPlayer.value) return []
    const rawSynNames = getArray(selectedPlayer.value.synergy)
    const expandedSet = new Set<string>(rawSynNames)
    let added = true
    while (added) {
      added = false
      for (const syn of Array.from(expandedSet)) {
        if (synergyHierarchy[syn]) {
          synergyHierarchy[syn].forEach(lowerSyn => { if (!expandedSet.has(lowerSyn)) { expandedSet.add(lowerSyn); added = true } })
        }
      }
    }
    const finalSynNames = Array.from(expandedSet)
    const getSynergyType = (conditions: any[]) => {
      const pitStats = ['movement', 'longHitSuppression', 'homeRunSuppression', 'control', 'stuff', 'pitchLimit', 'runnerControl']
      const batStats = ['contact', 'gapPower', 'homeRunPower', 'plateDiscipline', 'strikeoutAvoidance', 'stealing', 'baseRunning']
      const isPit = conditions?.some(c => pitStats.includes(c.stat))
      const isBat = conditions?.some(c => batStats.includes(c.stat))
      return isPit && !isBat ? 'pitcher' : (isBat && !isPit ? 'batter' : 'both')
    }
    return synergys.value.filter(s => {
      if (!finalSynNames.includes(s.synergy)) return false
      const synType = getSynergyType(s.conditions)
      if (isPitcher.value && synType === 'batter') return false
      if (!isPitcher.value && synType === 'pitcher') return false
      return true
    })
  })

  const autoSynergyFixed = computed(() => {
    let total = 0
    for (const [synName, condIdx] of Object.entries(activeSynergyConditions.value)) {
      const syn = synergys.value.find(s => s.synergy === synName)
      if (syn && syn.conditions[condIdx]) { const cond = syn.conditions[condIdx]; if (cond.stat === 'power' && cond.bonus.unit === 'fixed') total += cond.bonus.value }
    }
    return total
  })
  const autoSynergyPercent = computed(() => {
    let total = 0
    for (const [synName, condIdx] of Object.entries(activeSynergyConditions.value)) {
      const syn = synergys.value.find(s => s.synergy === synName)
      if (syn && syn.conditions[condIdx]) { const cond = syn.conditions[condIdx]; if (cond.stat === 'power' && cond.bonus.unit === 'percent') total += cond.bonus.value }
    }
    return total
  })

  const baseTotalPower = computed(() => {
    let sum = 0
    const stats = isPitcher.value ? Object.values(pitcherStats) : Object.values(batterStats)
    stats.forEach(s => sum += Number(s.base || 0))
    return sum
  })

  const getStatTotal = (stat: { base: number, skill: number, career: number, imprint: number, manager: number, isCore: boolean }) => {
    let finalVal = Number(stat.base || 0)
    if (stat.isCore) {
      let growthA = Number(percentableGrowthA.value) + Number(autoEnhanceFixed.value)
      let growthB = Number(percentableGrowthB.value) + Number(autoSynergyFixed.value)
      let globalPercentPool = baseTotalPower.value + growthA
      let globalPercent = Number(autoPowerPercent.value) + Number(autoSynergyPercent.value) + Number(ultimateImprintPercent.value)
      let globalBonusTotal = globalPercentPool * (globalPercent / 100)
      let specificPercent = Number(stat.skill || 0)
      let statPreSpecific = finalVal + (growthA / 5) + (growthB / 5) + (globalBonusTotal / 5)
      let specificBonus = specificPercent !== 0 ? statPreSpecific * (specificPercent / 100) : 0
      let flatC = Number(unpercentableGrowthC.value) + Number(autoBreakthroughFixed.value)
      finalVal = statPreSpecific + specificBonus + (flatC / 5)
    } else {
      if (stat.skill) finalVal += finalVal * (Number(stat.skill) / 100)
    }
    finalVal += Number(stat.career || 0) + Number(stat.imprint || 0) + Number(stat.manager || 0)
    return Math.round(finalVal)
  }

  const totalPower = computed(() => {
    let finalSum = 0
    const stats = isPitcher.value ? Object.values(pitcherStats) : Object.values(batterStats)
    stats.forEach(s => finalSum += getStatTotal(s))
    return {
      finalSum, autoBreakthroughFixed: autoBreakthroughFixed.value, autoSynergyFixed: autoSynergyFixed.value,
      percentableGrowthBuffSum: Number(percentableGrowthA.value) + Number(percentableGrowthB.value) + Number(autoSynergyFixed.value),
      unpercentableGrowthBuffSum: unpercentableGrowthC.value, autoEnhanceFixed: autoEnhanceFixed.value,
      totalPercentBonus: autoPowerPercent.value + ultimateImprintPercent.value, synergyPercentBonus: autoSynergyPercent.value
    }
  })

  const filteredPlayers = computed(() => {
    let result = players.value
    if (selectedGrade.value) result = result.filter(p => String(p.grade).toUpperCase() === selectedGrade.value)
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase().trim()
      result = result.filter(p => String(p.name || '').toLowerCase().includes(query))
    }
    if (!searchQuery.value.trim() && !selectedGrade.value) return []
    return result.slice(0, 50)
  })

  const selectPlayer = (p: Raw) => {
    selectedPlayer.value = p
    searchQuery.value = ''
    selectedGrade.value = ''
    searchFocused.value = false
    selectedSkills.value = []
    activeSynergyConditions.value = {}
    autoPowerPercent.value = 0
    breakthroughLevel.value = 0
    playerLevel.value = 100; teamLevelBuff.value = 750; binderBuff.value = 537; careerLevelBuff.value = 149; careerTeamCount.value = 0
    teamPlayerDignityBuff.value = 0; clanBuff.value = 15; ultimateImprintPercent.value = 0; imprintStarterPower.value = 0; careerAllStatFlat.value = 0
    
    const grade = String(p.grade || '').toUpperCase()
    enhancementLevel.value = grade === 'DGN' ? 10 : 15
    if (['SEA', 'ASG'].includes(grade)) collectionBuff.value = 800
    else if (['POS', 'TEA', 'MMVP', 'HIT', 'ACE', 'GGY'].includes(grade)) collectionBuff.value = 900
    else if (grade === 'GG' || grade === 'ROY') collectionBuff.value = 1000
    else if (grade === 'TOP') collectionBuff.value = 1200
    else collectionBuff.value = 0

    hitAceBuff.value = ['HIT', 'ACE', 'GG'].includes(grade) ? 896 : 0

    Object.values(batterStats).forEach(stat => { stat.base=0; stat.skill=0; stat.career=0; stat.imprint=0; stat.manager=0 })
    Object.values(pitcherStats).forEach(stat => { stat.base=0; stat.skill=0; stat.career=0; stat.imprint=0; stat.manager=0 })
    
    if (isPitcher.value) {
      pitcherStats.movement.base = Number(p.movement || 0); pitcherStats.longHitSup.base = Number(p.longHitSuppression || 0)
      pitcherStats.hrSup.base = Number(p.homeRunSuppression || 0); pitcherStats.control.base = Number(p.control || 0)
      pitcherStats.stuff.base = Number(p.stuff || 0); pitcherStats.defense.base = Number(p.defense || 0)
      pitcherStats.pitchLimit.base = Number(p.pitchLimit || 0); pitcherStats.runnerCtrl.base = Number(p.runnerControl || 0)
    } else {
      batterStats.contact.base = Number(p.contact || 0); batterStats.gapPower.base = Number(p.gapPower || 0)
      batterStats.homeRunPower.base = Number(p.homeRunPower || 0); batterStats.plateDiscipline.base = Number(p.plateDiscipline || 0)
      batterStats.strikeoutAvoidance.base = Number(p.strikeoutAvoidance || 0); batterStats.stealing.base = Number(p.stealing || 0)
      batterStats.baseRunning.base = Number(p.baseRunning || 0); batterStats.defense.base = Number(p.defense || 0)
    }
  }

  const toggleSkill = (skill: string) => {
    if (selectedSkills.value.includes(skill)) selectedSkills.value = selectedSkills.value.filter(s => s !== skill)
    else {
      if (selectedSkills.value.length >= maxSkillSlots.value) return alert(`이 카드는 별 등급에 따라 최대 ${maxSkillSlots.value}개의 스킬만 장착할 수 있습니다.`)
      selectedSkills.value.push(skill)
    }
  }

  const toggleSynergyCondition = (synName: string, idx: number) => {
    if (activeSynergyConditions.value[synName] === idx) {
      const newObj = { ...activeSynergyConditions.value }; delete newObj[synName]; activeSynergyConditions.value = newObj
    } else activeSynergyConditions.value = { ...activeSynergyConditions.value, [synName]: idx }
  }
  const formatConditionText = (cond: any) => {
    if (!cond.count) return ''
    if (cond.count.op === 'between') return `${cond.count.min}~${cond.count.max}명`
    if (cond.count.op === '<=') return `${cond.count.value}명 이하`
    if (cond.count.op === '==') return `${cond.count.value}명`
    return `${cond.count.value}명 이상`
  }

  return reactive({
    name, searchQuery, searchFocused, selectedGrade, selectedPlayer,
    batterStats, pitcherStats, isPitcher, playerLevel, collectionBuff, teamLevelBuff, careerLevelBuff,
    careerTeamCount, hitAceBuff, teamPlayerDignityBuff, binderBuff, clanBuff, imprintStarterPower, careerAllStatFlat,
    enhancementLevel, breakthroughLevel, ultimateImprintPercent, selectedSkills, activeSynergyConditions,
    parsedRarity, percentableGrowthA, percentableGrowthB, unpercentableGrowthC, maxEnhanceLevel, enhanceMultiplier,
    autoEnhanceFixed, maxBreakthrough, autoBreakthroughFixed, maxSkillSlots, availableSkills, playerSynergiesData,
    autoSynergyFixed, autoSynergyPercent, totalPower, filteredPlayers,
    selectPlayer, toggleSkill, toggleSynergyCondition, formatConditionText, getStatTotal
  })
}

// 듀얼 계산기 인스턴스 2개 생성
const calc1 = createCalculator('A')
const calc2 = createCalculator('B')

onMounted(async () => {
  try {
    const [csvRes, synRes, skillRes] = await Promise.all([
      fetch('/DB/player_sorted.csv', { cache: 'no-store' }), fetch('/DB/synergys.json', { cache: 'no-store' }), fetch('/DB/normal_skill.json', { cache: 'no-store' })
    ])
    if (skillRes.ok) normalSkillData.value = await skillRes.json()
    const csvText = await csvRes.text()
    const result: Raw[] = []
    Papa.parse(csvText, { header: true, skipEmptyLines: true, complete: ({ data }) => (data as Raw[]).forEach(row => result.push(row)) })
    players.value = result
    if (synRes.ok) {
      const synJson = await synRes.json()
      synergys.value = (Array.isArray(synJson) ? synJson : []).filter((it: any) => Array.isArray(it?.conditions) && it.conditions.length > 0)
    }
  } catch (e) { console.error(e) } finally { isLoading.value = false }
})

// === 하단 대칭 테이블 렌더링용 ===
const batterKeys = ['contact', 'gapPower', 'homeRunPower', 'plateDiscipline', 'strikeoutAvoidance', 'stealing', 'baseRunning', 'defense']
const pitcherKeys = ['movement', 'longHitSup', 'hrSup', 'control', 'stuff', 'defense', 'pitchLimit', 'runnerCtrl']

const globalRole = computed(() => {
  if (calc1.selectedPlayer) return calc1.isPitcher ? 'pitcher' : 'batter'
  if (calc2.selectedPlayer) return calc2.isPitcher ? 'pitcher' : 'batter'
  return 'batter'
})
const activeStatKeys = computed(() => globalRole.value === 'pitcher' ? pitcherKeys : batterKeys)

const getStatRef = (calc: any, key: string) => globalRole.value === 'pitcher' ? calc.pitcherStats[key] : calc.batterStats[key]
const getFinalStat = (calc: any, key: string) => calc.selectedPlayer ? calc.getStatTotal(getStatRef(calc, key)) : 0
</script>

<template>
  <div class="bg-neutral-50 dark:bg-neutral-900 min-h-screen transition-colors p-4 lg:p-6" @click="calc1.searchFocused = false; calc2.searchFocused = false">
    <!-- 와이드 제한 해제 -->
    <div class="w-full mx-auto">
      <header class="mb-6 flex items-center gap-3 pl-2">
        <div class="p-3 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-600/20">
          <Calculator class="w-6 h-6" />
        </div>
        <h1 class="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">듀얼 스탯 계산기</h1>
      </header>

      <div v-if="isLoading" class="flex h-64 items-center justify-center">
        <div class="animate-spin rounded-full border-4 border-neutral-300 dark:border-neutral-600 border-t-blue-600 h-10 w-10"></div>
      </div>

      <div v-else class="flex flex-col gap-6">
        
        <!-- 🚀 상단: 듀얼 계산기 구역 -->
        <!-- 갭을 넓게 주어 분리감 줌 -->
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 2xl:gap-8 w-full">
          
          <!-- 반복문으로 A, B 두 개의 계산기 UI 렌더링 -->
          <template v-for="(calc, index) in [calc1, calc2]" :key="index">
            <div class="flex flex-col gap-5 bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
              
              <!-- 1. 드롭다운 스마트 검색바 (크기 원상복구) -->
              <div class="relative w-full z-[100]" @click.stop>
                <div class="flex items-center gap-3 mb-3">
                  <div class="relative flex-1">
                    <input v-model="calc.searchQuery" @focus="calc.searchFocused = true" type="text" placeholder="선수 이름 검색..." class="w-full pl-12 pr-4 py-3.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:border-blue-500 transition-colors text-base font-bold text-neutral-900 dark:text-neutral-100 shadow-inner" />
                    <Search class="w-5 h-5 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <button v-if="calc.searchQuery" @click="calc.searchQuery = ''" class="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"><X class="w-5 h-5" /></button>
                  </div>
                </div>

                <div v-show="calc.searchFocused || calc.searchQuery" class="flex flex-wrap gap-2 mb-3 p-3 bg-neutral-50 dark:bg-neutral-800/90 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                  <button @click="calc.selectedGrade = ''" :class="calc.selectedGrade === '' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-600'" class="px-4 h-10 rounded-lg text-sm font-bold border transition-colors shadow-sm">ALL</button>
                  <button v-for="grade in filterGrades" :key="grade" @click="calc.selectedGrade = calc.selectedGrade === grade ? '' : grade" :class="calc.selectedGrade === grade ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'bg-white dark:bg-neutral-700 hover:bg-neutral-50 border-neutral-200 dark:border-neutral-600'" class="w-14 h-10 p-1.5 rounded-lg border transition-all flex items-center justify-center shadow-sm">
                    <img :src="`/assets/logos/grade/${grade}.png`" class="w-full h-full object-contain" :alt="grade" @error="(e) => { e.target.style.display='none'; e.target.nextElementSibling.style.display='block'; }" />
                  </button>
                </div>

                <!-- 검색 결과 드롭다운 팝업 -->
                <div v-show="(calc.searchFocused || calc.searchQuery) && calc.filteredPlayers.length > 0" class="absolute top-full left-0 w-full max-h-[400px] overflow-y-auto bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-2xl rounded-xl z-50 divide-y divide-neutral-100 dark:divide-neutral-700">
                  <button v-for="p in calc.filteredPlayers" :key="p.id" @click="calc.selectPlayer(p)" class="w-full text-left p-4 hover:bg-blue-50 dark:hover:bg-neutral-700/50 transition-all flex items-center gap-4">
                    <img :src="`/assets/logos/grade/${p.grade || 'C'}.png`" class="w-10 h-10 object-contain" />
                    <div>
                      <div class="font-bold text-base text-neutral-900 dark:text-neutral-100 flex items-center gap-2">{{ p.name }} <span class="text-xs bg-neutral-100 dark:bg-neutral-600 px-2 py-0.5 rounded text-neutral-600 dark:text-neutral-300">{{ p.position }}</span></div>
                      <div class="text-sm text-neutral-500 mt-1">{{ p.team }} · {{ p.year }}</div>
                    </div>
                  </button>
                </div>
              </div>

              <!-- 2. 선수 정보 카드 (크기 원상복구) -->
              <div v-if="calc.selectedPlayer" class="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-2xl text-white flex items-center gap-6 shadow-md">
                <img :src="`/assets/logos/grade/${calc.selectedPlayer.grade || 'C'}.png`" class="w-16 h-16 object-contain bg-white/10 rounded-xl p-2" />
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1.5">
                    <span class="px-2 py-0.5 bg-white/20 rounded text-xs font-bold">{{ calc.isPitcher ? '투수' : '타자' }}</span>
                    <span class="px-2 py-0.5 bg-white/20 rounded text-xs font-bold">{{ calc.selectedPlayer.position }}</span>
                    <span class="text-blue-100 text-sm ml-2">{{ calc.selectedPlayer.team }} · {{ calc.selectedPlayer.year }}</span>
                  </div>
                  <h2 class="text-3xl font-extrabold flex items-center gap-2">{{ calc.selectedPlayer.name }}
                    <div class="flex text-amber-300 ml-1"><Star v-for="n in calc.parsedRarity" :key="n" class="w-4 h-4" fill="currentColor" /></div>
                  </h2>
                </div>
                <div class="text-right flex flex-col items-end bg-black/20 p-4 rounded-xl border border-white/10">
                  <span class="text-blue-200 text-xs font-bold uppercase mb-1">총합 파워</span>
                  <span class="text-4xl font-black tabular-nums">{{ calc.totalPower.finalSum }}</span>
                </div>
              </div>
              <div v-else class="h-[136px] bg-neutral-100 dark:bg-neutral-800/50 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-neutral-400 font-bold text-base">
                <UserSearch class="w-6 h-6 mr-2 opacity-50"/> 위 검색창에서 선수를 선택해주세요
              </div>

              <!-- 3. 널널하고 시원한 세팅창 (가로 2칸 배열로 롤백) -->
              <div class="space-y-4" :class="{'opacity-40 pointer-events-none': !calc.selectedPlayer}">
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <!-- 그룹 A -->
                  <div class="p-4 bg-sky-50 dark:bg-sky-900/10 rounded-xl border border-sky-100 dark:border-sky-800/30">
                    <label class="text-sm font-bold text-sky-600 block mb-2">레벨/도감/팀랩/커랩</label>
                    <div class="grid grid-cols-4 gap-2">
                      <input type="number" v-model.number="calc.playerLevel" class="w-full text-center text-sm px-2 py-1.5 rounded-lg border outline-none" title="레벨"/>
                      <input type="number" v-model.number="calc.collectionBuff" class="w-full text-center text-sm px-2 py-1.5 rounded-lg border outline-none" title="도감"/>
                      <input type="number" v-model.number="calc.teamLevelBuff" class="w-full text-center text-sm px-2 py-1.5 rounded-lg border outline-none" title="팀레벨"/>
                      <input type="number" v-model.number="calc.careerLevelBuff" class="w-full text-center text-sm px-2 py-1.5 rounded-lg border border-sky-300 dark:border-sky-600 bg-sky-100/50 outline-none" title="커리어레벨"/>
                    </div>
                  </div>
                  <!-- 그룹 B -->
                  <div class="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/30">
                    <label class="text-sm font-bold text-amber-600 block mb-2 tracking-tight">커리어자팀 / 힛에골글 / 팀플디그강화능력치</label>
                    <div class="grid grid-cols-3 gap-2">
                      <input type="number" v-model.number="calc.careerTeamCount" class="w-full text-center text-sm px-2 py-1.5 rounded-lg border outline-none"/>
                      <input type="number" v-model.number="calc.hitAceBuff" class="w-full text-center text-sm px-2 py-1.5 rounded-lg border outline-none"/>
                      <input type="number" v-model.number="calc.teamPlayerDignityBuff" class="w-full text-center text-sm px-2 py-1.5 rounded-lg border outline-none"/>
                    </div>
                  </div>
                  <!-- 그룹 C -->
                  <div class="p-4 bg-fuchsia-50 dark:bg-fuchsia-900/10 rounded-xl border border-fuchsia-100 dark:border-fuchsia-800/30">
                    <label class="text-sm font-bold text-fuchsia-600 block mb-2">바인더/클랜/1,2선발 파워증가각인/커리어,각인 전체능력치</label>
                    <div class="grid grid-cols-4 gap-2">
                      <input type="number" v-model.number="calc.binderBuff" class="w-full text-center text-sm px-2 py-1.5 rounded-lg border outline-none"/>
                      <input type="number" v-model.number="calc.clanBuff" class="w-full text-center text-sm px-2 py-1.5 rounded-lg border outline-none"/>
                      <input type="number" v-model.number="calc.imprintStarterPower" class="w-full text-center text-sm px-2 py-1.5 rounded-lg border border-fuchsia-300 dark:border-fuchsia-600 bg-fuchsia-100/50 outline-none" title="특수각인"/>
                      <input type="number" v-model.number="calc.careerAllStatFlat" class="w-full text-center text-sm px-2 py-1.5 rounded-lg border outline-none"/>
                    </div>
                  </div>
                  <!-- 강화 및 돌파 -->
                  <div class="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                    <div class="flex justify-between items-center mb-2">
                       <label class="text-sm font-bold text-emerald-600 block">카드강화 (+{{calc.enhancementLevel}})</label>
                       <label class="text-sm font-bold text-fuchsia-600 block">돌파 ({{calc.breakthroughLevel}})</label>
                    </div>
                    <div class="flex gap-4 items-center h-full pb-3">
                       <input type="range" v-model.number="calc.enhancementLevel" min="0" :max="calc.maxEnhanceLevel" class="w-1/2 accent-emerald-500">
                       <input type="range" v-model.number="calc.breakthroughLevel" min="0" :max="calc.maxBreakthrough" class="w-1/2 accent-fuchsia-500">
                    </div>
                  </div>
                </div>

                <!-- 스킬 & 시너지 (가로/세로 유연하게 복구) -->
                <div class="flex flex-col xl:flex-row gap-4">
                  <!-- 스킬 영역 -->
                  <div class="flex-1 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700">
                     <div class="flex justify-between items-center mb-3">
                        <label class="text-sm font-bold text-indigo-600">장착 스킬 ({{calc.selectedSkills.length}}/{{calc.maxSkillSlots}})</label>
                        <div class="flex items-center gap-2"><span class="text-xs text-blue-500 font-bold">얼티밋(%)</span><input type="number" v-model.number="calc.ultimateImprintPercent" class="w-12 text-center text-sm p-1 border rounded outline-none"></div>
                     </div>
                     <div class="flex flex-wrap gap-2">
                        <button v-for="skill in calc.availableSkills" :key="skill" @click="calc.toggleSkill(skill)" @mouseenter="showSkillTooltip($event, skill)" @mouseleave="hideSkillTooltip" :class="calc.selectedSkills.includes(skill) ? 'bg-indigo-600 ring-4 ring-indigo-300' : 'bg-neutral-200 dark:bg-neutral-600 hover:ring-2 ring-neutral-400'" class="w-10 h-10 rounded-lg flex items-center justify-center transition-all">
                           <div class="w-8 h-8 bg-white/20 rounded-md" :class="`bg-${matchSkillInfo(skill)}`"></div>
                        </button>
                     </div>
                  </div>
                  
                  <!-- 시너지 영역 (가독성 향상 리스트형 UI로 수정) -->
                  <div class="flex-1 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700 h-full">
                     <div class="flex items-center gap-2 mb-4">
                        <Users class="w-4 h-4 text-indigo-500" />
                        <label class="text-sm font-bold text-indigo-600">
                           보유 시너지 적용 <span class="text-xs font-normal text-indigo-400 ml-1">(시너지 %는 오직 그룹 A 풀만 사용)</span>
                        </label>
                     </div>
                     
                     <div class="flex flex-col gap-3">
                        <div v-for="syn in calc.playerSynergiesData" :key="syn.synergy" class="flex flex-col xl:flex-row xl:items-center gap-2 pb-2">
                           <span class="text-sm font-bold text-neutral-700 dark:text-neutral-300 w-36 shrink-0">
                              {{ syn.synergy }}
                           </span>
                           <div class="flex flex-wrap gap-2">
                              <button v-for="(cond, idx) in syn.conditions" :key="idx" 
                                @click="calc.toggleSynergyCondition(syn.synergy, idx)" 
                                :class="calc.activeSynergyConditions[syn.synergy] === idx ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-transparent dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-400 dark:border-neutral-600 hover:border-indigo-400 hover:text-indigo-500'" 
                                class="px-3 py-1.5 text-[11px] font-bold border rounded-lg transition-all">
                                 {{ calc.formatConditionText(cond) }} (파워 +{{ cond.bonus.value }}{{ cond.bonus.unit === 'percent' ? '%' : '' }})
                              </button>
                           </div>
                        </div>
                        <div v-if="!calc.playerSynergiesData.length" class="text-xs text-neutral-400 py-2">
                           적용 가능한 시너지가 없습니다.
                        </div>
                     </div>
                  </div>
                </div>
                <!-- ★ 제일 바깥쪽 flex-row를 닫는 이 태그(</div>)가 지워져서 났던 에러입니다! ★ -->
              </div>
            </div>
          </template>
        </div>

        <!-- 🚀 하단: 거울 대칭형 듀얼 스탯 테이블 (가독성 펌핑) -->
        <div class="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6 overflow-x-auto w-full">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-2xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2"><ArrowUpCircle class="w-7 h-7 text-indigo-500" /> 통합 스탯 비교표</h3>
            <div class="text-sm text-neutral-500 font-bold bg-neutral-100 dark:bg-neutral-700 px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600"><span class="text-pink-500">(+숫자)</span> 표시는 양쪽 대비 우위를 뜻합니다.</div>
          </div>

          <!-- 테이블 폭을 시원하게 늘림 -->
          <table class="w-full text-center table-fixed min-w-[1200px] border-collapse">
            <thead>
              <tr class="text-neutral-600 dark:text-neutral-300 text-[13px] bg-neutral-100 dark:bg-neutral-800 border-t-2 border-b-2 border-neutral-200 dark:border-neutral-700">
                <!-- A슬롯 -->
                <th class="w-[7%] py-3 font-bold text-fuchsia-600">커리어</th>
                <th class="w-[7%] py-3 font-bold text-purple-600">각인</th>
                <th class="w-[7%] py-3 font-bold text-orange-600">감독</th>
                <th class="w-[7%] py-3 font-bold bg-blue-50/50 dark:bg-blue-900/10 text-blue-600">기본</th>
                <th class="w-[11%] py-3 font-black text-lg bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-700 border-r-2 border-neutral-300 dark:border-neutral-600">최종 (A)</th>
                
                <!-- ⚡중앙 센터⚡ -->
                <th class="w-[12%] py-3 font-black text-base tracking-widest text-neutral-800 dark:text-neutral-100 bg-neutral-200/50 dark:bg-neutral-700/50 border-r-2 border-neutral-300 dark:border-neutral-600 shadow-inner">스탯 항목</th>
                
                <!-- B슬롯 -->
                <th class="w-[11%] py-3 font-black text-lg bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-700">최종 (B)</th>
                <th class="w-[7%] py-3 font-bold bg-blue-50/50 dark:bg-blue-900/10 text-blue-600">기본</th>
                <th class="w-[7%] py-3 font-bold text-orange-600">감독</th>
                <th class="w-[7%] py-3 font-bold text-purple-600">각인</th>
                <th class="w-[7%] py-3 font-bold text-fuchsia-600">커리어</th>
              </tr>
            </thead>
            
            <tbody class="text-sm">
              <tr v-for="key in activeStatKeys" :key="key" class="border-b border-neutral-100 dark:border-neutral-700/50 hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors">
                
                <!-- A슬롯 입력/기본 (칸 크기 및 폰트 확장) -->
                <td class="p-2"><input type="number" v-model.number="getStatRef(calc1, key).career" class="w-full px-2 py-2 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-700 dark:text-neutral-300 outline-none focus:border-fuchsia-400" /></td>
                <td class="p-2"><input type="number" v-model.number="getStatRef(calc1, key).imprint" class="w-full px-2 py-2 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-700 dark:text-neutral-300 outline-none focus:border-purple-400" /></td>
                <td class="p-2"><input type="number" v-model.number="getStatRef(calc1, key).manager" class="w-full px-2 py-2 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-700 dark:text-neutral-300 outline-none focus:border-orange-400" /></td>
                <td class="p-2 font-bold text-neutral-500 bg-blue-50/20 dark:bg-blue-900/5">{{ getStatRef(calc1, key).base }}</td>
                
                <!-- A슬롯 최종결과 -->
                <td class="p-3 font-black text-xl bg-indigo-50/50 dark:bg-indigo-900/10 border-r-2 border-neutral-300 dark:border-neutral-600 flex-col items-center justify-center">
                  <div class="flex items-center justify-center gap-2 w-full h-full" :class="{'text-neutral-900 dark:text-neutral-100': getFinalStat(calc1, key) >= getFinalStat(calc2, key), 'text-neutral-400': getFinalStat(calc1, key) < getFinalStat(calc2, key)}">
                    {{ calc1.selectedPlayer ? getFinalStat(calc1, key) : '-' }}
                    <span v-if="calc1.selectedPlayer && calc2.selectedPlayer && getFinalStat(calc1, key) > getFinalStat(calc2, key)" class="text-[#ff1c76] text-sm font-black tracking-tighter">(+{{ getFinalStat(calc1, key) - getFinalStat(calc2, key) }})</span>
                  </div>
                </td>

                <!-- ⚡중앙 센터 이름⚡ -->
                <td class="p-3 font-black text-[15px] text-neutral-800 dark:text-neutral-200 bg-neutral-100/50 dark:bg-neutral-700/30 border-r-2 border-neutral-300 dark:border-neutral-600 shadow-inner">
                  <span v-if="getStatRef(calc1, key).isCore" class="text-amber-500 mr-1">⚡</span>{{ getStatRef(calc1, key).label }}
                </td>

                <!-- B슬롯 최종결과 -->
                <td class="p-3 font-black text-xl bg-indigo-50/50 dark:bg-indigo-900/10 flex-col items-center justify-center">
                  <div class="flex items-center justify-center gap-2 w-full h-full" :class="{'text-neutral-900 dark:text-neutral-100': getFinalStat(calc2, key) >= getFinalStat(calc1, key), 'text-neutral-400': getFinalStat(calc2, key) < getFinalStat(calc1, key)}">
                    <span v-if="calc1.selectedPlayer && calc2.selectedPlayer && getFinalStat(calc2, key) > getFinalStat(calc1, key)" class="text-[#ff1c76] text-sm font-black tracking-tighter">(+{{ getFinalStat(calc2, key) - getFinalStat(calc1, key) }})</span>
                    {{ calc2.selectedPlayer ? getFinalStat(calc2, key) : '-' }}
                  </div>
                </td>

                <!-- B슬롯 기본/입력 -->
                <td class="p-2 font-bold text-neutral-500 bg-blue-50/20 dark:bg-blue-900/5">{{ getStatRef(calc2, key).base }}</td>
                <td class="p-2"><input type="number" v-model.number="getStatRef(calc2, key).manager" class="w-full px-2 py-2 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-700 dark:text-neutral-300 outline-none focus:border-orange-400" /></td>
                <td class="p-2"><input type="number" v-model.number="getStatRef(calc2, key).imprint" class="w-full px-2 py-2 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-700 dark:text-neutral-300 outline-none focus:border-purple-400" /></td>
                <td class="p-2"><input type="number" v-model.number="getStatRef(calc2, key).career" class="w-full px-2 py-2 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-700 dark:text-neutral-300 outline-none focus:border-fuchsia-400" /></td>
              </tr>
            </tbody>

            <tfoot class="border-t-4 border-neutral-300 dark:border-neutral-600 bg-indigo-100/30 dark:bg-indigo-900/30">
              <tr>
                <td colspan="4" class="p-4 text-right font-bold text-neutral-500 text-xs">OVR은 8개 스탯의 최종합입니다 ➔</td>
                <td class="p-4 font-black text-3xl text-indigo-700 dark:text-indigo-400 border-r-2 border-neutral-300 dark:border-neutral-600">
                  <div class="flex items-center justify-center gap-2 w-full">
                    {{ calc1.selectedPlayer ? calc1.totalPower.finalSum : '-' }}
                    <span v-if="calc1.selectedPlayer && calc2.selectedPlayer && calc1.totalPower.finalSum > calc2.totalPower.finalSum" class="text-[#ff1c76] text-lg font-black tracking-tighter">(+{{ calc1.totalPower.finalSum - calc2.totalPower.finalSum }})</span>
                  </div>
                </td>
                <td class="p-4 font-black text-lg tracking-widest text-indigo-900 dark:text-indigo-200 bg-indigo-200/50 dark:bg-indigo-800/50 border-r-2 border-neutral-300 dark:border-neutral-600">총합 파워</td>
                <td class="p-4 font-black text-3xl text-indigo-700 dark:text-indigo-400">
                  <div class="flex items-center justify-center gap-2 w-full">
                    <span v-if="calc1.selectedPlayer && calc2.selectedPlayer && calc2.totalPower.finalSum > calc1.totalPower.finalSum" class="text-[#ff1c76] text-lg font-black tracking-tighter">(+{{ calc2.totalPower.finalSum - calc1.totalPower.finalSum }})</span>
                    {{ calc2.selectedPlayer ? calc2.totalPower.finalSum : '-' }}
                  </div>
                </td>
                <td colspan="4" class="p-4 text-left font-bold text-neutral-500 text-xs">⚖️ 좌우 대칭 비교표</td>
              </tr>
            </tfoot>
          </table>
        </div>

      </div>
    </div>
  </div>

  <!-- 🌟 글로벌 스킬 툴팁 -->
  <div v-if="tooltipState.show" class="fixed z-[99999] pointer-events-none drop-shadow-2xl transition-all duration-75" :style="{ top: (tooltipState.y - 8) + 'px', left: tooltipState.x + 'px', transform: tooltipState.transform }">
      <div class="bg-neutral-900 dark:bg-white text-neutral-100 dark:text-neutral-900 text-xs font-medium px-4 py-3 rounded-xl shadow-2xl text-left leading-relaxed whitespace-pre-wrap border border-neutral-700 dark:border-neutral-200 w-max max-w-[280px]">{{ getNormalSkillDescription(tooltipState.skill) }}</div>
      <div class="absolute bottom-0 w-3 h-3 bg-neutral-900 dark:bg-white rotate-45 border-r border-b border-neutral-700 dark:border-neutral-200" :style="{ left: tooltipState.arrowLeft, transform: 'translate(-50%, 50%)' }"></div>
  </div>
</template>

<style scoped>
input[type="number"]::-webkit-inner-spin-button, input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
input[type="number"] { -moz-appearance: textfield; }
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
.dark ::-webkit-scrollbar-thumb { background: #475569; }
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
