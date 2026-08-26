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
const imprintStarterPower = ref(0)
const careerAllStatFlat = ref(0) 

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
         Number(clanBuff.value || 0) +
         Number(imprintStarterPower.value || 0) +
         Number(careerAllStatFlat.value || 0)
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


const normalSkillData = ref<any[]>([])
const enhancedSkillData = ref<any[]>([])

const STAT_LABELS: Record<string, string> = {
  contact: '컨택트', gapPower: '갭파워', homeRunPower: '홈런파워', plateDiscipline: '선구', strikeoutAvoidance: '삼진회피',
  stealing: '도루', baseRunning: '주루', defense: '수비',
  movement: '무브먼트', longHitSup: '장타억제', hrSup: '홈런억제', control: '컨트롤', stuff: '스터프',
  runnerCtrl: '주자견제', pitchLimit: '한계투구'
};

const matchSkillInfo = (skill: string) => {
  return normalSkillData.value.find((s) => s.skill === skill)?.image || ''
}

const getNormalSkillDescription = (skillName: string) => {
  const data = normalSkillData.value.find(s => s.skill === skillName);
  
  const effectText = data?.effects || data?.effect;
  if (effectText) {
    if (Array.isArray(effectText)) {
       return effectText.map(e => e.startsWith('-') ? e : `- ${e}`).join('\n');
    }
    return String(effectText).replace(/\\n/g, '\n');
  }
  
  const eff = SKILL_EFFECTS[skillName];
  if (eff) {
    const parts = [];
    if (eff.powerPercent) parts.push(`- 파워 +${eff.powerPercent}%`);
    for (const [k, v] of Object.entries(eff.stats || {})) {
      parts.push(`- ${STAT_LABELS[k] || k} +${v}`);
    }
    if (parts.length > 0) return parts.join('\n');
  }
  return '- 특수 조건 발동 스킬';
}

const tooltipState = reactive({
  show: false,
  skill: '',
  x: 0,
  y: 0,
  transform: 'translate(-50%, -100%)',
  arrowLeft: '50%'
});

const showSkillTooltip = (e: MouseEvent, sk: string) => {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  let x = rect.left + rect.width / 2;
  let y = rect.top;
  let transform = 'translate(-50%, -100%)';
  let arrowLeft = '50%';

  if (x < 130) {
    transform = 'translate(-20%, -100%)';
    arrowLeft = '20%';
  } else if (window.innerWidth - x < 130) {
    transform = 'translate(-80%, -100%)';
    arrowLeft = '80%';
  }

  tooltipState.skill = sk;
  tooltipState.x = x;
  tooltipState.y = y;
  tooltipState.transform = transform;
  tooltipState.arrowLeft = arrowLeft;
  tooltipState.show = true;
};

const hideSkillTooltip = () => {
  tooltipState.show = false;
};

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
  '통산 2000경기 클럽': ['통산 1500경기 클럽'],
  '통산 1500경기 클럽': [],
  '통산 700경기 클럽': ['통산 500경기 클럽'],
  '통산 500경기 클럽': [],
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
  
  // 투수/타자 시너지 구분 함수 (스탯 기준)
  const getSynergyType = (conditions: any[]) => {
    const pitStats = ['movement', 'longHitSuppression', 'homeRunSuppression', 'control', 'stuff', 'pitchLimit', 'runnerControl'];
    const batStats = ['contact', 'gapPower', 'homeRunPower', 'plateDiscipline', 'strikeoutAvoidance', 'stealing', 'baseRunning'];
    
    const isPit = conditions?.some(c => pitStats.includes(c.stat));
    const isBat = conditions?.some(c => batStats.includes(c.stat));
    
    if (isPit && !isBat) return 'pitcher';
    if (isBat && !isPit) return 'batter';
    return 'both';
  }

  return synergys.value.filter(s => {
    if (!finalSynNames.includes(s.synergy)) return false;
    
    // 현재 선택된 선수가 투수인지 타자인지에 따라 맞지 않는 시너지 완전히 차단
    const synType = getSynergyType(s.conditions);
    if (isPitcher.value && synType === 'batter') return false;
    if (!isPitcher.value && synType === 'pitcher') return false;
    
    return true;
  })
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
  if (cond.count.op === '<=') return `${cond.count.value}명 이하`
  if (cond.count.op === '==') return `${cond.count.value}명`
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
    const [csvRes, synRes, skillRes, enhRes] = await Promise.all([
      fetch('/DB/player_sorted.csv', { cache: 'no-store' }),
      fetch('/DB/synergys.json', { cache: 'no-store' }),
      fetch('/DB/normal_skill.json', { cache: 'no-store' }),
      fetch('/DB/enhanced_skill.json', { cache: 'no-store' })
    ])
    
    if (skillRes.ok) normalSkillData.value = await skillRes.json()
    if (enhRes.ok) enhancedSkillData.value = await enhRes.json()

    const csvText = await csvRes.text()
    const result: Raw[] = []
    Papa.parse(csvText, {
      header: true, skipEmptyLines: true,
      complete: ({ data }) => (data as Raw[]).forEach(row => result.push(row))
    })
    players.value = result
    
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
  imprintStarterPower.value = 0
  careerAllStatFlat.value = 0
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