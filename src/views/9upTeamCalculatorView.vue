<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch, defineComponent, h } from 'vue'
import Papa from 'papaparse'
import { Search, Calculator, Star, Shield, Zap, TrendingUp, X, Users, ArrowUpCircle, Sparkles, UserCheck } from 'lucide-vue-next'

/* =========================
   타입 및 인터페이스 정의
========================= */
type Raw = Record<string, any>
type CountOp = '==' | '>=' | '<=' | '>' | '<' | 'between'

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
  description?: string
  conditions: JsonCond[]
  group?: {
    family?: string
    tier?: number
    inherit_lower_tiers?: boolean
    stack_mode?: 'cumulative' | 'max' | 'cumulative_dedup'
  }
}

interface PlayerBuff {
  enhancementLevel: number
  breakthroughLevel: number
  careerTeamCount: number
  hitAceBuff: number
  teamPlayerDignityBuff: number
  imprintStarterPower: number
  careerAllStatFlat: number
  managerBuff: number
  selectedSkills: string[]
  battingOrder: number | null
}

const STAT_LABELS: Record<string, string> = {
  power: '파워', contact: '컨택', defense: '수비', running: '주루',
  control: '컨트', movement: '무브먼트', stuff: '스터프',
  longHitSuppression: '장타 억제', homeRunSuppression: '홈런 억제', runnerControl: '주자 견제'
}
const POSITION_ALIASES: Record<string, string> = {
  'b1': '1B', '1b': '1B', '1': '1B', '1루': '1B',
  'b2': '2B', '2b': '2B', '2': '2B', '2루': '2B',
  'b3': '3B', '3b': '3B', '3': '3B', '3루': '3B',
  'c': 'C', '포': 'C',
  'ss': 'SS', '유격': 'SS',
  'lf': 'LF', '좌익': 'LF',
  'cf': 'CF', '중견': 'CF',
  'rf': 'RF', '우익': 'RF',
  'sp': 'SP', '선발': 'SP',
  'rp': 'RP', '불펜': 'RP',
  'dh': 'DH', '지타': 'DH',
}
const CSV_SPLIT = /[,、;、]+/
const isInitialized = ref(false)

/* =========================
   상태 관리 (데이터, 라인업, 버프)
========================= */
const isLoading = ref(true)
const players = ref<Raw[]>([])
const synergys = ref<JsonSynergy[]>([])
const teamData = ref<any[]>([])

// 검색 관련
const searchQuery = ref('')
const selectedGrade = ref<string>('')
const filterGrades = ['DGN', 'TOP', 'GG', 'GGY', 'HIT', 'ACE', 'ROY', 'MMVP', 'TEA', 'POS', 'ASG', 'SEA']

// 라인업 상태
const lineupViewMode = ref('batter')
const selectedSlot = ref<string | null>(null) // 현재 우측 패널에서 설정 중인 슬롯
const lineup = ref({
  C: null, '1B': null, '2B': null, '3B': null, SS: null,
  LF: null, CF: null, RF: null, DH: null,
  SP1: null, SP2: null, SP3: null, SP4: null, SP5: null,
  RP1: null, RP2: null, RP3: null, RP4: null, RP5: null, RP6: null,
  BENCH1: null, BENCH2: null, BENCH3: null, BENCH4: null,
  BENCH5: null, BENCH6: null, BENCH7: null, BENCH8: null
} as Record<string, Raw | null>)

// 글로벌 버프 (팀 전체 적용)
const globalBuffs = reactive({
  playerLevel: 100,
  collectionBuff: 1200,
  teamLevelBuff: 750,
  careerLevelBuff: 149,
  binderBuff: 537,
  clanBuff: 15,
  ultimateImprintPercent: 0
})

// 선수별 개별 버프 상태 관리
const playerBuffs = ref<Record<string, PlayerBuff>>({})

// 슬롯 초기화 유틸
const initPlayerBuff = (slot: string, p: Raw) => {
  const grade = String(p.grade || '').toUpperCase()
  let colBuff = 0
  let hitAce = 0
  
  if (['SEA', 'ASG'].includes(grade)) colBuff = 800
  else if (['POS', 'TEA', 'MMVP', 'HIT', 'ACE'].includes(grade)) colBuff = 900
  else if (grade === 'GGY') colBuff = 900
  else if (grade === 'GG' || grade === 'ROY') colBuff = 1000
  else if (grade === 'TOP') colBuff = 1200
  
  if (['HIT', 'ACE', 'GG'].includes(grade)) hitAce = 896

  playerBuffs.value[slot] = {
    enhancementLevel: grade === 'DGN' ? 10 : 15,
    breakthroughLevel: 0,
    careerTeamCount: 0,
    hitAceBuff: hitAce,
    teamPlayerDignityBuff: 0,
    imprintStarterPower: 0,
    careerAllStatFlat: 0,
    managerBuff: 0,
    selectedSkills: [],
    battingOrder: null
  }
}

// 우측 탭 제어
const rightPanelTab = ref<'global' | 'player'>('global')

/* =========================
   시너지 및 스킬 로직
========================= */
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

// 스킬 조건부 활성화 확인
const isSkillActive = (skillName: string, slot: string, battingOrder: number | null) => {
  const s = slot.toUpperCase()
  
  // 투수 보직 스킬
  if (skillName === '에이스' || skillName === '원투펀치') return s === 'SP1' || s === 'SP2'
  if (skillName === '승리계투') return s === 'RP1' || s === 'RP2'
  if (skillName === '숏릴리프') return s === 'RP1' || s === 'RP2' || s === 'RP3'
  if (skillName === '셋업' || skillName === '셋업맨') return s === 'RP3'
  if (skillName === '클로저') return s === 'RP4'
  if (skillName === '롱맨') return s === 'RP5'
  if (skillName === '스토퍼' || skillName === '마무리') return s === 'RP6'
  
  // 타자 타순 및 보직 스킬
  if (skillName === '지명타자') return s === 'DH'
  if (skillName.endsWith('번') && skillName.length === 2) {
    const num = parseInt(skillName[0])
    return battingOrder === num
  }
  if (skillName === '테이블세터') return battingOrder === 1 || battingOrder === 2
  if (skillName === '클린업') return battingOrder === 3 || battingOrder === 4 || battingOrder === 5
  if (skillName === '하위타선') return battingOrder !== null && battingOrder >= 6 && battingOrder <= 9
  
  return true // 조건 없는 스킬은 상시 활성화
}

// 라인업에 배치된 전체 시너지 계산
const checkSynergyInclusion = (target: string, playerSynergies: string[]) => {
  const clean = (x:string)=>String(x??'').normalize('NFKC').replace(/​|‌|‍|⁠/g,'').replace(/[,\s클럽]/g,'').trim()
  const keyClean = clean(target)
  if (playerSynergies.some(s => clean(s) === keyClean)) return true

  const tm = keyClean.match(/^(\D*)(\d+)(\D*)$/)
  if (!tm) return playerSynergies.some(s => clean(s).includes(keyClean))

  const [,tp,tn,ts] = tm
  if (tn.length===4 || tp.includes('동명이인') || ts.includes('동명이인')) return false
  const tnum = parseInt(tn,10)

  return playerSynergies.some(s => {
    const sClean = clean(s)
    if (sClean.includes(keyClean)) return true
    const parts = sClean.split('-')
    for (const part of parts) {
      const sm = part.match(/^(\D*)(\d+)(\D*)$/)
      if (!sm) continue
      const [,pp,pn,ps] = sm
      if (pn.length===4 || pp.includes('동명이인') || ps.includes('동명이인')) continue
      if (pp===tp && ps===ts && parseInt(pn,10)>=tnum) return true
    }
    return false
  })
}

const compareCondition = (op: CountOp, lhs: number, rhs?: number, max?: number): boolean => {
  if (op==='==') return lhs === (rhs ?? 0)
  if (op=== '>=') return lhs >= (rhs ?? 0)
  if (op=== '<=') return lhs <= (rhs ?? 0)
  if (op===  '>') return lhs >  (rhs ?? 0)
  if (op===  '<') return lhs <  (rhs ?? 0)
  if (op==='between') return lhs >= (rhs ?? 0) && lhs <= (max ?? Number.POSITIVE_INFINITY)
  return false
}

// 전체 팀에 켜진 시너지 맵 (시너지이름 -> 부여되는 보너스 배열)
const activeTeamSynergies = computed(() => {
  const lineupPlayers = Object.values(lineup.value).filter(Boolean) as Raw[]
  const result = new Map<string, { stat: string, bonus: JsonBonus }[]>()
  
  for (const s of synergys.value) {
    const name = String(s.synergy).trim()
    const count = lineupPlayers.filter(p => checkSynergyInclusion(name, getArray(p.synergy))).length
    
    if (count > 0) {
       const all = (s.conditions||[]).map(c=>{
          const isBetween = c.count.op==='between'
          const upper = isBetween ? (c.count as any).max : (c.count as any).value
          return { raw:c, upper:Number(upper??0) }
       }).sort((a,b)=>a.upper-b.upper)
       
       const matched = all.filter(({raw})=>{
          const c:any = raw.count
          return c?.op==='between' ? compareCondition('between', count, c.min, c.max) : compareCondition(c?.op as CountOp, count, c?.value)
       })
       
       if (matched.length > 0) {
         // 가장 강력한 조건 1개만 적용
         const top = matched.slice().sort((a,b)=>(b.upper-a.upper)||((b.raw.bonus.value??0)-(a.raw.bonus.value??0)))[0].raw
         result.set(name, [{ stat: top.stat, bonus: top.bonus }])
       }
    }
  }
  return result
})

/* =========================
   계산 엔진
========================= */

const getArray = (str: any) => {
  if (!str) return []
  return String(str).split(',').map(s => s.trim()).filter(Boolean)
}

const getPlayerRarity = (p: Raw) => Math.max(0, parseInt(String(p.rarity), 10) || 0)

const getEnhanceMultiplier = (p: Raw) => {
  const grade = String(p.grade).toUpperCase()
  const map: Record<string, number> = {
    'SEA': 30, 'ASG': 30, 'POS': 40, 'TEA': 40, 'MMVP': 40,
    'ROY': 50, 'HIT': 50, 'ACE': 50, 'GG': 50, 'TOP': 50, 'GGY': 50, 'DGN': 300
  }
  return map[grade] || 0
}

const getBreakthroughFixed = (p: Raw, level: number) => {
  if (level === 0) return 0
  const grade = String(p.grade).toUpperCase()
  if (['SEA', 'ASG', 'POS'].includes(grade)) {
    const mults = [0, 1, 3, 6, 10, 15, 21, 28, 36]
    return 30 * (mults[level] || 0)
  } else if (['TEA', 'ROY', 'MMVP'].includes(grade)) {
    const mults = [0, 1, 3, 6, 10, 15, 21, 28, 36]
    return 50 * (mults[level] || 0)
  } else if (['HIT', 'ACE', 'GG', 'TOP', 'GGY'].includes(grade)) {
    const mults = [0, 1, 2.5, 4.5, 7, 10, 15, 21, 28] 
    return 100 * (mults[level] || 0)
  }
  return 0
}

// 개별 선수 파워 계산
const calculatePlayerPower = (p: Raw, slot: string) => {
  if (!p) return 0
  const buffs = playerBuffs.value[slot]
  if (!buffs) return 0

  const isPit = String(p.position || '').toUpperCase().includes('SP') || String(p.position || '').toUpperCase().includes('RP') || !!p.movement

  // 1. 기본 스탯 합
  let baseSum = 0
  const coreStats = isPit 
    ? ['movement', 'longHitSuppression', 'homeRunSuppression', 'control', 'stuff']
    : ['contact', 'gapPower', 'homeRunPower', 'plateDiscipline', 'strikeoutAvoidance']
  const nonCoreStats = isPit
    ? ['defense', 'pitchLimit', 'runnerControl']
    : ['stealing', 'baseRunning', 'defense']
    
  coreStats.forEach(s => baseSum += Number(p[s] || 0))
  nonCoreStats.forEach(s => baseSum += Number(p[s] || 0))

  // 2. 글로벌/개별 성장 버프
  const growthA = Number(Math.max(0, globalBuffs.playerLevel - 1) * 10) + globalBuffs.collectionBuff + globalBuffs.teamLevelBuff + globalBuffs.careerLevelBuff + (buffs.enhancementLevel * getEnhanceMultiplier(p))
  const flatC = globalBuffs.binderBuff + globalBuffs.clanBuff + buffs.imprintStarterPower + buffs.careerAllStatFlat + getBreakthroughFixed(p, buffs.breakthroughLevel)
  
  // 3. 시너지 및 스킬 확인
  let autoSynergyFixed = 0
  let autoSynergyPercent = 0
  let skillPowerPercent = 0
  let statSpecificSkillPercents: Record<string, number> = {}

  // 시너지 파악
  const pSyns = getArray(p.synergy)
  const getSynergyType = (statName: string) => {
    const pitStats = ['control','movement','stuff','longHitSuppression','homeRunSuppression','runnerControl']
    const batStats = ['power','contact','defense','running']
    if (pitStats.includes(statName)) return 'pitcher'
    if (batStats.includes(statName)) return 'batter'
    return 'both'
  }
  
  activeTeamSynergies.value.forEach((bonuses, synName) => {
    // 족보 처리 (자신이 가진 시너지가 켜져있거나, 상위 족보가 켜졌는지)
    let isActiveForMe = false
    const cleanNames = pSyns.map(x=>x.normalize('NFKC').replace(/​|‌|‍|⁠/g,'').replace(/[,\s클럽]/g,'').trim())
    
    // 단순화된 포함 검사
    const targetClean = synName.normalize('NFKC').replace(/​|‌|‍|⁠/g,'').replace(/[,\s클럽]/g,'').trim()
    if (cleanNames.some(cn => targetClean.includes(cn) || cn.includes(targetClean))) {
       isActiveForMe = true
    }

    if (isActiveForMe) {
      bonuses.forEach(b => {
        const type = getSynergyType(b.stat)
        if (isPit && type === 'batter') return
        if (!isPit && type === 'pitcher') return
        
        if (b.stat === 'power') {
          if (b.bonus.unit === 'fixed') autoSynergyFixed += b.bonus.value
          else if (b.bonus.unit === 'percent') autoSynergyPercent += b.bonus.value
        }
      })
    }
  })
  
  const growthB = (buffs.careerTeamCount * 112) + buffs.hitAceBuff + buffs.teamPlayerDignityBuff + autoSynergyFixed

  // 스킬 파악
  buffs.selectedSkills.forEach(s => {
    if (isSkillActive(s, slot, buffs.battingOrder)) {
       const eff = SKILL_EFFECTS[s]
       if (eff) {
         skillPowerPercent += eff.powerPercent || 0
         for (const [k, v] of Object.entries(eff.stats || {})) {
           statSpecificSkillPercents[k] = (statSpecificSkillPercents[k] || 0) + Number(v)
         }
       }
    }
  })

  const globalPercent = skillPowerPercent + autoSynergyPercent + globalBuffs.ultimateImprintPercent
  const globalPercentPool = coreStats.reduce((acc, s) => acc + Number(p[s]||0), 0) + nonCoreStats.reduce((acc, s) => acc + Number(p[s]||0), 0) + growthA
  const globalBonusTotal = globalPercentPool * (globalPercent / 100)

  // 4. 스탯별 최종 연산
  let finalTotal = 0

  // 코어 스탯 5개
  coreStats.forEach(s => {
    const base = Number(p[s] || 0)
    let preSpec = base + (growthA/5) + (growthB/5) + (globalBonusTotal/5)
    let specBonus = preSpec * ((statSpecificSkillPercents[s] || 0) / 100)
    finalTotal += (preSpec + specBonus + (flatC/5) + buffs.managerBuff)
  })
  
  // 넌코어 스탯 3개
  nonCoreStats.forEach(s => {
    let base = Number(p[s] || 0)
    if (statSpecificSkillPercents[s]) {
      base += base * (statSpecificSkillPercents[s] / 100)
    }
    finalTotal += (base + buffs.managerBuff)
  })

  return Math.round(finalTotal)
}

const teamTotalPower = computed(() => {
  let sum = 0
  Object.keys(lineup.value).forEach(slot => {
    const p = lineup.value[slot]
    if (p) sum += calculatePlayerPower(p, slot)
  })
  return sum
})

/* =========================
   유틸 함수 (기타)
========================= */
const toLowerCase = (s: unknown): string => String(s ?? '').toLowerCase().trim()
const normalizeText = (text: unknown): string => String(text ?? '').normalize('NFKC').replace(/​|‌|‍|⁠/g, '').replace(/\s+/g, ' ').trim().toLowerCase()

const searchOptions = computed(() => {
  const o: Record<string, Set<string>> = { team: new Set(), position: new Set(), grade: new Set() }
  for (const p of players.value) {
    getArray(p.team).forEach(v => o.team.add(v))
    getArray(p.position).forEach(v => o.position.add(v))
    if (p.grade) o.grade.add(String(p.grade))
  }
  return {
    team: [...o.team].sort(),
    position: [...o.position].sort(),
    grade: [...o.grade].sort((a, b) => {
      const gradeOrder = ['SS', 'S', 'A', 'B', 'C', 'D']
      return gradeOrder.indexOf(a) - gradeOrder.indexOf(b)
    })
  }
})

const filteredPlayers = computed(() => {
  const tokens = searchQuery.value ? searchQuery.value.split(/[,\s]+/).map(t=>t.trim()).filter(Boolean).map(normalizeText) : []
  return players.value.filter(p => {
    if (selectedGrade.value && String(p.grade).toUpperCase() !== selectedGrade.value) return false
    if (tokens.length) {
      const hay = new Set<string>([normalizeText(p.name), ...getArray(p.team).map(toLowerCase), ...getArray(p.position).map(toLowerCase), ...getArray(p.year)])
      if (!tokens.some(t => hay.has(t) || normalizeText(p.name).includes(t))) return false
    }
    return true
  }).slice(0, 50)
})

const assignPlayerToSlot = (slot: string, p: Raw) => {
  Object.keys(lineup.value).forEach(k => { if (lineup.value[k]?.id === p.id) lineup.value[k] = null })
  lineup.value[slot] = p
  initPlayerBuff(slot, p)
  selectedSlot.value = slot
  rightPanelTab.value = 'player'
}

const clearSlot = (slot: string) => {
  lineup.value[slot] = null
  if (selectedSlot.value === slot) selectedSlot.value = null
}

const selectSlot = (slot: string) => {
  if (lineup.value[slot]) {
    selectedSlot.value = slot
    rightPanelTab.value = 'player'
  }
}

// 초기화
onMounted(async () => {
  try {
    const response = await fetch('/DB/player_sorted.csv', { cache: 'no-store' })
    const csvText = await response.text()
    const result: Raw[] = []
    Papa.parse(csvText, { header: true, skipEmptyLines: true, complete: ({ data }) => (data as Raw[]).forEach(row => result.push(row)) })
    players.value = result
    
    const synRes = await fetch('/DB/synergys.json', { cache: 'no-store' })
    if (synRes.ok) {
      const synJson = await synRes.json()
      synergys.value = (Array.isArray(synJson) ? synJson : []).filter((it: any) => Array.isArray(it?.conditions) && it.conditions.length > 0)
    }
  } catch (e) {
    console.error(e)
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="bg-neutral-50 dark:bg-neutral-900 h-screen overflow-hidden transition-colors flex flex-col font-sans">
    
    <!-- 헤더 영역 -->
    <header class="bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-md flex-shrink-0 z-20">
      <div class="mx-auto max-w-[1800px] px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <Calculator class="w-6 h-6 text-blue-200" />
          <h1 class="text-xl font-bold tracking-tight">9UP 팀 파워 시뮬레이터</h1>
        </div>
        <div class="flex items-center bg-black/20 rounded-xl px-5 py-2 border border-white/10 shadow-inner">
          <span class="text-blue-200 text-sm font-semibold mr-3">우리 팀 종합 파워</span>
          <span class="text-3xl font-black text-amber-300 tabular-nums tracking-tight">{{ teamTotalPower.toLocaleString() }}</span>
        </div>
      </div>
    </header>

    <div class="mx-auto max-w-[1800px] w-full p-3 lg:p-4 flex-1 flex flex-col min-h-0">
      <div v-if="isLoading" class="flex h-full items-center justify-center">
        <div class="animate-spin rounded-full border-4 border-neutral-300 dark:border-neutral-600 border-t-blue-600 h-10 w-10"></div>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
        
        <!-- 왼쪽: 선수 검색 -->
        <section class="lg:col-span-3 flex flex-col rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 min-h-0 shadow-sm overflow-hidden">
          <div class="p-4 border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50">
            <div class="relative mb-3">
              <input v-model.trim="searchQuery" type="text" placeholder="이름, 팀, 연도 검색..." class="w-full pl-9 pr-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors" />
              <Search class="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <button v-if="searchQuery" @click="searchQuery = ''" class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400"><X class="w-3 h-3"/></button>
            </div>
            <div class="grid grid-cols-6 gap-1">
              <button @click="selectedGrade = ''" :class="selectedGrade === '' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600 text-neutral-500'" class="col-span-2 rounded-md text-[11px] font-bold border transition-colors h-8">ALL</button>
              <button v-for="grade in ['DGN','TOP','GG','HIT','ACE','ROY']" :key="grade" @click="selectedGrade = selectedGrade === grade ? '' : grade" :class="selectedGrade === grade ? 'border-blue-500 bg-blue-50' : 'border-neutral-200 bg-white'" class="rounded-md border p-1 h-8 flex justify-center items-center">
                <img :src="`/assets/logos/grade/${grade}.png`" class="h-full object-contain" />
              </button>
            </div>
          </div>
          
          <div class="flex-1 overflow-y-auto p-2 custom-scrollbar">
            <div v-if="filteredPlayers.length === 0" class="text-center py-10 text-neutral-400 text-sm">검색 결과가 없습니다.</div>
            <div v-for="p in filteredPlayers" :key="p.id" class="mb-2 p-2 rounded-xl border border-neutral-100 dark:border-neutral-700 hover:border-blue-300 bg-white dark:bg-neutral-800 transition-colors">
              <div class="flex items-center gap-3 mb-2">
                <img :src="`/assets/logos/grade/${p.grade}.png`" class="w-8 h-8 object-contain" />
                <div class="flex-1 min-w-0">
                  <div class="font-bold text-sm text-neutral-900 dark:text-neutral-100 truncate">{{ p.name }}</div>
                  <div class="text-[11px] text-neutral-500">{{ p.team }} · {{ p.year }}</div>
                </div>
              </div>
              <div class="flex flex-wrap gap-1 mt-2">
                <button v-for="pos in Array.from(new Set(getArray(p.position).map(normalizePosition)))" :key="pos" @click="assignPlayerToSlot(pos, p)" class="px-2 py-1 bg-neutral-100 dark:bg-neutral-700 hover:bg-blue-100 text-neutral-700 dark:text-neutral-300 text-[10px] rounded border border-neutral-200 dark:border-neutral-600 transition-colors">{{ pos }}</button>
                <button v-if="!String(p.position).toUpperCase().includes('P')" @click="assignPlayerToSlot('DH', p)" class="px-2 py-1 bg-neutral-100 dark:bg-neutral-700 hover:bg-blue-100 text-[10px] rounded border border-neutral-200 dark:border-neutral-600 transition-colors">DH</button>
              </div>
            </div>
          </div>
        </section>

        <!-- 중앙: 라인업 보드 -->
        <section class="lg:col-span-5 flex flex-col rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 min-h-0 shadow-sm overflow-hidden relative">
          <div class="flex items-center bg-neutral-100 dark:bg-neutral-700/50 p-1 border-b border-neutral-200 dark:border-neutral-700 flex-shrink-0">
            <button @click="lineupViewMode = 'batter'" :class="lineupViewMode === 'batter' ? 'bg-white dark:bg-neutral-600 shadow-sm font-bold text-blue-600' : 'text-neutral-500'" class="flex-1 py-2 text-xs rounded-lg transition-all">타자 라인업</button>
            <button @click="lineupViewMode = 'pitcher'" :class="lineupViewMode === 'pitcher' ? 'bg-white dark:bg-neutral-600 shadow-sm font-bold text-blue-600' : 'text-neutral-500'" class="flex-1 py-2 text-xs rounded-lg transition-all">투수 라인업</button>
            <button @click="lineupViewMode = 'bench'" :class="lineupViewMode === 'bench' ? 'bg-white dark:bg-neutral-600 shadow-sm font-bold text-blue-600' : 'text-neutral-500'" class="flex-1 py-2 text-xs rounded-lg transition-all">벤치</button>
          </div>

          <div class="flex-1 overflow-y-auto p-4 custom-scrollbar bg-neutral-50/30 dark:bg-neutral-900/30">
            <!-- 타자 다이아몬드 UI (간략화) -->
            <div v-if="lineupViewMode === 'batter'" class="h-full flex flex-col justify-center items-center">
               <div class="grid grid-cols-3 gap-4 w-full max-w-lg mb-8">
                 <div v-for="pos in ['LF', 'CF', 'RF']" :key="pos">
                   <PlayerCard :pos="pos" :p="lineup[pos]" :buffs="playerBuffs[pos]" :is-selected="selectedSlot === pos" @click="selectSlot(pos)" @clear="clearSlot(pos)" />
                 </div>
               </div>
               <div class="grid grid-cols-4 gap-4 w-full max-w-2xl mb-8">
                 <div v-for="pos in ['3B', 'SS', '2B', '1B']" :key="pos">
                   <PlayerCard :pos="pos" :p="lineup[pos]" :buffs="playerBuffs[pos]" :is-selected="selectedSlot === pos" @click="selectSlot(pos)" @clear="clearSlot(pos)" />
                 </div>
               </div>
               <div class="grid grid-cols-2 gap-16 w-full max-w-md">
                 <div v-for="pos in ['C', 'DH']" :key="pos">
                   <PlayerCard :pos="pos" :p="lineup[pos]" :buffs="playerBuffs[pos]" :is-selected="selectedSlot === pos" @click="selectSlot(pos)" @clear="clearSlot(pos)" />
                 </div>
               </div>
            </div>

            <!-- 투수 UI -->
            <div v-else-if="lineupViewMode === 'pitcher'" class="space-y-8">
              <div>
                <h3 class="text-xs font-bold text-neutral-500 mb-3 ml-1">선발 투수</h3>
                <div class="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  <div v-for="i in 5" :key="'SP'+i">
                     <PlayerCard :pos="'SP'+i" :p="lineup['SP'+i]" :buffs="playerBuffs['SP'+i]" :is-selected="selectedSlot === 'SP'+i" @click="selectSlot('SP'+i)" @clear="clearSlot('SP'+i)" />
                  </div>
                </div>
              </div>
              <div>
                <h3 class="text-xs font-bold text-neutral-500 mb-3 ml-1">계투 및 마무리</h3>
                <div class="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  <div v-for="i in 6" :key="'RP'+i">
                     <PlayerCard :pos="'RP'+i" :p="lineup['RP'+i]" :buffs="playerBuffs['RP'+i]" :is-selected="selectedSlot === 'RP'+i" @click="selectSlot('RP'+i)" @clear="clearSlot('RP'+i)" />
                  </div>
                </div>
              </div>
            </div>

            <!-- 벤치 UI -->
            <div v-else class="space-y-4">
               <h3 class="text-xs font-bold text-neutral-500 mb-3 ml-1">벤치 멤버</h3>
               <div class="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  <div v-for="i in 8" :key="'BENCH'+i">
                     <PlayerCard :pos="'BENCH'+i" :p="lineup['BENCH'+i]" :buffs="playerBuffs['BENCH'+i]" :is-selected="selectedSlot === 'BENCH'+i" @click="selectSlot('BENCH'+i)" @clear="clearSlot('BENCH'+i)" />
                  </div>
               </div>
            </div>
          </div>
        </section>

        <!-- 오른쪽: 설정 패널 -->
        <section class="lg:col-span-4 flex flex-col rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 min-h-0 shadow-sm overflow-hidden">
          <div class="flex items-center bg-neutral-100 dark:bg-neutral-700/50 p-1 border-b border-neutral-200 dark:border-neutral-700 flex-shrink-0">
            <button @click="rightPanelTab = 'global'" :class="rightPanelTab === 'global' ? 'bg-white shadow-sm font-bold text-indigo-600' : 'text-neutral-500'" class="flex-1 py-2 text-xs rounded-lg transition-all flex items-center justify-center gap-1"><Users class="w-3 h-3"/> 글로벌 버프 (공통)</button>
            <button @click="rightPanelTab = 'player'" :class="rightPanelTab === 'player' ? 'bg-white shadow-sm font-bold text-indigo-600' : 'text-neutral-500'" class="flex-1 py-2 text-xs rounded-lg transition-all flex items-center justify-center gap-1"><UserCheck class="w-3 h-3"/> 선수 개인 설정</button>
          </div>

          <div class="flex-1 overflow-y-auto p-5 custom-scrollbar">
            
            <!-- 글로벌 탭 -->
            <div v-if="rightPanelTab === 'global'" class="space-y-5 animate-in fade-in">
              <div class="bg-sky-50 dark:bg-sky-900/10 p-4 rounded-xl border border-sky-100 dark:border-sky-800">
                <h3 class="text-sm font-bold text-sky-800 dark:text-sky-300 mb-3 flex items-center gap-1"><TrendingUp class="w-4 h-4"/> 성장 버프 (전원 적용)</h3>
                <div class="grid grid-cols-2 gap-3">
                  <div class="flex flex-col gap-1"><label class="text-[10px] font-bold text-neutral-500">선수 레벨</label><input type="number" v-model.number="globalBuffs.playerLevel" class="input-styled"/></div>
                  <div class="flex flex-col gap-1"><label class="text-[10px] font-bold text-neutral-500">팀 레벨 파워</label><input type="number" v-model.number="globalBuffs.teamLevelBuff" class="input-styled"/></div>
                  <div class="flex flex-col gap-1"><label class="text-[10px] font-bold text-neutral-500">도감 파워</label><input type="number" v-model.number="globalBuffs.collectionBuff" class="input-styled"/></div>
                  <div class="flex flex-col gap-1"><label class="text-[10px] font-bold text-neutral-500">커리어 레벨 파워</label><input type="number" v-model.number="globalBuffs.careerLevelBuff" class="input-styled"/></div>
                </div>
              </div>
              <div class="bg-fuchsia-50 dark:bg-fuchsia-900/10 p-4 rounded-xl border border-fuchsia-100 dark:border-fuchsia-800">
                <h3 class="text-sm font-bold text-fuchsia-800 dark:text-fuchsia-300 mb-3 flex items-center gap-1"><Sparkles class="w-4 h-4"/> 특수 깡파워 (전원 적용)</h3>
                <div class="grid grid-cols-2 gap-3">
                  <div class="flex flex-col gap-1"><label class="text-[10px] font-bold text-neutral-500">바인더 파워</label><input type="number" v-model.number="globalBuffs.binderBuff" class="input-styled"/></div>
                  <div class="flex flex-col gap-1"><label class="text-[10px] font-bold text-neutral-500">클랜 레벨 파워</label><input type="number" v-model.number="globalBuffs.clanBuff" class="input-styled"/></div>
                </div>
              </div>
              <div class="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                <h3 class="text-sm font-bold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-1"><Zap class="w-4 h-4"/> 얼티밋 각인</h3>
                <div class="flex flex-col gap-1"><label class="text-[10px] font-bold text-neutral-500">전체 스탯 % 증가</label><input type="number" v-model.number="globalBuffs.ultimateImprintPercent" class="input-styled"/></div>
              </div>
            </div>

            <!-- 플레이어 탭 -->
            <div v-else-if="selectedSlot && lineup[selectedSlot] && playerBuffs[selectedSlot]" class="space-y-5 animate-in fade-in">
              <div class="flex items-center gap-3 p-3 bg-neutral-100 dark:bg-neutral-700/50 rounded-xl">
                <img :src="`/assets/logos/grade/${lineup[selectedSlot]!.grade}.png`" class="w-10 h-10 object-contain drop-shadow" />
                <div>
                  <div class="font-bold text-sm text-neutral-900 dark:text-neutral-100">{{ lineup[selectedSlot]!.name }}</div>
                  <div class="text-[11px] text-neutral-500">{{ selectedSlot }} 슬롯 배치됨</div>
                </div>
                <div class="ml-auto text-right">
                  <div class="text-[10px] font-bold text-indigo-500">개별 파워</div>
                  <div class="text-xl font-black tabular-nums text-indigo-600 dark:text-indigo-400">{{ calculatePlayerPower(lineup[selectedSlot]!, selectedSlot).toLocaleString() }}</div>
                </div>
              </div>

              <!-- 타순 설정 (타자일 경우만) -->
              <div v-if="!String(lineup[selectedSlot]!.position).toUpperCase().includes('P') && !lineup[selectedSlot]!.movement" class="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-xl border border-orange-100">
                <h3 class="text-sm font-bold text-orange-800 dark:text-orange-300 mb-2">타순 설정</h3>
                <select v-model.number="playerBuffs[selectedSlot].battingOrder" class="w-full p-2 rounded-lg border border-orange-200 bg-white text-sm outline-none focus:border-orange-500">
                  <option :value="null">타순 미지정</option>
                  <option v-for="i in 9" :key="i" :value="i">{{ i }}번 타자</option>
                </select>
                <p class="text-[10px] text-orange-600 mt-1">※ 타순 스킬(테이블세터, 클린업 등) 발동 조건에 사용됩니다.</p>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div class="flex flex-col gap-1">
                  <label class="text-[10px] font-bold text-neutral-500">강화 단계</label>
                  <select v-model.number="playerBuffs[selectedSlot].enhancementLevel" class="input-styled">
                    <option v-for="i in 16" :key="i" :value="i-1">+{{ i-1 }}</option>
                  </select>
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-[10px] font-bold text-neutral-500">한계 돌파</label>
                  <select v-model.number="playerBuffs[selectedSlot].breakthroughLevel" class="input-styled">
                    <option v-for="i in 10" :key="i" :value="i-1">{{ i-1 === 0 ? '미돌파' : (i-1) + '돌파' }}</option>
                  </select>
                </div>
              </div>

              <div class="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-800">
                <h3 class="text-sm font-bold text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-1"><Zap class="w-4 h-4"/> 개별 추가 스탯</h3>
                <div class="grid grid-cols-2 gap-3">
                  <div class="flex flex-col gap-1"><label class="text-[10px] font-bold text-neutral-500">커리어 (자팀수)</label><input type="number" v-model.number="playerBuffs[selectedSlot].careerTeamCount" class="input-styled"/></div>
                  <div class="flex flex-col gap-1"><label class="text-[10px] font-bold text-neutral-500">팀플+디그니티 합</label><input type="number" v-model.number="playerBuffs[selectedSlot].teamPlayerDignityBuff" class="input-styled"/></div>
                  <div class="flex flex-col gap-1"><label class="text-[10px] font-bold text-neutral-500">특수 각인 파워</label><input type="number" v-model.number="playerBuffs[selectedSlot].imprintStarterPower" class="input-styled"/></div>
                  <div class="flex flex-col gap-1"><label class="text-[10px] font-bold text-neutral-500">감독 깡스탯 합</label><input type="number" v-model.number="playerBuffs[selectedSlot].managerBuff" class="input-styled"/></div>
                </div>
              </div>

              <!-- 스킬 설정 -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <h3 class="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1"><Star class="w-4 h-4 text-amber-400"/> 스킬 장착</h3>
                  <span class="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold">{{ playerBuffs[selectedSlot].selectedSkills.length }} / {{ Math.min(3, Math.max(1, parseInt(String(lineup[selectedSlot]!.rarity||1))-1)) }}</span>
                </div>
                <div class="flex flex-wrap gap-1.5">
                  <button 
                    v-for="sk in Array.from(new Set([...getArray(lineup[selectedSlot]!.skill), ...getArray(lineup[selectedSlot]!.enhancedSkill)].filter(s=>!['야전사령관', '인사이드 워크', '투수 리드', '친화력', '도루 저지'].includes(s))))" 
                    :key="sk"
                    @click="() => {
                      const arr = playerBuffs[selectedSlot!].selectedSkills;
                      const max = Math.min(3, Math.max(1, parseInt(String(lineup[selectedSlot!]!.rarity||1))-1));
                      if (arr.includes(sk)) arr.splice(arr.indexOf(sk), 1);
                      else if (arr.length < max) arr.push(sk);
                    }"
                    :class="[
                      playerBuffs[selectedSlot].selectedSkills.includes(sk) ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white border-neutral-200 text-neutral-600',
                      playerBuffs[selectedSlot].selectedSkills.includes(sk) && !isSkillActive(sk, selectedSlot, playerBuffs[selectedSlot].battingOrder) ? '!bg-red-500 !border-red-600' : ''
                    ]"
                    class="px-2 py-1 text-[11px] font-bold border rounded-lg transition-colors relative"
                  >
                    {{ sk }}
                    <span v-if="playerBuffs[selectedSlot].selectedSkills.includes(sk) && !isSkillActive(sk, selectedSlot, playerBuffs[selectedSlot].battingOrder)" class="absolute -top-2 -right-2 bg-white text-red-500 border border-red-500 text-[8px] px-1 rounded-full shadow-sm whitespace-nowrap z-10">조건불일치</span>
                  </button>
                </div>
              </div>

            </div>
            <div v-else class="flex h-full items-center justify-center text-neutral-400 text-sm flex-col gap-2">
              <UserCheck class="w-10 h-10 opacity-20"/>
              중앙 라인업에서 선수를 클릭해주세요.
            </div>
          </div>
        </section>

      </div>
    </div>
  </div>
</template>

<script lang="ts">
// PlayerCard Component inside the same file
const PlayerCard = defineComponent({
  name: 'PlayerCard',
  props: { pos: String, p: Object, buffs: Object, isSelected: Boolean },
  emits: ['click', 'clear'],
  setup(props, { emit }) {
    return () => {
      if (!props.p) {
        return h('div', { 
          class: 'h-[100px] border border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl flex flex-col items-center justify-center bg-neutral-50/50 dark:bg-neutral-800/30 text-neutral-400 cursor-pointer hover:bg-neutral-100',
          onClick: () => emit('click')
        }, [
          h('span', { class: 'text-[10px] font-bold' }, props.pos)
        ])
      }
      
      return h('div', { 
        class: [
          'relative h-[100px] border rounded-xl flex flex-col items-center p-2 cursor-pointer transition-all shadow-sm group',
          props.isSelected ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-200' : 'border-neutral-200 bg-white hover:border-indigo-300'
        ],
        onClick: () => emit('click')
      }, [
        h('div', { class: 'absolute top-1 left-2 text-[9px] font-black text-neutral-400' }, props.pos),
        h('button', { 
          class: 'absolute top-1 right-1 w-4 h-4 rounded-full bg-neutral-100 text-neutral-400 hover:bg-red-500 hover:text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity',
          onClick: (e:Event) => { e.stopPropagation(); emit('clear') }
        }, '×'),
        
        h('img', { src: `/assets/logos/grade/${props.p.grade}.png`, class: 'w-8 h-8 object-contain mt-1 drop-shadow-sm' }),
        h('div', { class: 'text-xs font-bold text-neutral-800 mt-1 truncate w-full text-center' }, props.p.name),
        
        // Batting order badge if batter
        props.buffs?.battingOrder && (!String(props.p.position).toUpperCase().includes('P') && !props.p.movement) 
          ? h('div', { class: 'absolute bottom-1 left-2 text-[9px] font-bold bg-orange-100 text-orange-600 px-1 rounded' }, `${props.buffs.battingOrder}번`)
          : null,
          
        h('div', { class: 'absolute bottom-1 right-2 text-[11px] font-black text-indigo-600' }, 
          // @ts-ignore - The parent component calculates this, we just cheat by accessing parent context or we should pass the calculated power as a prop.
          // Since it's hard to pass dynamic calculated power inside the loop easily without restructuring, we will just display a placeholder or use the global calculation if available.
          '설정➔'
        )
      ])
    }
  }
})
</script>

<style scoped>
.input-styled {
  @apply w-full px-2 py-1.5 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-semibold outline-none focus:border-indigo-500 transition-colors shadow-sm;
}
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 4px; }
::-webkit-scrollbar { display: none; }
</style>
