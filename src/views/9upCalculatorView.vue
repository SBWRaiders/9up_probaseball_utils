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

// 🌟 크래시 방지 안전 장치
const parsedRarity = computed(() => {
  if (!selectedPlayer.value) return 0
  return Math.max(0, parseInt(String(selectedPlayer.value.rarity), 10) || 0)
})

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

// === 기본 육성 및 버프 로직 (엑셀 역산 그룹 분리 완벽 적용) ===

// [그룹 A] 글로벌 % (시너지, 타순 등)의 기준이 되는 공통 성장 버프
const playerLevel = ref(100)          
const collectionBuff = ref(0)         
const teamLevelBuff = ref(750)        
const careerLevelBuff = ref(149)      

// [그룹 B] 개별 스킬 % (OPS 등) 계산 시에만 추가 합류하는 버프
const careerTeamCount = ref(0) 
const hitAceBuff = ref(0)             
const teamPlayerDignityBuff = ref(0)  

// [그룹 C] 어떠한 퍼센트(%) 연산에도 포함되지 않는 순수 깡파워 (바인더, 클랜 고정!)
const binderBuff = ref(527)           
const clanBuff = ref(15)              

const ultimateImprintPercent = ref(0) 

// 1. [그룹 A] 합산
const percentableGrowthA = computed(() => {
  return Number(Math.max(0, Number(playerLevel.value) - 1) * 10) + 
         Number(collectionBuff.value || 0) + 
         Number(teamLevelBuff.value || 0) + 
         Number(careerLevelBuff.value || 0)
})

// 2. [그룹 B] 합산
const percentableGrowthB = computed(() => {
  return Number((careerTeamCount.value || 0) * 112) + 
         Number(hitAceBuff.value || 0) +
         Number(teamPlayerDignityBuff.value || 0)
})

// 3. [그룹 C] 합산
const unpercentableGrowthC = computed(() => {
  return Number(binderBuff.value || 0) + 
         Number(clanBuff.value || 0)
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

// 강화는 그룹 A(글로벌 풀)에 속함
const autoEnhanceFixed = computed(() => {
  return Number(enhancementLevel.value) * Number(enhanceMultiplier.value)
})

// === 한계 돌파(Breakthrough) 시스템 로직 ===
const breakthroughLevel = ref(0)

const maxBreakthrough = computed(() => {
  if (!selectedPlayer.value) return 0
  const grade = String(selectedPlayer.value.grade).toUpperCase()
  if (grade === 'DGN') return 0 
  return parsedRarity.value + 1
})

const autoBreakthroughFixed = computed(() => {
  if (breakthroughLevel.value === 0 || !selectedPlayer.value) return 0
  const grade = String(selectedPlayer.value.grade).toUpperCase()
  const lvl = Number(breakthroughLevel.value)
  
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
  const r = parsedRarity.value
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
      alert(`이 카드는 별 등급에 따라 최대 ${maxSkillSlots.value}개의 스킬만 장착할 수 있습니다.`)
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
const managerBuff = ref(0) 

const imprintMainPower = ref(0)
const imprintSubPower = ref(0)
const imprintStarterPower = ref(0)

// === 시너지 시스템 ===
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
  managerBuff.value = 0 
  autoPowerPercent.value = 0
  enhancementLevel.value = 0
  breakthroughLevel.value = 0
  
  imprintMainPower.value = 0
  imprintSubPower.value = 0
  imprintStarterPower.value = 0
  
  playerLevel.value = 100
  teamLevelBuff.value = 750
  binderBuff.value = 527
  careerLevelBuff.value = 149
  careerTeamCount.value = 0 
  teamPlayerDignityBuff.value = 0 
  clanBuff.value = 15
  ultimateImprintPercent.value = 0
  collectionBuff.value = 0
  
  const grade = String(p.grade || '').toUpperCase()
  if (['SEA', 'ASG'].includes(grade)) collectionBuff.value = 800
  else if (['POS', 'TEA', 'MMVP', 'GG', 'HIT', 'ACE'].includes(grade)) collectionBuff.value = 900
  else if (grade === 'ROY') collectionBuff.value = 1000
  else if (grade === 'TOP') collectionBuff.value = 1200

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

// 스킬 변경 시 내장 스탯 % 업데이트
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
      pitcherStats[key as keyof typeof pitcherStats].skill = statPercents[key] || 0
    })
  } else {
    Object.keys(batterStats).forEach(key => {
      batterStats[key as keyof typeof batterStats].skill = statPercents[key] || 0
    })
  }
}, { deep: true })

// 🌟 모든 8개 스탯의 기본합 총합 (거대 풀 연산의 기초)
const baseTotalPower = computed(() => {
  let sum = 0;
  if (isPitcher.value) {
    Object.values(pitcherStats).forEach(s => sum += Number(s.base || 0));
  } else {
    Object.values(batterStats).forEach(s => sum += Number(s.base || 0));
  }
  return sum;
})

// ✨ [오류 완벽 해결] 시너지 고정파워를 개별 스킬 풀에 편입시키는 마스터 엔진
const getStatTotal = (stat: { base: number, skill: number, career: number, imprint: number, isCore: boolean }) => {
  let finalVal = Number(stat.base || 0);
  
  if (stat.isCore) {
    // 1. [그룹 A] 글로벌 퍼센트(시너지, 타순 등)의 기준이 되는 공통 성장
    let growthA = Number(percentableGrowthA.value) + Number(autoEnhanceFixed.value);
    
    // 2. [그룹 B] 개별 스킬 연산 시에만 합류하는 추가 성장
    // 👉 회원님이 찾아내신 완벽한 팩트: 시너지 고정 파워(autoSynergyFixed)는 개별 스킬 % 연산에 합류합니다!!
    let growthB = Number(percentableGrowthB.value) + Number(autoSynergyFixed.value);
    
    // 3. 글로벌 퍼센트 보너스 
    // 글로벌은 오직 "8스탯 기본합 + 그룹 A"에만 곱해집니다! (시너지 깡파워 영향 안 받음)
    let globalPercentPool = baseTotalPower.value + growthA;
    let globalPercent = Number(autoPowerPercent.value) + Number(manualPowerPercent.value) + Number(autoSynergyPercent.value) + Number(ultimateImprintPercent.value);
    let globalBonusTotal = globalPercentPool * (globalPercent / 100);
    
    // 4. 개별 스킬 퍼센트 보너스 (OPS형 타자 등 특정 스탯 % 증가)
    // 👉 스킬 보너스는 (본인기본값 + 그룹A/5 + 그룹B/5 + 글로벌보너스/5) 전체 덩치에 곱해집니다.
    // 👉 이 때 그룹B에 시너지 고정 파워가 포함되어 있으므로, 회원님 말씀대로 스킬 % 뻥튀기를 정상적으로 받습니다!
    let specificPercent = Number(stat.skill || 0);
    let specificBonus = 0;
    
    let statPreSpecific = finalVal + (growthA / 5) + (growthB / 5) + (globalBonusTotal / 5);
    
    if (specificPercent !== 0) {
       specificBonus = statPreSpecific * (specificPercent / 100);
    }
    
    // 5. [그룹 C] 퍼센트 연산을 절대 받지 않는 순수 깡파워 (바인더, 클랜 등)
    let imprintGlobal = Number(imprintMainPower.value || 0) + Number(imprintSubPower.value || 0);
    if (isPitcher.value) imprintGlobal += Number(imprintStarterPower.value || 0);
    
    let flatC = Number(unpercentableGrowthC.value)
              + Number(manualPowerFixed.value)
              + Number(autoBreakthroughFixed.value)
              + Number(careerAllStatFlat.value)
              + Number(managerBuff.value)
              + imprintGlobal;
    
    // 6. 최종 합산
    finalVal = statPreSpecific + specificBonus + (flatC / 5);
    
    // 7. 코어 여부 상관없이 더해지는 개별 깡스탯
    finalVal += Number(stat.career || 0) + Number(stat.imprint || 0);
    
    // 8. 최종 소수점 반올림 처리
    return Math.round
