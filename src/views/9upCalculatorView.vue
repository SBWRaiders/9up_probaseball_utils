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
const selectedGrade = ref<string>('')
const filterGrades = ['DGN', 'TOP', 'GG', 'GGY', 'HIT', 'ACE', 'ROY', 'MMVP', 'TEA', 'POS', 'ASG', 'SEA']
const selectedPlayer = ref<Raw | null>(null)

const parsedRarity = computed(() => {
  if (!selectedPlayer.value) return 0
  return Math.max(0, parseInt(String(selectedPlayer.value.rarity), 10) || 0)
})

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

const playerLevel = ref(100)          
const collectionBuff = ref(0)         
const teamLevelBuff = ref(750)        
const careerLevelBuff = ref(149)      

const careerTeamCount = ref(0) 
const hitAceBuff = ref(0)             
const teamPlayerDignityBuff = ref(0)  

const binderBuff = ref(537) 
const clanBuff = ref(15)              

const ultimateImprintPercent = ref(0) 

const percentableGrowthA = computed(() => {
  return Number(Math.max(0, Number(playerLevel.value) - 1) * 10) + 
         Number(collectionBuff.value || 0) + 
         Number(teamLevelBuff.value || 0) + 
         Number(careerLevelBuff.value || 0)
})

const percentableGrowthB = computed(() => {
  return Number((careerTeamCount.value || 0) * 112) + 
         Number(hitAceBuff.value || 0) +
         Number(teamPlayerDignityBuff.value || 0)
})

const unpercentableGrowthC = computed(() => {
  return Number(binderBuff.value || 0) + 
         Number(clanBuff.value || 0)
})

const enhancementLevel = ref(15)

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
    'ROY': 50, 'HIT': 50, 'ACE': 50, 'GG': 50, 'TOP': 50, 'GGY': 50,
    'DGN': 300
  }
  return map[grade] || 0
})

const autoEnhanceFixed = computed(() => {
  return Number(enhancementLevel.value) * Number(enhanceMultiplier.value)
})

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
  } else if (['HIT', 'ACE', 'GG', 'TOP', 'GGY'].includes(grade)) {
    const mults = [0, 1, 2.5, 4.5, 7, 10, 15, 21, 28] 
    return 100 * (mults[lvl] || 0)
  }
  return 0
})

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

// === 시너지 시스템 ===
const activeSynergyConditions = ref<Record<string, number>>({})

const synergyHierarchy: Record<string, string[]> = {
  '190안타 클럽': ['180안타 클럽', '170안타 클럽'],
  '180안타 클럽': ['170안타 클럽'],
  '40홈런 클럽': ['30홈런 클럽'],
  '40도루 클럽': ['30도루 클럽'],
  '20승 클럽': ['15승 클럽'],
  '180탈삼진 클럽': ['150탈삼진 클럽'],
  '200이닝 클럽': ['180이닝 클럽'],
  '30세이브 클럽': ['20세이브 클럽'],
  '30홀드 클럽': ['20홀드 클럽'],
  '계투 80이닝 클럽': ['계투 70이닝 클럽'],
  '3-30-100-100 클럽': ['3-30-100 클럽', '100득점-100타점 클럽', '100타점 클럽', '30홈런 클럽'],
  '3-30-100 클럽': ['100타점 클럽', '30홈런 클럽'],
  '100득점-100타점 클럽': ['100타점 클럽'],
  '통산 2000경기 클럽': ['통산 1500경기 클럽', '통산 700경기 클럽', '통산 500경기 클럽'],
  '통산 1500경기 클럽': ['통산 700경기 클럽', '통산 500경기 클럽'],
  '통산 700경기 클럽': ['통산 500경기 클럽'],
  '통산 2000안타 클럽': ['통산 1500안타 클럽'],
  '통산 300도루 클럽': ['통산 200도루 클럽'],
  '통산 300홈런 클럽': ['통산 200홈런 클럽']
}

const playerSynergiesData = computed(() => {
  if (!selectedPlayer.value) return []
  const rawSynNames = getArray(selectedPlayer.value.synergy)
  const expandedSet = new Set<string>(rawSynNames)
  
  let added = true
  while (added) {
    added = false
    for (const syn of Array.from(expandedSet)) {
      if (synergyHierarchy[syn]) {
        synergyHierarchy[syn].forEach(lowerSyn => {
          if (!expandedSet.has(lowerSyn)) {
            expandedSet.add(lowerSyn)
            added = true
          }
        })
      }
    }
  }
  
  const finalSynNames = Array.from(expandedSet)
  return synergys.value.filter(s => finalSynNames.includes(s.synergy))
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
  let result = players.value

  if (selectedGrade.value) {
    result = result.filter(p => String(p.grade).toUpperCase() === selectedGrade.value)
  }

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    result = result.filter(p => 
      String(p.name || '').toLowerCase().includes(query)
    )
  }

  if (!searchQuery.value.trim() && !selectedGrade.value) return []

  return result.slice(0, 50)
})

const selectPlayer = (p: Raw) => {
  selectedPlayer.value = p
  searchQuery.value = ''
  selectedGrade.value = '' 
  selectedSkills.value = [] 
  activeSynergyConditions.value = {}
  
  autoPowerPercent.value = 0
  breakthroughLevel.value = 0
  
  playerLevel.value = 100
  teamLevelBuff.value = 750
  binderBuff.value = 537 
  careerLevelBuff.value = 149
  careerTeamCount.value = 0 
  teamPlayerDignityBuff.value = 0 
  clanBuff.value = 15
  ultimateImprintPercent.value = 0
  collectionBuff.value = 0
  
  const grade = String(p.grade || '').toUpperCase()
  enhancementLevel.value = grade === 'DGN' ? 10 : 15
  
  if (['SEA', 'ASG'].includes(grade)) collectionBuff.value = 800
  else if (['POS', 'TEA', 'MMVP', 'HIT', 'ACE'].includes(grade)) collectionBuff.value = 900
  else if (grade === 'GGY') collectionBuff.value = 900
  else if (grade === 'GG' || grade === 'ROY') collectionBuff.value = 1000
  else if (grade === 'TOP') collectionBuff.value = 1200

  if (['HIT', 'ACE', 'GG'].includes(grade)) hitAceBuff.value = 896
  else hitAceBuff.value = 0
  
  Object.values(batterStats).forEach(stat => { stat.base=0; stat.skill=0; stat.career=0; stat.imprint=0; stat.manager=0 })
  Object.values(pitcherStats).forEach(stat => { stat.base=0; stat.skill=0; stat.career=0; stat.imprint=0; stat.manager=0 })
  
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
      pitcherStats[key as keyof typeof pitcherStats].skill = statPercents[key] || 0
    })
  } else {
    Object.keys(batterStats).forEach(key => {
      batterStats[key as keyof typeof batterStats].skill = statPercents[key] || 0
    })
  }
}, { deep: true })

const baseTotalPower = computed(() => {
  let sum = 0;
  if (isPitcher.value) {
    Object.values(pitcherStats).forEach(s => sum += Number(s.base || 0));
  } else {
    Object.values(batterStats).forEach(s => sum += Number(s.base || 0));
  }
  return sum;
})

const getStatTotal = (stat: { base: number, skill: number, career: number, imprint: number, manager: number, isCore: boolean }) => {
  let finalVal = Number(stat.base || 0);
  
  if (stat.isCore) {
    let growthA = Number(percentableGrowthA.value) + Number(autoEnhanceFixed.value);
    let growthB = Number(percentableGrowthB.value) + Number(autoSynergyFixed.value);
    
    let globalPercentPool = baseTotalPower.value + growthA;
    let globalPercent = Number(autoPowerPercent.value) + Number(autoSynergyPercent.value) + Number(ultimateImprintPercent.value);
    let globalBonusTotal = globalPercentPool * (globalPercent / 100);
    
    let specificPercent = Number(stat.skill || 0);
    let specificBonus = 0;
    
    let statPreSpecific = finalVal + (growthA / 5) + (growthB / 5) + (globalBonusTotal / 5);
    
    if (specificPercent !== 0) {
       specificBonus = statPreSpecific * (specificPercent / 100);
    }
    
    let flatC = Number(unpercentableGrowthC.value) + Number(autoBreakthroughFixed.value);
    
    finalVal = statPreSpecific + specificBonus + (flatC / 5);
    finalVal += Number(stat.career || 0) + Number(stat.imprint || 0) + Number(stat.manager || 0);
    
    return Math.round(finalVal); 
    
  } else {
    if (stat.skill) {
      finalVal += finalVal * (Number(stat.skill) / 100);
      finalVal = Math.round(finalVal);
    }
    finalVal += Number(stat.career || 0) + Number(stat.imprint || 0) + Number(stat.manager || 0);
    return Math.round(finalVal);
  }
}

const totalPower = computed(() => {
  let finalSum = 0;
  const stats = isPitcher.value ? Object.values(pitcherStats) : Object.values(batterStats);
  
  stats.forEach(s => {
    finalSum += getStatTotal(s);
  });
  
  return { 
    finalSum, 
    autoBreakthroughFixed: autoBreakthroughFixed.value, 
    autoSynergyFixed: autoSynergyFixed.value,
    percentableGrowthBuffSum: Number(percentableGrowthA.value) + Number(percentableGrowthB.value) + Number(autoSynergyFixed.value),
    unpercentableGrowthBuffSum: unpercentableGrowthC.value,
    clanBuff: clanBuff.value,
    binderBuff: binderBuff.value,
    hitAceBuff: hitAceBuff.value,
    careerLevelBuff: careerLevelBuff.value,
    autoEnhanceFixed: autoEnhanceFixed.value,
    totalPercentBonus: autoPowerPercent.value + ultimateImprintPercent.value,
    synergyPercentBonus: autoSynergyPercent.value
  }
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
                placeholder="이름으로 검색..." 
                class="w-full pl-10 pr-4 py-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors text-neutral-900 dark:text-neutral-100"
              />
              <Search class="w-5 h-5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <button v-if="searchQuery" @click="searchQuery = ''" class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                <X class="w-4 h-4" />
              </button>
            </div>
            
            <div class="grid grid-cols-5 gap-2 mb-4">
              <button 
                @click="selectedGrade = ''" 
                :class="selectedGrade === '' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'"
                class="w-full h-10 rounded-lg text-xs font-bold border transition-colors shadow-sm">
                ALL
              </button>
              <button 
                v-for="grade in filterGrades" :key="grade"
                @click="selectedGrade = selectedGrade === grade ? '' : grade"
                :class="selectedGrade === grade ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700'"
                class="w-full h-10 p-1.5 rounded-lg border transition-all flex items-center justify-center shadow-sm"
                :title="grade === 'GGY' ? '연도(골글)' : grade">
                <img :src="`/assets/logos/grade/${grade}.png`" class="w-full h-full object-contain" :alt="grade"
                     @error="(e) => { e.target.style.display='none'; e.target.nextElementSibling.style.display='block'; }" />
                <span class="text-[10px] font-bold text-neutral-400 hidden">{{ grade === 'GGY' ? '연도(골글)' : grade }}</span>
              </button>
            </div>
            
            <div v-if="(searchQuery || selectedGrade) && filteredPlayers.length > 0" class="max-h-[400px] overflow-y-auto space-y-2 pr-2">
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
            <div v-else-if="(searchQuery || selectedGrade) && filteredPlayers.length === 0" class="text-center py-10 text-neutral-500 text-sm">
              검색 결과가 없습니다.
            </div>
            <div v-else-if="!searchQuery && !selectedGrade" class="text-center py-10 text-neutral-400 text-sm">
              이름을 검색하거나 등급을 선택해주세요.
            </div>
          </section>
        </div>

        <div class="lg:col-span-9 flex flex-col gap-6">
          <section v-if="selectedPlayer" class="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
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
                    <Star v-for="n in parsedRarity" :key="n" class="w-4 h-4" fill="currentColor" />
                  </div>
                </h2>
              </div>
              <div class="text-right flex flex-col items-end bg-black/20 p-4 rounded-xl border border-white/10 shadow-inner">
                <span class="text-blue-200 text-xs font-semibold uppercase tracking-wider mb-1">종합 파워 (총합)</span>
                <div class="flex items-baseline gap-1">
                  <span class="text-4xl font-black tabular-nums">{{ totalPower.finalSum }}</span>
                </div>
              </div>
            </div>

            <div class="p-6 bg-sky-50/30 dark:bg-sky-900/10 border-b border-neutral-100 dark:border-neutral-700">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <TrendingUp class="w-4 h-4 text-sky-500" /> [그룹 A] 글로벌 퍼센트(%) 공통 기준 <span class="text-[10px] text-sky-600 font-normal ml-1">(모든 % 연산의 기초 뼈대)</span>
                </h3>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                <div class="flex flex-col gap-1">
                  <label class="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase" title="1레벨업당 핵심스탯 각각 +2 (총파워 +10)">선수 레벨</label>
                  <input type="number" v-model.number="playerLevel" min="1" max="100" class="w-full px-2 py-1.5 text-center bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm font-medium focus:border-sky-500 outline-none transition-colors" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase">도감 파워</label>
                  <input type="number" v-model.number="collectionBuff" class="w-full px-2 py-1.5 text-center bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm font-medium focus:border-sky-500 outline-none transition-colors" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase">팀 레벨 파워</label>
                  <input type="number" v-model.number="teamLevelBuff" class="w-full px-2 py-1.5 text-center bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm font-medium focus:border-sky-500 outline-none transition-colors" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-[11px] font-bold text-sky-600 dark:text-sky-400 uppercase">커리어 레벨 파워</label>
                  <input type="number" v-model.number="careerLevelBuff" class="w-full px-2 py-1.5 text-center bg-sky-50 dark:bg-sky-900/30 border border-sky-300 dark:border-sky-600 rounded-lg text-sm font-bold focus:border-sky-500 outline-none transition-colors" />
                </div>
              </div>
            </div>

            <div class="p-6 bg-amber-50/30 dark:bg-amber-900/10 border-b border-neutral-100 dark:border-neutral-700">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <Zap class="w-4 h-4 text-amber-500" /> [그룹 B] 개별 스킬(%) 추가 기준 <span class="text-[10px] text-amber-600 font-normal ml-1">(글로벌 퍼센트 무시, 개별 스탯 퍼센트에만 추가 합류)</span>
                </h3>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                <div class="flex flex-col gap-1">
                  <label class="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase" title="개당 112 증가">커리어 (자팀수)</label>
                  <input type="number" v-model.number="careerTeamCount" min="0" max="6" placeholder="ex: 3" class="w-full px-2 py-1.5 text-center bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-600 rounded-lg text-sm font-bold focus:border-amber-500 outline-none transition-colors" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase" title="HIT/ACE/골글 전용">HIT/ACE/골글 전용</label>
                  <input type="number" v-model.number="hitAceBuff" :disabled="!['HIT', 'ACE', 'GG'].includes(String(selectedPlayer.grade).toUpperCase())" class="w-full px-2 py-1.5 text-center border border-amber-300 dark:border-amber-600 rounded-lg text-sm font-medium focus:border-amber-500 outline-none transition-colors disabled:opacity-50 disabled:bg-neutral-100 dark:disabled:bg-neutral-900" :class="['HIT', 'ACE', 'GG'].includes(String(selectedPlayer.grade).toUpperCase()) ? 'bg-amber-50 dark:bg-amber-900/30' : 'bg-white dark:bg-neutral-800'" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase" title="팀플(최대 23) + 디그니티(100)">팀플+디그강화</label>
                  <input type="number" v-model.number="teamPlayerDignityBuff" placeholder="파워 합" class="w-full px-2 py-1.5 text-center bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-600 rounded-lg text-sm font-bold focus:border-amber-500 outline-none transition-colors" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase" title="시너지 깡파워는 자동으로 개별 스킬 연산에만 합류합니다.">시너지 고정파워</label>
                  <div class="w-full px-2 py-1.5 text-center bg-amber-100 dark:bg-amber-800/30 border border-amber-300 dark:border-amber-600 rounded-lg text-sm font-bold text-amber-700 dark:text-amber-400 opacity-80 select-none">+{{ autoSynergyFixed }} (자동)</div>
                </div>
              </div>
            </div>

            <div class="p-6 bg-fuchsia-50/30 dark:bg-fuchsia-900/10 border-b border-neutral-100 dark:border-neutral-700">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <Sparkles class="w-4 h-4 text-fuchsia-500" /> [그룹 C] 퍼센트 미적용 깡파워 <span class="text-[10px] text-fuchsia-600 font-normal ml-1">(모든 % 연산 완전 무시, 2대장 고정)</span>
                </h3>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                <div class="flex flex-col gap-1">
                  <label class="text-[11px] font-bold text-fuchsia-600 dark:text-fuchsia-400 uppercase">바인더 파워</label>
                  <input type="number" v-model.number="binderBuff" class="w-full px-2 py-1.5 text-center bg-fuchsia-50 dark:bg-fuchsia-900/30 border border-fuchsia-300 dark:border-fuchsia-600 rounded-lg text-sm font-bold focus:border-fuchsia-500 outline-none transition-colors" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-[11px] font-bold text-fuchsia-600 dark:text-fuchsia-400 uppercase" title="최대 15">클랜 레벨 파워</label>
                  <input type="number" v-model.number="clanBuff" min="0" max="15" class="w-full px-2 py-1.5 text-center bg-fuchsia-50 dark:bg-fuchsia-900/30 border border-fuchsia-300 dark:border-fuchsia-600 rounded-lg text-sm font-bold focus:border-fuchsia-500 outline-none transition-colors" />
                </div>
              </div>
            </div>

            <div class="p-6 bg-emerald-50/30 dark:bg-emerald-900/10 border-b border-neutral-100 dark:border-neutral-700">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <div class="flex items-center justify-between mb-3">
                    <h3 class="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                      <ArrowUpCircle class="w-4 h-4 text-emerald-500" /> 카드 강화 <span class="text-[10px] text-emerald-600 font-normal ml-1">(그룹 A 소속)</span>
                    </h3>
                    <span class="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold rounded-lg text-[10px] border border-emerald-200 dark:border-emerald-800">
                      1강당 파워 +{{ enhanceMultiplier }}
                    </span>
                  </div>
                  <div class="flex flex-wrap gap-1.5">
                    <button v-for="lvl in (maxEnhanceLevel + 1)" :key="lvl"
                      @click="enhancementLevel = lvl-1"
                      :class="enhancementLevel === lvl-1 ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-300 dark:border-neutral-600 hover:border-emerald-400 dark:hover:border-emerald-500'"
                      class="w-10 h-8 flex items-center justify-center text-xs font-bold border rounded-lg transition-colors">
                      +{{ lvl-1 }}
                    </button>
                  </div>
                </div>

                <div v-if="maxBreakthrough > 0">
                  <div class="flex items-center justify-between mb-3">
                    <h3 class="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                      <Sparkles class="w-4 h-4 text-fuchsia-500" /> 한계 돌파 <span class="text-[10px] text-fuchsia-600 font-normal ml-1">(그룹 C 소속)</span>
                    </h3>
                    <span class="px-2 py-1 bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-400 font-bold rounded-lg text-[10px] border border-fuchsia-200 dark:border-fuchsia-800">
                      누적 깡파워 배수 적용
                    </span>
                  </div>
                  <div class="flex flex-wrap gap-1.5">
                    <button v-for="lvl in (maxBreakthrough + 1)" :key="'brk'+lvl"
                      @click="breakthroughLevel = lvl-1"
                      :class="breakthroughLevel === lvl-1 ? 'bg-fuchsia-600 text-white border-fuchsia-600 shadow-md' : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-300 dark:border-neutral-600 hover:border-fuchsia-400 dark:hover:border-fuchsia-500'"
                      class="px-3 h-8 flex items-center justify-center text-xs font-bold border rounded-lg transition-colors">
                      {{ lvl-1 === 0 ? '돌파 안함' : lvl-1 + '돌' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="p-6 bg-neutral-50/50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-700">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <Zap class="w-4 h-4 text-amber-500" /> 스킬 장착 슬롯 <span class="text-[10px] text-amber-600 font-normal ml-1">(계산 시 그룹 A+B 풀 전체를 끌어와서 곱연산)</span>
                </h3>
                <div class="flex items-center gap-4">
                  <div class="flex flex-col gap-1 items-end">
                    <label class="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase" title="0~3% 전체 파워 증가 (글로벌 %로 취급)">얼티밋 각인(%)</label>
                    <input type="number" v-model.number="ultimateImprintPercent" min="0" max="3" class="w-20 px-2 py-1 text-center bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-600 rounded-lg text-xs font-bold focus:border-blue-500 outline-none transition-colors" />
                  </div>
                  <span class="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-bold rounded-lg text-xs border border-amber-200 dark:border-amber-800">
                    선택: {{ selectedSkills.length }} / {{ maxSkillSlots }}
                  </span>
                </div>
              </div>
              
              <div v-if="availableSkills.length > 0" class="flex flex-wrap gap-2">
                <button v-for="skill in availableSkills" :key="skill"
                  @click="toggleSkill(skill)"
                  :class="selectedSkills.includes(skill) ? 'bg-amber-500 text-white border-amber-600 shadow-md' : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-300 dark:border-neutral-600 hover:border-amber-400 dark:hover:border-amber-500'"
                  class="px-3 py-1.5 text-xs font-bold border rounded-lg transition-colors">
                  {{ skill }}
                </button>
              </div>
              <div v-else class="text-xs text-neutral-400">보유한 스킬이 없습니다.</div>
            </div>

            <div class="p-6 bg-indigo-50/30 dark:bg-indigo-900/10 border-b border-neutral-100 dark:border-neutral-700">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <Users class="w-4 h-4 text-indigo-500" /> 보유 시너지 적용 <span class="text-[10px] text-indigo-600 font-normal ml-1">(시너지 %는 오직 그룹 A 풀만 사용)</span>
                </h3>
              </div>
              <div class="flex flex-col gap-3">
                <div v-for="syn in playerSynergiesData" :key="syn.synergy" class="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span class="text-xs font-bold text-neutral-700 dark:text-neutral-300 w-36 shrink-0">{{ syn.synergy }}</span>
                  <div class="flex flex-wrap gap-2">
                    <button v-for="(cond, idx) in syn.conditions" :key="idx"
                      @click="toggleSynergyCondition(syn.synergy, idx)"
                      class="px-3 py-1.5 text-[11px] font-medium rounded-lg border transition-colors shadow-sm"
                      :class="activeSynergyConditions[syn.synergy] === idx ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-300 dark:border-neutral-600 hover:border-indigo-400 dark:hover:border-indigo-500'">
                      {{ formatConditionText(cond) }} (파워 +{{ cond.bonus.value }}{{ cond.bonus.unit === 'percent' ? '%' : '' }})
                    </button>
                  </div>
                </div>
                <div v-if="!playerSynergiesData.length" class="text-xs text-neutral-400">보유한 시너지가 없습니다.</div>
              </div>
            </div>

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
                      <th class="p-3 border-b border-r border-neutral-200 dark:border-neutral-700 font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 w-1/6">DB 기본 스탯</th>
                      <th class="p-3 border-b border-r border-neutral-200 dark:border-neutral-700 font-semibold w-1/6 bg-fuchsia-50/30 dark:bg-fuchsia-900/10 text-fuchsia-700 dark:text-fuchsia-400">커리어 깡스탯<br><span class="text-[10px] font-normal opacity-80">(% 미적용)</span></th>
                      <th class="p-3 border-b border-r border-neutral-200 dark:border-neutral-700 font-semibold w-1/6 bg-purple-50/30 dark:bg-purple-900/10 text-purple-700 dark:text-purple-400">각인 깡스탯<br><span class="text-[10px] font-normal opacity-80">(% 미적용)</span></th>
                      <th class="p-3 border-b border-r border-neutral-200 dark:border-neutral-700 font-semibold w-1/6 bg-orange-50/30 dark:bg-orange-900/10 text-orange-700 dark:text-orange-400">감독 깡스탯<br><span class="text-[10px] font-normal opacity-80">(% 미적용)</span></th>
                      <th class="p-3 border-b border-neutral-200 dark:border-neutral-700 font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10 w-1/6">최종 스탯</th>
                    </tr>
                  </thead>
                  
                  <tbody>
                    <template v-if="!isPitcher">
                      <tr v-for="(statObj, key) in batterStats" :key="key" class="border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors">
                        <td class="p-3 border-r border-neutral-200 dark:border-neutral-700 font-semibold text-neutral-800 dark:text-neutral-200 bg-neutral-50/50 dark:bg-neutral-700/20 text-left pl-4">
                          <span v-if="statObj.isCore" class="text-amber-500 font-black mr-1" title="파워의 영향을 받는 핵심 스탯">⚡</span>
                          <span v-else class="mr-3 opacity-0">⚡</span>
                          {{ statObj.label }}
                        </td>
                        <td class="p-3 border-r border-neutral-200 dark:border-neutral-700 font-bold text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/5">
                          {{ statObj.base }}
                        </td>
                        <td class="p-2 border-r border-neutral-200 dark:border-neutral-700 bg-fuchsia-50/20 dark:bg-fuchsia-900/10">
                          <input type="number" v-model.number="statObj.career" class="w-full px-1 py-1.5 text-center bg-white dark:bg-neutral-800 border border-fuchsia-300 dark:border-fuchsia-600 rounded-lg outline-none focus:border-fuchsia-500" />
                        </td>
                        <td class="p-2 border-r border-neutral-200 dark:border-neutral-700 bg-purple-50/20 dark:bg-purple-900/10">
                          <input type="number" v-model.number="statObj.imprint" class="w-full px-1 py-1.5 text-center bg-white dark:bg-neutral-800 border border-purple-300 dark:border-purple-600 rounded-lg outline-none focus:border-purple-500" />
                        </td>
                        <td class="p-2 border-r border-neutral-200 dark:border-neutral-700 bg-orange-50/20 dark:bg-orange-900/10">
                          <input type="number" v-model.number="statObj.manager" class="w-full px-1 py-1.5 text-center bg-white dark:bg-neutral-800 border border-orange-300 dark:border-orange-600 rounded-lg outline-none focus:border-orange-500" />
                        </td>
                        <td class="p-3 font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-900/5 text-lg">
                          {{ getStatTotal(statObj) }}
                        </td>
                      </tr>
                    </template>

                    <template v-else>
                      <tr v-for="(statObj, key) in pitcherStats" :key="key" class="border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors">
                        <td class="p-3 border-r border-neutral-200 dark:border-neutral-700 font-semibold text-neutral-800 dark:text-neutral-200 bg-neutral-50/50 dark:bg-neutral-700/20 text-left pl-4">
                          <span v-if="statObj.isCore" class="text-amber-500 font-black mr-1" title="파워의 영향을 받는 핵심 스탯">⚡</span>
                          <span v-else class="mr-3 opacity-0">⚡</span>
                          {{ statObj.label }}
                        </td>
                        <td class="p-3 border-r border-neutral-200 dark:border-neutral-700 font-bold text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/5">
                          {{ statObj.base }}
                        </td>
                        <td class="p-2 border-r border-neutral-200 dark:border-neutral-700 bg-fuchsia-50/20 dark:bg-fuchsia-900/10">
                          <input type="number" v-model.number="statObj.career" class="w-full px-1 py-1.5 text-center bg-white dark:bg-neutral-800 border border-fuchsia-300 dark:border-fuchsia-600 rounded-lg outline-none focus:border-fuchsia-500" />
                        </td>
                        <td class="p-2 border-r border-neutral-200 dark:border-neutral-700 bg-purple-50/20 dark:bg-purple-900/10">
                          <input type="number" v-model.number="statObj.imprint" class="w-full px-1 py-1.5 text-center bg-white dark:bg-neutral-800 border border-purple-300 dark:border-purple-600 rounded-lg outline-none focus:border-purple-500" />
                        </td>
                        <td class="p-2 border-r border-neutral-200 dark:border-neutral-700 bg-orange-50/20 dark:bg-orange-900/10">
                          <input type="number" v-model.number="statObj.manager" class="w-full px-1 py-1.5 text-center bg-white dark:bg-neutral-800 border border-orange-300 dark:border-orange-600 rounded-lg outline-none focus:border-orange-500" />
                        </td>
                        <td class="p-3 font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-900/5 text-lg">
                          {{ getStatTotal(statObj) }}
                        </td>
                      </tr>
                    </template>
                  </tbody>

                  <tfoot class="bg-neutral-100 dark:bg-neutral-700/50">
                    <tr>
                      <td colspan="6" class="p-2 text-center text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-200 dark:bg-neutral-800">
                        <span class="text-indigo-600 dark:text-indigo-400">📊 OVR(종합 파워)는 모든 8개 스탯의 최종합입니다.</span>
                      </td>
                    </tr>

                    <tr>
                      <td class="p-4 border-r border-neutral-200 dark:border-neutral-700 font-extrabold text-neutral-900 dark:text-neutral-100 uppercase tracking-widest text-base bg-blue-100/50 dark:bg-blue-900/20">
                        파워 (총합)
                      </td>
                      <td colspan="4" class="p-4 border-r border-neutral-200 dark:border-neutral-700 font-bold text-neutral-500 dark:text-neutral-400 text-sm text-left">
                        <div><span class="text-sky-600 font-bold">[그룹 A/B 합산]</span> 강화 +{{ totalPower.autoEnhanceFixed }} / 기본(A)+추가(B) +{{ totalPower.percentableGrowthBuffSum - totalPower.autoEnhanceFixed }} <span v-if="totalPower.totalPercentBonus > 0 || totalPower.synergyPercentBonus > 0" class="text-indigo-500">➔ ( 스킬 {{ totalPower.totalPercentBonus }}% / 시너지 {{ totalPower.synergyPercentBonus }}% 이중 분리 적용 완료 )</span></div>
                        <div class="mt-1 text-fuchsia-600 font-bold">[그룹 C 합산] 돌파 +{{ totalPower.autoBreakthroughFixed }} / 시너지 +{{ totalPower.autoSynergyFixed }} / 바인더,클랜 등 +{{ totalPower.unpercentableGrowthBuffSum }}</div>
                      </td>
                      <td class="p-4 font-black text-3xl text-indigo-700 dark:text-indigo-400 bg-indigo-100/50 dark:bg-indigo-900/20 tabular-nums">
                        {{ totalPower.finalSum }}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </section>

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
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>