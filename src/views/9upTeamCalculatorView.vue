<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch, defineComponent, h } from 'vue'
import Papa from 'papaparse'
import { Search, Calculator, Star, Shield, Zap, TrendingUp, X, Users, ArrowUpCircle, Sparkles, UserCheck, Filter, ChevronRight as ChevronRightIcon, Check } from 'lucide-vue-next'

type Raw = Record<string, any>
type CountOp = '==' | '>=' | '<=' | '>' | '<' | 'between'

interface JsonBonus { unit: 'percent' | 'fixed'; value: number }
interface JsonCond  { count: any; stat: string; bonus: JsonBonus }
interface JsonSynergy { id: number | string; synergy: string; conditions: JsonCond[] }
interface PlayerBuff {
  enhancementLevel: number; breakthroughLevel: number; careerTeamCount: number;
  hitAceBuff: number; teamPlayerDignityBuff: number; imprintStarterPower: number;
  careerAllStatFlat: number; managerBuff: number; selectedSkills: string[];
  battingOrder: number | null;
}

const POSITION_ALIASES: Record<string, string> = {
  'b1': '1B', '1b': '1B', '1': '1B', '1루': '1B',
  'b2': '2B', '2b': '2B', '2': '2B', '2루': '2B',
  'b3': '3B', '3b': '3B', '3': '3B', '3루': '3B',
  'c': 'C', '포': 'C', 'ss': 'SS', '유격': 'SS',
  'lf': 'LF', '좌익': 'LF', 'cf': 'CF', '중견': 'CF', 'rf': 'RF', '우익': 'RF',
  'sp': 'SP', '선발': 'SP', 'rp': 'RP', '불펜': 'RP', 'dh': 'DH', '지타': 'DH',
}

const isLoading = ref(true)
const players = ref<Raw[]>([])
const synergys = ref<JsonSynergy[]>([])
const teamData = ref<any[]>([])

const advancedFilterOpen = ref(false)
const currentPage = ref(1)
const pageSize = 50
const synergySearchText = ref('')
const synergyOptions = ref<string[]>([])

const searchQuery = reactive({
  search: '', position: [] as string[], team: [] as string[],
  synergy: [] as string[], rarity: null as number | null, grade: [] as string[]
})

const lineupViewMode = ref('batter')
const selectedSlot = ref<string | null>(null)
const lineup = ref({
  C: null, '1B': null, '2B': null, '3B': null, SS: null,
  LF: null, CF: null, RF: null, DH: null,
  SP1: null, SP2: null, SP3: null, SP4: null, SP5: null,
  RP1: null, RP2: null, RP3: null, RP4: null, RP5: null, RP6: null,
  BENCH1: null, BENCH2: null, BENCH3: null, BENCH4: null,
  BENCH5: null, BENCH6: null, BENCH7: null, BENCH8: null
} as Record<string, Raw | null>)

const globalBuffs = reactive({
  playerLevel: 100, collectionBuff: 1200, teamLevelBuff: 750,
  careerLevelBuff: 149, binderBuff: 537, clanBuff: 15, ultimateImprintPercent: 0
})

const playerBuffs = ref<Record<string, PlayerBuff>>({})

const initPlayerBuff = (slot: string, p: Raw) => {
  const grade = String(p.grade || '').toUpperCase()
  let colBuff = 0, hitAce = 0
  if (['SEA', 'ASG'].includes(grade)) colBuff = 800
  else if (['POS', 'TEA', 'MMVP', 'HIT', 'ACE'].includes(grade)) colBuff = 900
  else if (grade === 'GGY') colBuff = 900
  else if (grade === 'GG' || grade === 'ROY') colBuff = 1000
  else if (grade === 'TOP') colBuff = 1200
  if (['HIT', 'ACE', 'GG'].includes(grade)) hitAce = 896
  
  playerBuffs.value[slot] = {
    enhancementLevel: grade === 'DGN' ? 10 : 15, breakthroughLevel: 0,
    careerTeamCount: 0, hitAceBuff: hitAce, teamPlayerDignityBuff: 0,
    imprintStarterPower: 0, careerAllStatFlat: 0, managerBuff: 0,
    selectedSkills: [], battingOrder: null
  }
}

const rightPanelTab = ref<'global' | 'player'>('global')

const synergyHierarchy: Record<string, string[]> = {
  '190안타 클럽': ['180안타 클럽', '170안타 클럽'], '180안타 클럽': ['170안타 클럽'],
  '40홈런 클럽': ['30홈런 클럽'], '40도루 클럽': ['30도루 클럽'],
  '20승 클럽': ['15승 클럽'], '180탈삼진 클럽': ['150탈삼진 클럽'],
  '200이닝 클럽': ['180이닝 클럽'], '30세이브 클럽': ['20세이브 클럽'],
  '30홀드 클럽': ['20홀드 클럽'], '계투 80이닝 클럽': ['계투 70이닝 클럽'],
  '3-30-100-100 클럽': ['3-30-100 클럽', '100득점-100타점 클럽', '100타점 클럽', '30홈런 클럽'],
  '3-30-100 클럽': ['100타점 클럽', '30홈런 클럽'], '100득점-100타점 클럽': ['100타점 클럽'],
  '통산 2000경기 클럽': ['통산 1500경기 클럽'], '통산 1500경기 클럽': [],
  '통산 700경기 클럽': ['통산 500경기 클럽'], '통산 500경기 클럽': [],
  '통산 2000안타 클럽': ['통산 1500안타 클럽'], '통산 300도루 클럽': ['통산 200도루 클럽'],
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

const isSkillActive = (skillName: string, slot: string, battingOrder: number | null) => {
  const s = slot.toUpperCase()
  if (skillName === '에이스' || skillName === '원투펀치') return s === 'SP1' || s === 'SP2'
  if (skillName === '승리계투') return s === 'RP1' || s === 'RP2'
  if (skillName === '숏릴리프') return s === 'RP1' || s === 'RP2' || s === 'RP3'
  if (skillName === '셋업' || skillName === '셋업맨') return s === 'RP3'
  if (skillName === '클로저') return s === 'RP4'
  if (skillName === '롱맨') return s === 'RP5'
  if (skillName === '스토퍼' || skillName === '마무리') return s === 'RP6'
  if (skillName === '지명타자') return s === 'DH'
  if (skillName.endsWith('번') && skillName.length === 2) return battingOrder === parseInt(skillName[0])
  if (skillName === '테이블세터') return battingOrder === 1 || battingOrder === 2
  if (skillName === '클린업') return battingOrder === 3 || battingOrder === 4 || battingOrder === 5
  if (skillName === '하위타선') return battingOrder !== null && battingOrder >= 6 && battingOrder <= 9
  return true
}

const toLowerCase = (s: unknown): string => String(s ?? '').toLowerCase().trim()
const normalizeText = (text: unknown): string => String(text ?? '').normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
const getArray = (str: any) => String(str || '').split(',').map(s => s.trim()).filter(Boolean)
const toArray = (value: any): string[] => {
  if (Array.isArray(value)) return value.map(x => String(x).trim()).filter(Boolean)
  return String(value ?? '').split(/[,;]+/).map(x => x.replace(/^["']|["']$/g,'').trim()).filter(Boolean)
}

const normalizePosition = (position: any): string => {
  const str = String(position ?? '').trim()
  if (!str) return ''
  const lower = str.toLowerCase()
  return POSITION_ALIASES[lower] ?? str.toUpperCase()
}

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

interface PreparedPlayer { raw: Raw; nameNormalized: string; teamLowerCase: string[]; positionLowerCase: string[]; yearsNumeric: number[]; synergyNormalizedSet: Set<string>; }

const preparedPlayers = computed<PreparedPlayer[]>(() =>
    players.value.map(player => ({
      raw: player, nameNormalized: normalizeText(player.name),
      teamLowerCase: toArray(player.team).map(toLowerCase), positionLowerCase: toArray(player.position).map(toLowerCase),
      yearsNumeric: toArray(player.year).map((y:any)=>Number(y)).filter((y:any)=>!Number.isNaN(y)),
      synergyNormalizedSet: new Set(toArray(player.synergy).map(normalizeText))
    }))
)

const groupedTeams = [
  { id: ['ssg', 'sk'], name: 'SSG/SK' }, { id: ['kiwoom', 'nexen'], name: '키움/히어로즈' },
  { id: ['kia', 'haitai'], name: 'KIA/해태' }, { id: ['samsung'], name: '삼성' },
  { id: ['doosan', 'ob'], name: '두산/OB' }, { id: ['lotte'], name: '롯데' },
  { id: ['lg', 'mbc'], name: 'LG/MBC' }, { id: ['hanwha', 'binggrae'], name: '한화/빙그레' },
  { id: ['nc'], name: 'NC' }, { id: ['kt'], name: 'KT' },
  { id: ['hyundai', 'pacific', 'chungbo', 'sammi'], name: '현대/태평양/청보/삼미' }, { id: ['sbw'], name: '쌍방울' }
]

const toggleTeamGroup = (group: { id: string[], name: string }) => {
  if (isTeamGroupSelected(group)) searchQuery.team = searchQuery.team.filter(t => !group.id.includes(t))
  else {
    const newTeams = [...searchQuery.team]
    group.id.forEach(t => { if (!newTeams.includes(t)) newTeams.push(t) })
    searchQuery.team = newTeams
  }
}
const isTeamGroupSelected = (group: { id: string[], name: string }) => group.id.every(t => searchQuery.team.includes(t))
const findTeamLogo = (teamKey: string): string | null => {
  for (const team of teamData.value) {
    if (!team.history) continue
    for (const history of team.history) { if (history.key === teamKey) return history.logo }
  }
  return null
}
const findTeamName = (teamKeyOrName: string): string => {
  const key = String(teamKeyOrName ?? '')
  for (const team of teamData.value) {
    if (team.key === key) return team.name
    if (!team.history) continue
    for (const h of team.history) { if (h.key === key || h.name === key) return h.name }
  }
  return key
}
const getTeamLogoUrl = (teamKey: string): string => findTeamLogo(teamKey) ?? '/assets/logos/teams/unknown.png'

const filteredSynergyOptions = computed(() => {
  const query = normalizeText(synergySearchText.value)
  if (!query) return synergyOptions.value
  return synergyOptions.value.filter(s => normalizeText(s).includes(query))
})
const toggleSynergyFilter = (s: string) => {
  if (searchQuery.synergy.includes(s)) searchQuery.synergy = searchQuery.synergy.filter(x => x !== s)
  else searchQuery.synergy.push(s)
}

const filteredPlayers = computed(() => {
  const tokens = searchQuery.search ? searchQuery.search.split(/[\s,]+/).map(t=>t.trim()).filter(Boolean).map(normalizeText) : []
  return preparedPlayers.value.filter(({ raw: p, nameNormalized, teamLowerCase, positionLowerCase, yearsNumeric, synergyNormalizedSet }) => {
    if (searchQuery.team.length && !searchQuery.team.some(t => teamLowerCase.includes(toLowerCase(t)))) return false
    if (searchQuery.rarity != null && Number(p.rarity) !== Number(searchQuery.rarity)) return false
    if (searchQuery.grade.length && !searchQuery.grade.includes(String(p.grade || ''))) return false
    if (searchQuery.position.length && !searchQuery.position.some(v => positionLowerCase.includes(toLowerCase(v)))) return false
    if (searchQuery.synergy.length && !searchQuery.synergy.map(normalizeText).every(t => synergyNormalizedSet.has(t))) return false
    if (tokens.length) {
      const hay = new Set<string>([nameNormalized, ...teamLowerCase, ...positionLowerCase, ...Array.from(synergyNormalizedSet), ...yearsNumeric.map(String)])
      if (!tokens.some(t => hay.has(t) || nameNormalized.includes(t))) return false
    }
    return true
  }).map(pp => pp.raw)
})

const totalPlayers = computed(() => filteredPlayers.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalPlayers.value / pageSize)))
const paginatedPlayers = computed(() => filteredPlayers.value.slice((currentPage.value-1)*pageSize, (currentPage.value)*pageSize))
const goToPage = (page:number) => { if (page>=1 && page<=totalPages.value) currentPage.value = page }
watch(searchQuery, () => { currentPage.value = 1 }, { deep: true })
const resetFilters = () => { searchQuery.search=''; searchQuery.team=[]; searchQuery.position=[]; searchQuery.synergy=[]; searchQuery.rarity=null; searchQuery.grade=[] }

const checkSynergyInclusion = (target: string, playerSynergies: string[]) => {
  const clean = (x:string)=>String(x??'').normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/[,\s클럽]/g,'').trim()
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
         const top = matched.slice().sort((a,b)=>(b.upper-a.upper)||((b.raw.bonus.value??0)-(a.raw.bonus.value??0)))[0].raw
         result.set(name, [{ stat: top.stat, bonus: top.bonus }])
       }
    }
  }
  return result
})

const getEnhanceMultiplier = (p: Raw) => {
  const grade = String(p.grade).toUpperCase()
  const map: Record<string, number> = { 'SEA':30, 'ASG':30, 'POS':40, 'TEA':40, 'MMVP':40, 'ROY':50, 'HIT':50, 'ACE':50, 'GG':50, 'TOP':50, 'GGY':50, 'DGN':300 }
  return map[grade] || 0
}
const getBreakthroughFixed = (p: Raw, level: number) => {
  if (level === 0) return 0
  const grade = String(p.grade).toUpperCase()
  if (['SEA','ASG','POS'].includes(grade)) return 30 * ([0,1,3,6,10,15,21,28,36][level]||0)
  if (['TEA','ROY','MMVP'].includes(grade)) return 50 * ([0,1,3,6,10,15,21,28,36][level]||0)
  if (['HIT','ACE','GG','TOP','GGY'].includes(grade)) return 100 * ([0,1,2.5,4.5,7,10,15,21,28][level]||0)
  return 0
}

const calculatePlayerPower = (p: Raw, slot: string) => {
  if (!p) return 0
  const buffs = playerBuffs.value[slot]
  if (!buffs) return 0
  const isPit = String(p.position || '').toUpperCase().includes('SP') || String(p.position || '').toUpperCase().includes('RP') || !!p.movement
  let baseSum = 0
  const coreStats = isPit ? ['movement', 'longHitSuppression', 'homeRunSuppression', 'control', 'stuff'] : ['contact', 'gapPower', 'homeRunPower', 'plateDiscipline', 'strikeoutAvoidance']
  const nonCoreStats = isPit ? ['defense', 'pitchLimit', 'runnerControl'] : ['stealing', 'baseRunning', 'defense']
  coreStats.forEach(s => baseSum += Number(p[s] || 0))
  nonCoreStats.forEach(s => baseSum += Number(p[s] || 0))
  const growthA = Number(Math.max(0, globalBuffs.playerLevel - 1) * 10) + globalBuffs.collectionBuff + globalBuffs.teamLevelBuff + globalBuffs.careerLevelBuff + (buffs.enhancementLevel * getEnhanceMultiplier(p))
  const flatC = globalBuffs.binderBuff + globalBuffs.clanBuff + buffs.imprintStarterPower + buffs.careerAllStatFlat + getBreakthroughFixed(p, buffs.breakthroughLevel)
  let autoSynergyFixed = 0, autoSynergyPercent = 0, skillPowerPercent = 0, statSpecificSkillPercents: Record<string, number> = {}
  activeTeamSynergies.value.forEach((bonuses, synName) => {
    let isActiveForMe = false
    const cleanNames = getArray(p.synergy).map(x=>x.normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/[,\s클럽]/g,'').trim())
    const targetClean = synName.normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/[,\s클럽]/g,'').trim()
    if (cleanNames.some(cn => targetClean.includes(cn) || cn.includes(targetClean))) isActiveForMe = true
    if (isActiveForMe) {
      bonuses.forEach(b => {
         if (b.stat === 'power') {
          if (b.bonus.unit === 'fixed') autoSynergyFixed += b.bonus.value
          else if (b.bonus.unit === 'percent') autoSynergyPercent += b.bonus.value
        }
      })
    }
  })
  const growthB = (buffs.careerTeamCount * 112) + buffs.hitAceBuff + buffs.teamPlayerDignityBuff + autoSynergyFixed
  buffs.selectedSkills.forEach(s => {
    if (isSkillActive(s, slot, buffs.battingOrder)) {
       const eff = SKILL_EFFECTS[s]
       if (eff) {
         skillPowerPercent += eff.powerPercent || 0
         for (const [k, v] of Object.entries(eff.stats || {})) statSpecificSkillPercents[k] = (statSpecificSkillPercents[k] || 0) + Number(v)
       }
    }
  })
  const globalPercent = skillPowerPercent + autoSynergyPercent + globalBuffs.ultimateImprintPercent
  const globalPercentPool = coreStats.reduce((acc, s) => acc + Number(p[s]||0), 0) + nonCoreStats.reduce((acc, s) => acc + Number(p[s]||0), 0) + growthA
  const globalBonusTotal = globalPercentPool * (globalPercent / 100)
  let finalTotal = 0
  coreStats.forEach(s => {
    const base = Number(p[s] || 0)
    let preSpec = base + (growthA/5) + (growthB/5) + (globalBonusTotal/5)
    let specBonus = preSpec * ((statSpecificSkillPercents[s] || 0) / 100)
    finalTotal += (preSpec + specBonus + (flatC/5) + buffs.managerBuff)
  })
  nonCoreStats.forEach(s => {
    let base = Number(p[s] || 0)
    if (statSpecificSkillPercents[s]) base += base * (statSpecificSkillPercents[s] / 100)
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

const getAvailableSlot = (basePos: string): string => {
  if (selectedSlot.value && selectedSlot.value.startsWith(basePos)) {
    if (['SP', 'RP', 'BENCH'].includes(basePos)) return selectedSlot.value;
  }
  if (basePos === 'SP') {
    for (let i = 1; i <= 5; i++) if (!lineup.value[`SP${i}` as keyof typeof lineup.value]) return `SP${i}`
    return 'SP1'
  }
  if (basePos === 'RP') {
    for (let i = 1; i <= 6; i++) if (!lineup.value[`RP${i}` as keyof typeof lineup.value]) return `RP${i}`
    return 'RP1'
  }
  if (basePos === 'BENCH') {
    for (let i = 1; i <= 8; i++) if (!lineup.value[`BENCH${i}` as keyof typeof lineup.value]) return `BENCH${i}`
    return 'BENCH1'
  }
  return basePos
}

const assignPlayerToSlot = (posOrSlot: string, p: Raw) => {
  Object.keys(lineup.value).forEach(k => { if (lineup.value[k]?.id === p.id) lineup.value[k] = null })
  const targetSlot = getAvailableSlot(posOrSlot)
  lineup.value[targetSlot] = p
  initPlayerBuff(targetSlot, p)
  selectedSlot.value = targetSlot
  rightPanelTab.value = 'player'
}
const clearSlot = (slot: string) => { lineup.value[slot] = null; if (selectedSlot.value === slot) selectedSlot.value = null }
const selectSlot = (slot: string) => { if (lineup.value[slot]) { selectedSlot.value = slot; rightPanelTab.value = 'player' } }

const PlayerCard = defineComponent({
  name: 'PlayerCard',
  props: { pos: String, p: Object, buffs: Object, isSelected: Boolean },
  emits: ['click', 'clear'],
  setup(props, { emit }) {
    return () => {
      if (!props.p) {
        return h('div', { class: 'h-[100px] border border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl flex flex-col items-center justify-center bg-neutral-50/50 dark:bg-neutral-800/30 text-neutral-400 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700/50', onClick: () => emit('click') }, [h('span', { class: 'text-[10px] font-bold' }, props.pos)])
      }
      return h('div', { 
        class: ['relative h-[100px] border rounded-xl flex flex-col items-center p-2 cursor-pointer transition-all shadow-sm group', props.isSelected ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-200 dark:ring-indigo-800' : 'border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 hover:border-indigo-300 dark:hover:border-indigo-500'],
        onClick: () => emit('click')
      }, [
        h('div', { class: 'absolute top-1 left-2 text-[9px] font-black text-neutral-400 dark:text-neutral-500' }, props.pos),
        h('button', { class: 'absolute top-1 right-1 w-4 h-4 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 hover:bg-red-500 hover:text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity', onClick: (e:Event) => { e.stopPropagation(); emit('clear') } }, '×'),
        h('img', { src: `/assets/logos/grade/${props.p.grade}.png`, class: 'w-8 h-8 object-contain mt-1 drop-shadow-sm' }),
        h('div', { class: 'text-xs font-bold text-neutral-800 dark:text-neutral-200 mt-1 truncate w-full text-center' }, props.p.name),
        props.buffs?.battingOrder && (!String(props.p.position).toUpperCase().includes('P') && !props.p.movement) ? h('div', { class: 'absolute bottom-1 left-2 text-[9px] font-bold bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 px-1 rounded' }, `${props.buffs.battingOrder}번`) : null,
        h('div', { class: 'absolute bottom-1 right-2 text-[11px] font-black text-indigo-600 dark:text-indigo-400' }, '설정➔')
      ])
    }
  }
})

onMounted(async () => {
  try {
    const [csvRes, synRes, teamRes] = await Promise.all([
      fetch('/DB/player_sorted.csv', { cache: 'no-store' }), fetch('/DB/synergys.json', { cache: 'no-store' }), fetch('/DB/setting.json', { cache: 'no-store' })
    ])
    if (teamRes.ok) teamData.value = await teamRes.json()
    const text = await csvRes.text()
    Papa.parse(text, { header: true, skipEmptyLines: true, complete: ({ data }) => (players.value = data as Raw[]) })
    if (synRes.ok) {
        const synJson = await synRes.json()
        synergys.value = (Array.isArray(synJson) ? synJson : []).filter((it: any) => Array.isArray(it?.conditions) && it.conditions.length > 0)
        const options: string[] = Array.isArray(synJson) ? synJson.map((item: any) => (typeof item === 'string' ? item : item?.synergy)).filter(Boolean) : []
        synergyOptions.value = Array.from(new Set(options.map(s => String(s).trim()))).sort((a,b)=>a.localeCompare(b))
    }
  } catch(e) { console.error(e) } finally { isLoading.value = false }
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
          <header class="px-5 py-4 border-b border-neutral-100 dark:border-neutral-700 flex-shrink-0">
            <div class="flex items-center justify-between">
              <h1 class="text-base font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">선수 검색</h1>
              <div class="flex items-center gap-3">
                <span class="text-xs text-neutral-500 dark:text-neutral-400">{{ totalPlayers.toLocaleString() }}명</span>
              </div>
            </div>
          </header>

          <div class="border-b border-neutral-100 dark:border-neutral-700 p-4 flex-shrink-0">
            <div class="relative">
              <input
                  v-model.trim="searchQuery.search"
                  type="text"
                  placeholder="이름, 팀, 포지션, 시너지…"
                  class="w-full rounded-xl border border-neutral-200 dark:border-neutral-600 bg-neutral-50/60 dark:bg-neutral-700/60 px-3 py-1.5 text-sm text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-500 outline-none focus:border-neutral-300 dark:focus:border-neutral-500 focus:ring-0 transition-colors"
              />
              <Search class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
            </div>

            <button
                @click="advancedFilterOpen = !advancedFilterOpen"
                class="mt-2 inline-flex w-full items-center justify-between rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-600 transition-colors"
            >
              <span class="inline-flex items-center gap-2">
                <Filter class="h-4 w-4" />
                상세 필터
              </span>
              <span class="inline-flex items-center gap-2">
                <span class="rounded-full bg-neutral-100 dark:bg-neutral-600 px-2 py-0.5 text-[11px] text-neutral-700 dark:text-neutral-300">
                  {{ [searchQuery.position.length, searchQuery.team.length, searchQuery.synergy.length, searchQuery.grade.length, searchQuery.rarity ? 1 : 0].reduce((a,b)=>a+b,0) }}
                </span>
                <ChevronRightIcon :class="advancedFilterOpen ? 'rotate-90' : ''" class="h-4 w-4 transition-transform" />
              </span>
            </button>

            <div v-if="advancedFilterOpen" class="mt-2 space-y-3 max-h-[45vh] overflow-y-auto pr-2 pb-2 custom-scrollbar">
              <div>
                <label class="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">등급</label>
                <div class="grid grid-cols-6 gap-1">
                  <button
                      v-for="grade in searchOptions.grade"
                      :key="grade"
                      @click="searchQuery.grade.includes(grade) ? searchQuery.grade = searchQuery.grade.filter(g => g !== grade) : searchQuery.grade.push(grade)"
                      :class="searchQuery.grade.includes(grade) ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 shadow-sm' : 'border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 opacity-60 hover:opacity-100'"
                      class="py-1 px-0 flex items-center justify-center rounded-md border transition-all hover:bg-indigo-50 dark:hover:bg-indigo-800 overflow-hidden"
                  >
                    <img :src="`/assets/logos/grade/${grade}.png`" :alt="grade" class="w-full h-8 object-contain scale-[1.3]" @error="$event.target.style.display='none'" />
                  </button>
                </div>
              </div>

              <div>
                <label class="mb-2 block text-xs font-medium text-neutral-500 dark:text-neutral-400">포지션</label>
                <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
                  <button
                      v-for="pos in searchOptions.position"
                      :key="pos"
                      @click="searchQuery.position.includes(pos) ? searchQuery.position = searchQuery.position.filter(p => p !== pos) : searchQuery.position.push(pos)"
                      :class="searchQuery.position.includes(pos) ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 border-indigo-300 dark:border-indigo-600' : 'bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-600'"
                      class="px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-800"
                  >
                    {{ pos }}
                  </button>
                </div>
              </div>

              <div>
                <label class="mb-2 block text-xs font-medium text-neutral-500 dark:text-neutral-400">팀</label>
                <div class="grid grid-cols-4 gap-1.5">
                  <button
                      v-for="group in groupedTeams"
                      :key="group.name"
                      :title="group.name"
                      @click="toggleTeamGroup(group)"
                      :class="isTeamGroupSelected(group) ? 'bg-indigo-100 dark:bg-indigo-900 border-indigo-400 dark:border-indigo-500 shadow-sm' : 'bg-white dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600'"
                      class="p-1 flex items-center justify-center rounded-lg border transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-800"
                  >
                    <img v-if="getTeamLogoUrl(group.id[0])" :src="getTeamLogoUrl(group.id[0])" :alt="group.name" class="w-8 h-8 object-contain" @error="$event.target.style.display='none'" />
                  </button>
                </div>
              </div>

              <div>
                <label class="mb-2 block text-xs font-medium text-neutral-500 dark:text-neutral-400">시너지</label>
                <div class="flex flex-col gap-2">
                  <div class="flex flex-wrap gap-1" v-if="searchQuery.synergy.length > 0">
                    <span v-for="s in searchQuery.synergy" :key="s" class="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 rounded-md text-xs">
                      {{ s }}
                      <button @click="searchQuery.synergy = searchQuery.synergy.filter(x => x !== s)" class="hover:text-red-500 focus:outline-none"><X class="w-3 h-3"/></button>
                    </span>
                  </div>
                  <input 
                    v-model="synergySearchText" 
                    placeholder="시너지 검색" 
                    class="w-full rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 px-3 py-2 text-sm focus:border-neutral-300 dark:focus:border-neutral-500 focus:ring-0 transition-colors"
                  >
                  <div class="w-full border border-neutral-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 max-h-32 overflow-y-auto custom-scrollbar">
                    <div 
                      v-for="s in filteredSynergyOptions" 
                      :key="s" 
                      @click="toggleSynergyFilter(s)"
                      class="px-3 py-1.5 text-sm cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-600 flex items-center justify-between transition-colors"
                      :class="{'bg-indigo-50 dark:bg-indigo-900/30': searchQuery.synergy.includes(s)}"
                    >
                      <span :class="{'font-bold text-indigo-700 dark:text-indigo-300': searchQuery.synergy.includes(s)}">{{ s }}</span>
                      <Check v-if="searchQuery.synergy.includes(s)" class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-2 items-end gap-3">
                <div>
                  <label class="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">레어도</label>
                  <input v-model.number="searchQuery.rarity" type="number" min="0" max="6" class="w-full rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 px-3 py-2 text-sm focus:border-neutral-300 dark:focus:border-neutral-500 focus:ring-0 transition-colors">
                </div>
                <div class="text-right">
                  <button @click="resetFilters" class="inline-flex items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-600 transition-colors">
                    필터 초기화
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-700 px-4 py-3 text-xs text-neutral-500 dark:text-neutral-400 flex-shrink-0">
            <span>{{ currentPage }} / {{ totalPages }} 페이지</span>
            <div class="inline-flex gap-1">
              <button @click="goToPage(currentPage-1)" :disabled="currentPage<=1" class="rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 px-2 py-1 disabled:opacity-40 hover:bg-neutral-50 dark:hover:bg-neutral-600 transition-colors">이전</button>
              <button @click="goToPage(currentPage+1)" :disabled="currentPage>=totalPages" class="rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 px-2 py-1 disabled:opacity-40 hover:bg-neutral-50 dark:hover:bg-neutral-600 transition-colors">다음</button>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
            <div
                v-for="(player, i) in paginatedPlayers"
                :key="i"
                class="group border-b border-neutral-100 dark:border-neutral-700 px-2 py-2 lg:px-4 lg:py-2 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
            >
              <div class="flex items-start gap-4">
                <img :src="`/assets/logos/grade/${player.grade}.png`" :alt="player.grade" class="h-10 w-10 rounded-md object-contain ring-1 ring-neutral-200 dark:ring-neutral-600 flex-shrink-0" />
                <div class="min-w-0 flex-1">
                  <div class="mb-1 flex items-center gap-2">
                    <h3 class="truncate text-base font-semibold text-neutral-900 dark:text-neutral-100">{{ player.name }}</h3>
                    <div class="flex">
                      <Star v-for="k in Number(player.rarity)" :key="k" class="h-3 w-3 text-amber-400" fill="currentColor" />
                    </div>
                  </div>
                  <div class="mb-3 flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                    <img :src="getTeamLogoUrl(player.team)" :alt="player.team" class="h-4 w-4 flex-shrink-0" />
                    <span class="truncate">{{ findTeamName(player.team) }}</span>
                    <span>·</span>
                    <span>{{ player.year }}</span>
                  </div>
                  <div class="flex flex-wrap gap-1.5">
                    <button
                        v-for="pos in Array.from(new Set(getArray(player.position).map(normalizePosition))).filter(Boolean)"
                        :key="pos"
                        @click="assignPlayerToSlot(pos, player)"
                        class="rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 px-3 py-1 text-[11px] hover:bg-indigo-50 dark:hover:bg-indigo-900/40 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
                    >{{ pos }}</button>
                    <button
                        v-if="!String(player.position).toUpperCase().includes('P') && !player.movement"
                        @click="assignPlayerToSlot('DH', player)"
                        class="rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 px-3 py-1 text-[11px] hover:bg-indigo-50 dark:hover:bg-indigo-900/40 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
                    >DH</button>
                    <button
                        @click="assignPlayerToSlot('BENCH', player)"
                        class="rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 px-3 py-1 text-[11px] hover:bg-neutral-100 dark:hover:bg-neutral-600 transition-colors"
                    >벤치</button>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="!paginatedPlayers.length" class="flex h-40 items-center justify-center text-sm text-neutral-500 dark:text-neutral-400">
              검색 결과가 없습니다
              <button @click="resetFilters" class="ml-2 underline underline-offset-2 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors">필터 초기화</button>
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
                  <div class="flex flex-col gap-1"><label class="text-[10px] font-bold text-neutral-500">선수 레벨</label><input type="number" v-model.number="globalBuffs.playerLevel" class="w-full px-2 py-1.5 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-semibold outline-none focus:border-indigo-500 transition-colors shadow-sm"/></div>
                  <div class="flex flex-col gap-1"><label class="text-[10px] font-bold text-neutral-500">팀 레벨 파워</label><input type="number" v-model.number="globalBuffs.teamLevelBuff" class="w-full px-2 py-1.5 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-semibold outline-none focus:border-indigo-500 transition-colors shadow-sm"/></div>
                  <div class="flex flex-col gap-1"><label class="text-[10px] font-bold text-neutral-500">도감 파워</label><input type="number" v-model.number="globalBuffs.collectionBuff" class="w-full px-2 py-1.5 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-semibold outline-none focus:border-indigo-500 transition-colors shadow-sm"/></div>
                  <div class="flex flex-col gap-1"><label class="text-[10px] font-bold text-neutral-500">커리어 레벨 파워</label><input type="number" v-model.number="globalBuffs.careerLevelBuff" class="w-full px-2 py-1.5 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-semibold outline-none focus:border-indigo-500 transition-colors shadow-sm"/></div>
                </div>
              </div>
              <div class="bg-fuchsia-50 dark:bg-fuchsia-900/10 p-4 rounded-xl border border-fuchsia-100 dark:border-fuchsia-800">
                <h3 class="text-sm font-bold text-fuchsia-800 dark:text-fuchsia-300 mb-3 flex items-center gap-1"><Sparkles class="w-4 h-4"/> 특수 깡파워 (전원 적용)</h3>
                <div class="grid grid-cols-2 gap-3">
                  <div class="flex flex-col gap-1"><label class="text-[10px] font-bold text-neutral-500">바인더 파워</label><input type="number" v-model.number="globalBuffs.binderBuff" class="w-full px-2 py-1.5 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-semibold outline-none focus:border-indigo-500 transition-colors shadow-sm"/></div>
                  <div class="flex flex-col gap-1"><label class="text-[10px] font-bold text-neutral-500">클랜 레벨 파워</label><input type="number" v-model.number="globalBuffs.clanBuff" class="w-full px-2 py-1.5 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-semibold outline-none focus:border-indigo-500 transition-colors shadow-sm"/></div>
                </div>
              </div>
              <div class="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                <h3 class="text-sm font-bold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-1"><Zap class="w-4 h-4"/> 얼티밋 각인</h3>
                <div class="flex flex-col gap-1"><label class="text-[10px] font-bold text-neutral-500">전체 스탯 % 증가</label><input type="number" v-model.number="globalBuffs.ultimateImprintPercent" class="w-full px-2 py-1.5 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-semibold outline-none focus:border-indigo-500 transition-colors shadow-sm"/></div>
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
              <div v-if="!String(lineup[selectedSlot]!.position).toUpperCase().includes('P') && !lineup[selectedSlot]!.movement" class="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-xl border border-orange-100 dark:border-orange-900/20">
                <h3 class="text-sm font-bold text-orange-800 dark:text-orange-300 mb-2">타순 설정</h3>
                <select v-model.number="playerBuffs[selectedSlot].battingOrder" class="w-full p-2 rounded-lg border border-orange-200 dark:border-orange-800 bg-white dark:bg-neutral-800 text-sm outline-none focus:border-orange-500">
                  <option :value="null">타순 미지정</option>
                  <option v-for="i in 9" :key="i" :value="i">{{ i }}번 타자</option>
                </select>
                <p class="text-[10px] text-orange-600 dark:text-orange-400 mt-1">※ 타순 스킬(테이블세터, 클린업 등) 발동 조건에 사용됩니다.</p>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div class="flex flex-col gap-1">
                  <label class="text-[10px] font-bold text-neutral-500">강화 단계</label>
                  <select v-model.number="playerBuffs[selectedSlot].enhancementLevel" class="w-full px-2 py-1.5 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-semibold outline-none focus:border-indigo-500 transition-colors shadow-sm">
                    <option v-for="i in 16" :key="i" :value="i-1">+{{ i-1 }}</option>
                  </select>
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-[10px] font-bold text-neutral-500">한계 돌파</label>
                  <select v-model.number="playerBuffs[selectedSlot].breakthroughLevel" class="w-full px-2 py-1.5 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-semibold outline-none focus:border-indigo-500 transition-colors shadow-sm">
                    <option v-for="i in 10" :key="i" :value="i-1">{{ i-1 === 0 ? '미돌파' : (i-1) + '돌파' }}</option>
                  </select>
                </div>
              </div>

              <div class="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-800">
                <h3 class="text-sm font-bold text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-1"><Zap class="w-4 h-4"/> 개별 추가 스탯</h3>
                <div class="grid grid-cols-2 gap-3">
                  <div class="flex flex-col gap-1"><label class="text-[10px] font-bold text-neutral-500">커리어 (자팀수)</label><input type="number" v-model.number="playerBuffs[selectedSlot].careerTeamCount" class="w-full px-2 py-1.5 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-semibold outline-none focus:border-indigo-500 transition-colors shadow-sm"/></div>
                  <div class="flex flex-col gap-1"><label class="text-[10px] font-bold text-neutral-500">팀플+디그니티 합</label><input type="number" v-model.number="playerBuffs[selectedSlot].teamPlayerDignityBuff" class="w-full px-2 py-1.5 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-semibold outline-none focus:border-indigo-500 transition-colors shadow-sm"/></div>
                  <div class="flex flex-col gap-1"><label class="text-[10px] font-bold text-neutral-500">특수 각인 파워</label><input type="number" v-model.number="playerBuffs[selectedSlot].imprintStarterPower" class="w-full px-2 py-1.5 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-semibold outline-none focus:border-indigo-500 transition-colors shadow-sm"/></div>
                  <div class="flex flex-col gap-1"><label class="text-[10px] font-bold text-neutral-500">감독 깡스탯 합</label><input type="number" v-model.number="playerBuffs[selectedSlot].managerBuff" class="w-full px-2 py-1.5 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-semibold outline-none focus:border-indigo-500 transition-colors shadow-sm"/></div>
                </div>
              </div>

              <!-- 스킬 설정 -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <h3 class="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1"><Star class="w-4 h-4 text-amber-400"/> 스킬 장착</h3>
                  <span class="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 px-2 py-0.5 rounded font-bold">{{ playerBuffs[selectedSlot].selectedSkills.length }} / {{ Math.min(3, Math.max(1, parseInt(String(lineup[selectedSlot]!.rarity||1))-1)) }}</span>
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
                      playerBuffs[selectedSlot].selectedSkills.includes(sk) ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300',
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

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 4px; }
::-webkit-scrollbar { display: none; }
</style>