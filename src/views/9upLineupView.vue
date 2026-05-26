<script setup lang="ts">
import { ref, computed, onMounted, defineComponent, h, nextTick, watch, reactive } from 'vue'
import Papa from 'papaparse'
// 아이콘 추가: Save, FolderOpen, RotateCcw
import { Star, Search, Filter, ChevronLeft, ChevronRight, Users, ChevronRight as ChevronRightIcon, Moon, Sun, ChevronDown, ChevronUp, Menu, X, Save, FolderOpen, RotateCcw } from 'lucide-vue-next'
import SideModal from "@/components/SideModal.vue";
import PlayerDetail from "@/components/PlayerDetail.vue";

/* =========================
   타입 정의
========================= */
type Raw = Record<string, any>
type CountOp = '==' | '>=' | '<=' | '>' | '<' | 'between'

interface JsonBonus { unit: 'percent' | 'fixed'; value: number }
interface JsonCond  {
  count: (
      | { op: Exclude<CountOp,'between'>, value: number }
      | { op: 'between', min: number, max: number }
      ),
  stat: string
  bonus: JsonBonus
}
interface JsonSynergy {
  id: number | string
  synergy: string
  synergy_effect?: string
  description?: string
  stackable?: boolean
  conditions: JsonCond[]
  group?: {
    family?: string
    tier?: number
    inherit_lower_tiers?: boolean
    stack_mode?: 'cumulative' | 'max' | 'cumulative_dedup'
  }
}
interface PlayerRow { _id: string }
interface TeamHistory { key: string; name: string; logo: string }
interface TeamSetting { id: number|string; key: string; name: string; history: TeamHistory[] }

/* =========================
   상수
========================= */
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
const CSV_SPLIT = /[,\u3001;、]+/
const lineupViewMode = ref('batter')

// 로컬 스토리지 키
const LINEUP_STORAGE_KEY = '9up_lineup_save_data'

/* =========================
   다크모드 & UI 상태
========================= */
const expandedSynergies = ref<Set<string>>(new Set())
const showModal = ref(false)

const toggleSynergy = (synergyName: string) => {
  const newExpanded = new Set(expandedSynergies.value)
  if (newExpanded.has(synergyName)) {
    newExpanded.delete(synergyName)
  } else {
    newExpanded.add(synergyName)
  }
  expandedSynergies.value = newExpanded
}

const expandAllSynergies = () => {
  const allActive = activeSynergyList.value.map(s => s.name)
  expandedSynergies.value = new Set(allActive)
}

const collapseAllSynergies = () => {
  expandedSynergies.value = new Set()
}

/* =========================
   유틸
========================= */
const normalizeText = (text: unknown): string =>
    String(text ?? '')
        .normalize('NFKC')
        .replace(/\u200B|\u200C|\u200D|\u2060/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()

const toLowerCase = (s: unknown): string => String(s ?? '').toLowerCase().trim()

const toArray = (value: any, { allowComma = true }: { allowComma?: boolean } = {}): string[] => {
  if (Array.isArray(value)) return value.map(x => String(x).trim()).filter(Boolean)
  const str = String(value ?? '').trim()
  if (!str) return []
  if (str.startsWith('[') && str.endsWith(']')) {
    try {
      const parsed = JSON.parse(str)
      return Array.isArray(parsed) ? parsed.map(x => String(x).trim()).filter(Boolean) : []
    } catch {}
  }
  const splitter = allowComma ? CSV_SPLIT : /[\u3001;、;]+/
  return str.split(splitter).map(x => x.replace(/^["']|["']$/g,'').trim()).filter(Boolean)
}

const normalizePosition = (position: any): string => {
  const str = String(position ?? '').trim()
  if (!str) return ''
  const lower = str.toLowerCase()
  return POSITION_ALIASES[lower] ?? str.toUpperCase()
}

/* =========================
   반응형 상태
========================= */
const isLoading = ref(true)
const players = ref<Raw[]>([])
const synergys = ref<JsonSynergy[]>([])
const teamData = ref<TeamSetting[]>([])
const synergyOptions = ref<string[]>([])

const searchQuery = reactive({
  search: '',
  position: [] as string[],
  team: [] as string[],
  synergy: [] as string[],
  rarity: null as number | null,
  grade: [] as string[]
})

const advancedFilterOpen = ref(false)
const currentPage = ref(1)
const pageSize = 50

const lineup = ref({
  C: null, '1B': null, '2B': null, '3B': null, SS: null,
  LF: null, CF: null, RF: null, DH: null,
  SP1: null, SP2: null, SP3: null, SP4: null, SP5: null,
  RP1: null, RP2: null, RP3: null, RP4: null, RP5: null, RP6: null,
  BENCH1: null, BENCH2: null, BENCH3: null, BENCH4: null,
  BENCH5: null, BENCH6: null, BENCH7: null, BENCH8: null
} as Record<string, Raw | null>)

const synergyViewMode = ref('by-synergy')

/* =========================
   저장 / 불러오기 / 초기화 기능
========================= */

// 💾 라인업 저장
const saveLineup = () => {
  try {
    localStorage.setItem(LINEUP_STORAGE_KEY, JSON.stringify(lineup.value))
    alert('현재 라인업이 성공적으로 저장되었습니다! 💾')
  } catch (e) {
    console.error('저장 실패:', e)
    alert('저장에 실패했습니다.')
  }
}

// 📂 라인업 불러오기
const loadLineup = (isAuto = false) => {
  const savedData = localStorage.getItem(LINEUP_STORAGE_KEY)
  if (savedData) {
    try {
      lineup.value = JSON.parse(savedData)
      if (!isAuto) alert('저장된 라인업을 불러왔습니다! 📂')
    } catch (e) {
      console.error('불러오기 실패:', e)
    }
  } else if (!isAuto) {
    alert('저장된 라인업 내역이 없습니다.')
  }
}

// 🗑️ 라인업 초기화
const resetLineup = () => {
  if (confirm('현재 라인업의 모든 선수를 슬롯에서 제거하시겠습니까? (저장된 라인업은 삭제되지 않습니다)')) {
    Object.keys(lineup.value).forEach(slot => {
      lineup.value[slot] = null
    })
  }
}

/* =========================
   로딩
========================= */
const loadPlayerData = async () => {
  const response = await fetch('/DB/player_sorted.csv', { cache: 'no-store' })
  const csvText = await response.text()
  const result: Raw[] = []
  Papa.parse(csvText, {
    header: true, skipEmptyLines: true,
    complete: ({ data }) => (data as Raw[]).forEach(row => result.push(row))
  })
  players.value = result
  await nextTick()
  await loadSynergyOptions()
}

const loadSynergyData = async () => {
  const response = await fetch('/DB/synergys.json', { cache: 'no-store' })
  if (!response.ok) throw new Error(`Synergy load failed: ${response.status}`)
  const json = await response.json()
  synergys.value = (Array.isArray(json) ? json : [])
      .filter((it: any) => Array.isArray(it?.conditions) && it.conditions.length > 0)
      .map((it: any) => ({
        ...it,
        conditions: it.conditions.filter((c: any) => c && c.count && c.bonus)
      }))
}

const loadTeamData = async () => {
  const response = await fetch('/DB/setting.json', { cache: 'no-store' })
  if (!response.ok) throw new Error(`setting.json ${response.status}`)
  const json = await response.json()
  teamData.value = Array.isArray(json) ? (json as TeamSetting[]) : []
}

const loadSynergyOptions = async () => {
  try {
    const response = await fetch('/DB/synergys.json', { cache: 'no-store' })
    if (response.ok) {
      const json = await response.json()
      const options: string[] = Array.isArray(json)
          ? json.map((item: any) => (typeof item === 'string' ? item : item?.synergy)).filter(Boolean)
          : []
      synergyOptions.value = Array.from(new Set(options.map(s => String(s).trim()))).sort((a,b)=>a.localeCompare(b))
      return
    }
  } catch {}
  const tokens: string[] = []
  for (const p of players.value) toArray(p.synergy).forEach(t => tokens.push(String(t)))
  synergyOptions.value = Array.from(new Set(tokens.map(s => s.trim()))).sort((a,b)=>a.localeCompare(b))
}

/* =========================
   팀 유틸
========================= */
const findTeamLogo = (teamKey: string): string | null => {
  for (const team of teamData.value) {
    for (const history of team.history) {
      if (history.key === teamKey) return history.logo
    }
  }
  return null
}
const findTeamName = (teamKeyOrName: string): string => {
  const key = String(teamKeyOrName ?? '')
  for (const team of teamData.value) {
    if (team.key === key) return team.name
    for (const h of team.history) {
      if (h.key === key || h.name === key) return h.name
    }
  }
  return key
}
const getTeamLogoUrl = (teamKey: string): string => findTeamLogo(teamKey) ?? '/assets/logos/teams/unknown.png'

/* =========================
   전처리/검색
========================= */
interface PreparedPlayer {
  raw: Raw
  nameNormalized: string
  teamLowerCase: string[]
  positionLowerCase: string[]
  yearsNumeric: number[]
  synergyNormalizedSet: Set<string>
}
const preparedPlayers = computed<PreparedPlayer[]>(() =>
    players.value.map(player => ({
      raw: player,
      nameNormalized: normalizeText(player.name),
      teamLowerCase: toArray(player.team).map(toLowerCase),
      positionLowerCase: toArray(player.position).map(toLowerCase),
      yearsNumeric: toArray(player.year).map((y:any)=>Number(y)).filter((y:any)=>!Number.isNaN(y)),
      synergyNormalizedSet: new Set(toArray(player.synergy).map(normalizeText))
    }))
)

const searchOptions = computed(() => {
  const o: Record<string, Set<string>> = { team: new Set(), position: new Set(), grade: new Set() }
  for (const p of players.value) {
    toArray(p.team).forEach(v => o.team.add(v))
    toArray(p.position).forEach(v => o.position.add(v))
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
  const tokens = searchQuery.search
      ? searchQuery.search.split(/[,\s]+/).map(t=>t.trim()).filter(Boolean).map(normalizeText)
      : []
  return preparedPlayers.value
      .filter(({ raw: p, nameNormalized, teamLowerCase, positionLowerCase, yearsNumeric, synergyNormalizedSet }) => {
        // OR 검색: 하나라도 매치되면 통과
        if (searchQuery.team.length && !searchQuery.team.some(t => teamLowerCase.includes(toLowerCase(t)))) return false
        if (searchQuery.rarity != null && Number(p.rarity) !== Number(searchQuery.rarity)) return false
        if (searchQuery.grade.length && !searchQuery.grade.includes(String(p.grade || ''))) return false
        if (searchQuery.position.length && !searchQuery.position.some(v => positionLowerCase.includes(toLowerCase(v)))) return false
        if (searchQuery.synergy.length && !searchQuery.synergy.map(normalizeText).some(t => synergyNormalizedSet.has(t))) return false
        if (tokens.length) {
          const hay = new Set<string>([
            nameNormalized, ...teamLowerCase, ...positionLowerCase,
            ...Array.from(synergyNormalizedSet), ...yearsNumeric.map(String)
          ])
          const ok = tokens.some(t => hay.has(t) || nameNormalized.includes(t))
          if (!ok) return false
        }
        return true
      })
      .map(pp => ({ _id: String(pp.raw.id ?? `${pp.raw.name}-${pp.raw.team}-${pp.raw.year}`), ...pp.raw })) as (Raw & PlayerRow)[]
})

watch(searchQuery, () => { currentPage.value = 1 }, { deep: true })
const totalPlayers = computed(() => filteredPlayers.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalPlayers.value / pageSize)))
const paginatedPlayers = computed(() => filteredPlayers.value.slice((currentPage.value-1)*pageSize, (currentPage.value)*pageSize))
const goToPage = (page:number) => { if (page>=1 && page<=totalPages.value) currentPage.value = page }
const resetFilters = () => {
  searchQuery.search='';
  searchQuery.team=[];
  searchQuery.position=[];
  searchQuery.synergy=[];
  searchQuery.rarity=null;
  searchQuery.grade=[]
}

/* =========================
   라인업 관리
========================= */
const isPitcher = (p: Raw) => {
  const positions = toArray(p.position).map(normalizePosition)
  return positions.includes('SP') || positions.includes('RP')
}
const clearLineupSlot = (slot: string) => { lineup.value[slot] = null }

const assignPlayerToSlot = (slot: string, p: Raw) => {
  if (!slot || !p) return
  let posList: string[] = []
  try {
    const parsed = typeof p.position === 'string' ? JSON.parse(p.position) : p.position
    posList = (Array.isArray(parsed) ? parsed : toArray(p.position)).map(normalizePosition).filter(Boolean)
  } catch {
    posList = toArray(p.position).map(normalizePosition).filter(Boolean)
  }
  const s = normalizePosition(slot)

  // 중복 제거
  Object.keys(lineup.value).forEach(k => { if (lineup.value[k]?.id === p.id) lineup.value[k] = null })

  if (s === 'DH') {
    if (isPitcher(p)) return alert('DH에는 타자만 배치할 수 있습니다.')
    lineup.value['DH'] = p
  } else if (s === 'SP') {
    if (!posList.includes('SP')) return alert('선발 투수만 배치할 수 있습니다.')
    const spSlots = ['SP1','SP2','SP3','SP4','SP5'] as const
    const empty = spSlots.find(slot => !lineup.value[slot]); if (empty) lineup.value[empty] = p; else alert('모든 선발 슬롯이 가득 찼습니다.')
  } else if (s === 'RP') {
    if (!posList.includes('RP')) return alert('중계/마무리 투수만 배치할 수 있습니다.')
    const rpSlots = ['RP1','RP2','RP3','RP4','RP5','RP6'] as const
    const empty = rpSlots.find(slot => !lineup.value[slot]); if (empty) lineup.value[empty] = p; else alert('모든 중계 슬롯이 가득 찼습니다.')
  } else if (s.startsWith('SP')) {
    if (!posList.includes('SP')) return alert('선발 투수만 배치할 수 있습니다.')
    lineup.value[s] = p
  } else if (s.startsWith('RP')) {
    if (!posList.includes('RP')) return alert('중계/마무리 투수만 배치할 수 있습니다.')
    lineup.value[s] = p
  } else if (s.startsWith('BENCH')) {
    lineup.value[s] = p
  } else {
    if (!posList.includes(s)) return alert(`${s} 슬롯에 배치할 수 없습니다. (선수 포지션: ${posList.join(', ')})`)
    lineup.value[s] = p
  }
}

const autoAssignPlayer = (p: Raw) => {
  if (!p) return
  Object.keys(lineup.value).forEach(k => { if (lineup.value[k]?.id === p.id) lineup.value[k] = null })
  const posList = (() => {
    try {
      const parsed = typeof p.position === 'string' ? JSON.parse(p.position) : p.position
      return (Array.isArray(parsed) ? parsed : toArray(p.position)).map(normalizePosition).filter(Boolean)
    } catch { return toArray(p.position).map(normalizePosition).filter(Boolean) }
  })()
  const isPit = posList.includes('SP') || posList.includes('RP')
  if (!isPit) {
    const order = ['C','1B','2B','3B','SS','LF','CF','RF','DH'] as const
    for (const k of order) {
      if (k==='DH') { if (!lineup.value[k]) { lineup.value[k]=p; return } }
      else if (posList.includes(k)) { if (!lineup.value[k]) { lineup.value[k]=p; return } }
    }
    assignToBench(p)
  } else {
    const spOrder = ['SP1','SP2','SP3','SP4','SP5'] as const
    const rpOrder = ['RP1','RP2','RP3','RP4','RP5','RP6'] as const
    if (posList.includes('SP')) for (const k of spOrder) { if (!lineup.value[k]) { lineup.value[k]=p; return } }
    if (posList.includes('RP')) for (const k of rpOrder) { if (!lineup.value[k]) { lineup.value[k]=p; return } }
    assignToBench(p)
  }
}
const assignToBench = (p: Raw) => {
  if (!p) return
  Object.keys(lineup.value).forEach(k => { if (lineup.value[k]?.id === p.id) lineup.value[k] = null })
  const bench = ['BENCH1','BENCH2','BENCH3','BENCH4','BENCH5','BENCH6','BENCH7','BENCH8'] as const
  for (const k of bench) { if (!lineup.value[k]) { lineup.value[k]=p; return } }
  alert('모든 벤치 슬롯이 가득 찼습니다.')
}

/* =========================
   시너지 계산
========================= */
const compareCondition = (op: CountOp, lhs: number, rhs?: number, max?: number): boolean => {
  if (op==='==') return lhs === (rhs ?? 0)
  if (op=== '>=') return lhs >= (rhs ?? 0)
  if (op=== '<=') return lhs <= (rhs ?? 0)
  if (op===  '>') return lhs >  (rhs ?? 0)
  if (op===  '<') return lhs <  (rhs ?? 0)
  if (op==='between') return lhs >= (rhs ?? 0) && lhs <= (max ?? Number.POSITIVE_INFINITY)
  return false
}

const synergyMetadata = computed(() => {
  const m = new Map<string, { family?: string; tier?: number }>()
  for (const s of synergys.value) {
    const g = (s as any)?.group ?? {}
    const tier = Number.isFinite(Number(g.tier)) ? Number(g.tier) : undefined
    m.set(String(s.synergy).trim(), { family: g.family, tier })
  }
  return m
})

const checkSynergyInclusion = (target: string, playerSynergies: string[]) => {
  const meta = synergyMetadata.value
  const key = String(target ?? '').trim()
  const t = meta.get(key)
  // group 기준
  if (t?.family && typeof t.tier === 'number') {
    for (const ps of playerSynergies) {
      const pm = meta.get(String(ps).trim())
      if (pm?.family === t.family && typeof pm.tier === 'number' && pm.tier >= t.tier) return true
    }
  }
  // 텍스트 휴리스틱
  const clean = (x:string)=>String(x??'').normalize('NFKC').replace(/\u200B|\u200C|\u200D|\u2060/g,'').replace(/[,\s]/g,'').trim()
  if (playerSynergies.some(s => clean(s)===clean(key))) return true
  const tm = clean(key).match(/(\D*)(\d+)(\D*)/); if (!tm) return false
  const [,tp,tn,ts] = tm
  if (tn.length===4 || tp.includes('동명이인') || ts.includes('동명이인')) return false
  const tnum = parseInt(tn,10)
  return playerSynergies.some(s => {
    const sm = clean(s).match(/(\D*)(\d+)(\D*)/); if (!sm) return false
    const [,pp,pn,ps] = sm
    if (pn.length===4 || pp.includes('동명이인') || ps.includes('동명이인')) return false
    return pp===tp && ps===ts && parseInt(pn,10)>=tnum
  })
}

const synergyIndex = computed(() => {
  const index = new Map<string, {
    count: number
    activated: JsonCond[]
    conditionTexts: string[]
    topCondition?: JsonCond | null
    qualifiedPlayers: string[]
    nextCondition: { condition: JsonCond, required: number, text: string } | null
    synergy: JsonSynergy
  }>()
  const lineupPlayers = Object.values(lineup.value).filter(Boolean) as Raw[]

  for (const s of synergys.value) {
    const name = String(s.synergy).trim()
    const qualified = lineupPlayers.filter(p => checkSynergyInclusion(name, toArray(p.synergy).map(t=>t.trim())))
    const count = qualified.length

    const all = (s.conditions||[])
        .map(c=>{
          const isBetween = c.count.op==='between'
          const upper = isBetween ? (c.count as any).max : (c.count as any).value
          const lower = isBetween ? (c.count as any).min : (c.count as any).value
          const text  = isBetween ? `${lower}~${upper}명` : `${upper}명 이상`
          return { raw:c, upper:Number(upper??0), text }
        })
        .sort((a,b)=>a.upper-b.upper)

    const matched = all.filter(({raw})=>{
      const c:any = raw.count
      return c?.op==='between'
          ? compareCondition('between', count, c.min, c.max)
          : compareCondition(c?.op as CountOp, count, c?.value)
    })

    const activated = matched.map(m=>m.raw)
    const conditionTexts = matched.map(m=>m.text)
    const top = matched.length
        ? matched.slice().sort((a,b)=>(b.upper-a.upper)||((b.raw.bonus.value??0)-(a.raw.bonus.value??0)))[0].raw
        : null

    const bigger = all.find(c => count < c.upper) || null
    const nextCondition = bigger ? { condition: bigger.raw, required: bigger.upper, text: `${bigger.upper}명 필요` } : null

    index.set(name, {
      count,
      activated,
      conditionTexts,
      topCondition: top,
      qualifiedPlayers: qualified.map(p=>String(p.name||'')),
      nextCondition,
      synergy: s
    })
  }
  return index
})

const activeSynergyList = computed(() => {
  type Rec = {
    name: string
    count: number
    activeCondition: JsonCond | null
    conditionText?: string
    appliedPlayers: string[]
    synergy: JsonSynergy
    isInherited?: boolean
    impliedChildren?: Array<{name:string; count:number}>
  }

  const self: Rec[] = []
  for (const [name, rec] of synergyIndex.value.entries()) {
    if (!rec.activated.length) continue
    rec.activated.forEach((cond, i) => {
      self.push({
        name, count: rec.count, activeCondition: cond, conditionText: rec.conditionTexts[i],
        appliedPlayers: rec.qualifiedPlayers.slice(), synergy: rec.synergy, isInherited: false
      })
    })
  }

  // family grouping
  const families = new Map<string, JsonSynergy[]>()
  for (const s of synergys.value) {
    const fam = (s as any)?.group?.family
    if (!fam) continue
    if (!families.has(fam)) families.set(fam, [])
    families.get(fam)!.push(s)
  }
  for (const [, list] of families) list.sort((a,b)=>Number((b as any)?.group?.tier??0)-Number((a as any)?.group?.tier??0))

  const byFamily = new Map<string, Rec[]>()
  const noFamily: Rec[] = []
  for (const r of self) {
    const fam = (r.synergy as any)?.group?.family
    if (!fam) noFamily.push(r)
    else {
      if (!byFamily.has(fam)) byFamily.set(fam, [])
      byFamily.get(fam)!.push(r)
    }
  }

  const out: Rec[] = [...noFamily]
  for (const [fam, list] of byFamily.entries()) {
    const members = families.get(fam) || []
    const mode: 'cumulative'|'max'|'cumulative_dedup' = ((members[0] as any)?.group?.stack_mode) ?? 'cumulative'
    const inherit = !!(members[0] as any)?.group?.inherit_lower_tiers
    const sorted = list.slice().sort((a,b)=>Number((b.synergy as any)?.group?.tier??0)-Number((a.synergy as any)?.group?.tier??0))
    const awarded = new Set<string>()

    const pushByMode = (r: Rec) => {
      if (mode==='max') {
        if (!out.some(x => (x.synergy as any)?.group?.family===fam)) out.push({...r, appliedPlayers: r.appliedPlayers.slice()})
        return
      }
      if (mode==='cumulative') { out.push({...r, appliedPlayers: r.appliedPlayers.slice()}); return }
      // cumulative_dedup
      const uniq = r.appliedPlayers.filter(n=>!awarded.has(n))
      out.push({...r, appliedPlayers: uniq})
      uniq.forEach(n=>awarded.add(n))
    }

    sorted.forEach(pushByMode)

    if (inherit && sorted.length>0) {
      const activeNames = new Set(sorted.map(r=>r.name))
      const implied: Array<{name:string;count:number}> = []
      for (const m of members) {
        const nm = String(m.synergy).trim()
        if (activeNames.has(nm)) continue
        const rec = synergyIndex.value.get(nm)
        if (!rec) continue
        implied.push({ name: nm, count: rec.count })
      }
      // 마지막(최상위) 항목에 붙여서 표시
      if (out.length && implied.length) {
        const lastIdx = out.length-1
        out[lastIdx] = { ...out[lastIdx], impliedChildren: implied }
      }
    }
  }

  out.sort((a,b)=>{
    const av = a.activeCondition?.bonus.value ?? 0
    const bv = b.activeCondition?.bonus.value ?? 0
    if (!!a.isInherited !== !!b.isInherited) return a.isInherited ? 1 : -1
    return bv-av
  })
  return out
})

const inactiveSynergyList = computed(() => {
  const out: Array<{
    name: string
    count: number
    requiredCount: number
    remainingCount: number
    progress: number
    nextText: string
    nextEffectDescription: string
  }> = []
  for (const [name, rec] of synergyIndex.value.entries()) {
    if (rec.activated.length || !rec.nextCondition?.condition) continue
    const need = rec.nextCondition.required
    const left = Math.max(0, need - rec.count)
    const maxNeed = (rec.synergy.conditions||[]).reduce((m,c)=>{
      const b = c.count.op==='between'
      const u = b ? (c.count as any).max : (c.count as any).value
      return Math.max(m, Number(u ?? 0))
    }, need)
    const progress = Math.max(0, Math.min(100, Math.round((rec.count/Math.max(1,maxNeed))*100)))
    const stat = rec.nextCondition.condition.stat
    const bonus = rec.nextCondition.condition.bonus
    const title = `${STAT_LABELS[stat] || stat} +${bonus.value}${bonus.unit==='percent'?'%':''}`
    out.push({
      name, count: rec.count, requiredCount: need, remainingCount: left,
      progress, nextText: rec.nextCondition.text, nextEffectDescription: title
    })
  }
  return out.sort((a,b)=>a.remainingCount-b.remainingCount)
})

const getPlayerSynergyInfo = (player: Raw) => {
  if (!player?.synergy) return []
  const playerSynergies = toArray(player.synergy).map(s => s.trim())
  const info: Array<{name:string; isActive:boolean; effectText:string; count:number; description:string}> = []
  for (const nm of playerSynergies) {
    const rec = synergyIndex.value.get(nm)
    if (!rec) continue
    const isActive = rec.activated.length > 0
    const effectText = isActive && rec.topCondition
        ? `${STAT_LABELS[rec.topCondition.stat] || rec.topCondition.stat} +${rec.topCondition.bonus.value}${rec.topCondition.bonus.unit==='percent' ? '%' : ''}`
        : rec.nextCondition ? rec.nextCondition.text : '조건 없음'
    info.push({ name: nm, isActive, effectText, count: rec.count, description: rec.synergy.description || '' })
  }
  return info
}

const playerSynergyList = computed(() => {
  const lineupPlayers = Object.values(lineup.value).filter(Boolean) as Raw[]
  const playerList: Array<{
    playerName: string
    position: string
    activeSynergies: Array<{
      name: string
      description: string
      activeCondition: JsonCond
    }>
    inactiveSynergies: Array<{
      name: string
      remainingCount: number
      nextEffectDescription: string
    }>
  }> = []

  for (const player of lineupPlayers) {
    if (!player?.synergy) continue

    const playerSynergies = toArray(player.synergy).map(s => s.trim())
    const activeSynergies: Array<{name: string; description: string; activeCondition: JsonCond}> = []
    const inactiveSynergies: Array<{name: string; remainingCount: number; nextEffectDescription: string}> = []

    for (const synergyName of playerSynergies) {
      const rec = synergyIndex.value.get(synergyName)
      if (!rec) continue

      if (rec.activated.length > 0 && rec.topCondition) {
        // 활성 시너지
        activeSynergies.push({
          name: synergyName,
          description: rec.synergy.description || '',
          activeCondition: rec.topCondition
        })
      } else if (rec.nextCondition) {
        // 비활성 시너지 (조건 부족)
        const remainingCount = Math.max(0, rec.nextCondition.required - rec.count)
        const stat = rec.nextCondition.condition.stat
        const bonus = rec.nextCondition.condition.bonus
        const effectDescription = `${STAT_LABELS[stat] || stat} +${bonus.value}${bonus.unit==='percent'?'%':''}`

        inactiveSynergies.push({
          name: synergyName,
          remainingCount,
          nextEffectDescription: effectDescription
        })
      }
    }

    // 라인업에서 선수의 포지션 찾기
    let playerPosition = ''
    for (const [pos, p] of Object.entries(lineup.value)) {
      if (p && p.id === player.id) {
        playerPosition = pos
        break
      }
    }

    playerList.push({
      playerName: String(player.name || ''),
      position: playerPosition,
      activeSynergies,
      inactiveSynergies
    })
  }

  return playerList.sort((a, b) => {
    // 활성 시너지가 많은 순으로 정렬
    return b.activeSynergies.length - a.activeSynergies.length
  })
})

/* =========================
   라이프사이클
========================= */
onMounted(async () => {
  isLoading.value = true
  try {
    await Promise.all([loadPlayerData(), loadSynergyData(), loadTeamData()])
    // 마운트 시 저장된 라인업 자동 불러오기
    loadLineup(true)
  } catch (e) {
    console.error(e)
  } finally {
    isLoading.value = false
  }
})

/* =========================
   로컬 컴포넌트: LineupSlot
   (템플릿에서 <LineupSlot .../> 로 사용)
========================= */
const LineupSlot = defineComponent({
  name: 'LineupSlot',
  props: {
    pos: { type: String, required: true },
    p: { type: Object as () => Raw | null, default: null },
    getInfo: { type: Function as () => (p: Raw) => any[], required: true }
  },
  emits: ['clear'],
  setup(props, { emit }) {
    return () => {
      const rootCls =
          'group relative rounded-lg border transition-colors text-center ' +
          'border-neutral-200 bg-white hover:border-neutral-300 ' +
          'dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600'

      // 빈 슬롯
      if (!props.p) {
        return h('div', { class: `${rootCls} min-h-[120px] flex flex-col items-center justify-center` }, [
          h('div', { class: 'text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wide' }, props.pos),
          h('div', { class: 'text-xs text-neutral-300 dark:text-neutral-600 mt-1' }, '비어있음')
        ])
      }

      const p = props.p as Raw
      const infos = (props.getInfo(p) || []).filter((s: any) => s?.isActive)

      // 스탯별 보너스 합산 (percent/fixed)
      const statBonuses = new Map<
          string,
          { percent: number; fixed: number; details: Array<{ name: string; value: number; unit: 'percent' | 'fixed' }> }
      >()

      infos.forEach((info: any) => {
        const rec = synergyIndex.value?.get?.(info.name)
        const top = rec?.topCondition
        if (!top) return
        const stat: string = top.stat
        const unit: 'percent' | 'fixed' = top.bonus?.unit
        const bonus: number = top.bonus?.value ?? 0

        if (!statBonuses.has(stat)) {
          statBonuses.set(stat, { percent: 0, fixed: 0, details: [] })
        }
        const cur = statBonuses.get(stat)!
        if (unit === 'percent') cur.percent += bonus
        else cur.fixed += bonus
        cur.details.push({ name: info.name, value: bonus, unit })
      })

      // 공통 툴팁 렌더러
      const renderTooltip = (children: any[]) =>
          h(
              'div',
              {
                class:
                    'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg ' +
                    'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs ' +
                    'opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap'
              },
              [
                ...children,
                h('div', {
                  class:
                      'absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 ' +
                      'border-l-4 border-r-4 border-t-4 border-transparent ' +
                      'border-t-neutral-900 dark:border-t-neutral-100'
                })
              ]
          )

      return h('div', { class: `${rootCls} flex flex-col items-center p-3` }, [
        // 헤더 (포지션 + 등급)
        h(
            'div',
            { class: 'w-full flex items-center justify-between mb-3' },
            [
              h('div', { class: 'text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide' }, props.pos),
              h('img', {
                src: `/assets/logos/grade/${p.grade || 'C'}.png`,
                alt: p.grade || 'C',
                class: 'w-6 h-6 rounded object-contain'
              })
            ]
        ),

        // 선수 이름/팀/연도/레어도 (가운데 정렬)
        h('div', { class: 'mb-3 w-full flex flex-col items-center' }, [
          h('h3', { class: 'text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate mb-1 max-w-full' }, p.name),
          h(
              'div',
              { class: 'flex items-center justify-center text-xs text-neutral-500 dark:text-neutral-400 gap-2' },
              [
                p.rarity
                    ? h(
                        'div',
                        { class: 'flex ml-2 gap-1' },
                        Array.from({ length: Number(p.rarity) }, (_, i) =>
                            h('div', { key: i, class: 'w-2 h-2 bg-blue-500 rounded-full' })
                        )
                    )
                    : null
              ].filter(Boolean)
          )
        ]),

        // 스탯 합산 표시 (중앙 정렬 + hover 상세)
        statBonuses.size > 0
            ? h(
                'div',
                { class: 'w-full flex flex-col items-center gap-1' },
                Array.from(statBonuses.entries())
                    .map(([stat, bonuses]) => {
                      const hasPercent = bonuses.percent > 0
                      const hasFixed = bonuses.fixed > 0
                      if (!hasPercent && !hasFixed) return null
                      return h('div', { key: stat, class: 'relative group/tooltip' }, [
                        h(
                            'div',
                            { class: 'inline-flex items-center justify-between gap-2 py-1 px-2 rounded text-xs ' +
                                  'bg-neutral-50 dark:bg-neutral-700' },
                            [
                              h('div', { class: 'flex gap-2' }, [
                                hasFixed ? h('span', { class: 'font-semibold text-neutral-900 dark:text-neutral-100' }, `+${bonuses.fixed}`) : null,
                                hasPercent ? h('span', { class: 'font-semibold text-blue-600 dark:text-blue-400' }, `+${bonuses.percent}%`) : null,
                                !hasPercent && !hasFixed ? h('span', { class: 'font-semibold text-gray-400 dark:text-gray-500' }, `효과 없음`) : null,
                              ])
                            ]
                        ),
                        renderTooltip([
                          h(
                              'div',
                              { class: 'text-left space-y-1' },
                              bonuses.details.map((d, i) =>
                                  h('div', { key: i }, `${d.name}: +${d.value}${d.unit === 'percent' ? '%' : ''}`)
                              )
                          )
                        ])
                      ])
                    })
                    .filter(Boolean) as any[]
            )
            : null,

        // 제거 버튼 (우상단)
        h(
            'button',
            {
              class:
                  'absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded-full ' +
                  'bg-neutral-100 hover:bg-red-100 dark:bg-neutral-700 dark:hover:bg-red-900 ' +
                  'flex items-center justify-center text-neutral-400 hover:text-red-500 dark:text-neutral-500 dark:hover:text-red-400',
              onClick: () => emit('clear'),
              title: '제거'
            },
            [
              h('svg', { class: 'w-3 h-3', viewBox: '0 0 20 20', fill: 'currentColor' }, [
                h('path', {
                  'fill-rule': 'evenodd',
                  d:
                      'M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 ' +
                      '4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 ' +
                      '4.293 5.707a1 1 0 010-1.414z',
                  'clip-rule': 'evenodd'
                })
              ])
            ]
        )
      ])
    }
  }
})

</script>
<template>
  <div class="bg-neutral-50 dark:bg-neutral-900 min-h-screen transition-colors">
    <div class="mx-auto max-w-[1800px] px-4 py-6 h-screen flex flex-col">
      <div v-if="isLoading" class="flex h-full items-center justify-center">
        <div class="text-center">
          <div class="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-neutral-300 dark:border-neutral-600 border-t-neutral-900 dark:border-t-neutral-100"></div>
          <p class="text-sm text-neutral-500 dark:text-neutral-400">데이터를 불러오는 중…</p>
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        <section :class="[
          'lg:col-span-3 flex flex-col rounded-2xl bg-white dark:bg-neutral-800 ring-1 ring-neutral-200/70 dark:ring-neutral-700/70 min-h-0 transition-colors'
        ]">
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
                  class="w-full rounded-xl border border-neutral-200 dark:border-neutral-600 bg-neutral-50/60 dark:bg-neutral-700/60 px-4 py-2.5 text-sm text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-500 outline-none focus:border-neutral-300 dark:focus:border-neutral-500 focus:ring-0 transition-colors"
              />
              <Search class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
            </div>

            <button
                @click="advancedFilterOpen = !advancedFilterOpen"
                class="mt-3 inline-flex w-full items-center justify-between rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-600 transition-colors"
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

            <div v-if="advancedFilterOpen" class="mt-3 space-y-4">
              <div>
                <label class="mb-2 block text-xs font-medium text-neutral-500 dark:text-neutral-400">등급</label>
                <div class="flex flex-wrap gap-2">
                  <button
                      v-for="grade in searchOptions.grade"
                      :key="grade"
                      @click="searchQuery.grade.includes(grade) ? searchQuery.grade = searchQuery.grade.filter(g => g !== grade) : searchQuery.grade.push(grade)"
                      :class="searchQuery.grade.includes(grade) ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-600' : 'bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-600'"
                      class="px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors hover:bg-blue-50 dark:hover:bg-blue-800"
                  >
                    {{ grade }}
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
                      :class="searchQuery.position.includes(pos) ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-300 dark:border-green-600' : 'bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-600'"
                      class="px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors hover:bg-green-50 dark:hover:bg-green-800"
                  >
                    {{ pos }}
                  </button>
                </div>
              </div>

              <div>
                <label class="mb-2 block text-xs font-medium text-neutral-500 dark:text-neutral-400">팀</label>
                <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                  <button
                      v-for="team in searchOptions.team"
                      :key="team"
                      @click="searchQuery.team.includes(team) ? searchQuery.team = searchQuery.team.filter(t => t !== team) : searchQuery.team.push(team)"
                      :class="searchQuery.team.includes(team) ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-600' : 'bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-600'"
                      class="px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors hover:bg-purple-50 dark:hover:bg-purple-800 truncate"
                  >
                    {{ findTeamName(team) }}
                  </button>
                </div>
              </div>

              <div>
                <label class="mb-2 block text-xs font-medium text-neutral-500 dark:text-neutral-400">시너지</label>
                <select v-model="searchQuery.synergy" multiple class="h-24 w-full rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 px-2 py-2 text-sm focus:border-neutral-300 dark:focus:border-neutral-500 focus:ring-0 transition-colors">
                  <option v-for="s in synergyOptions" :key="s" :value="s">{{ s }}</option>
                </select>
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

          <div class="flex-1 overflow-y-auto min-h-0">
            <div
                v-for="(player, i) in paginatedPlayers"
                :key="i"
                @click="autoAssignPlayer(player)"
                class="group cursor-pointer border-b border-neutral-100 dark:border-neutral-700 px-4 py-4 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
            >
              <div class="flex items-start gap-4">
                <img :src="`/assets/logos/grade/${player.grade}.png`" :alt="player.grade" class="h-10 w-10 rounded-md object-contain ring-1 ring-neutral-200 dark:ring-neutral-600 flex-shrink-0" />
                <div class="min-w-0 flex-1">
                  <div class="mb-1 flex items-center gap-2">
                    <h3 class="truncate text-base font-semibold text-neutral-900 dark:text-neutral-100">{{ player.name }}</h3>
                    <div class="flex">
                      <Star v-for="k in Number(player.rarity)" :key="k" class="h-4 w-4 text-amber-400" fill="currentColor" />
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
                        v-for="pos in Array.from(new Set(toArray(player.position).map(normalizePosition))).filter(Boolean)"
                        :key="pos"
                        @click.stop="assignPlayerToSlot(pos, player)"
                        class="rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 px-3 py-1.5 text-xs hover:bg-neutral-50 dark:hover:bg-neutral-600 transition-colors"
                    >{{ pos }}</button>
                    <button
                        v-if="!isPitcher(player)"
                        @click.stop="assignPlayerToSlot('DH', player)"
                        class="rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 px-3 py-1.5 text-xs hover:bg-neutral-50 dark:hover:bg-neutral-600 transition-colors"
                    >DH</button>
                    <button
                        @click.stop="assignToBench(player)"
                        class="rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 px-3 py-1.5 text-xs hover:bg-neutral-50 dark:hover:bg-neutral-600 transition-colors"
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

        <section class="lg:col-span-6 flex flex-col rounded-2xl bg-white dark:bg-neutral-800 ring-1 ring-neutral-200/70 dark:ring-neutral-700/70 min-h-0 transition-colors">
          <header class="border-b border-neutral-100 dark:border-neutral-700 px-5 py-4 flex-shrink-0">
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-base font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">라인업</h2>
              
              <div class="flex items-center gap-2">
                <button 
                  @click="saveLineup" 
                  title="현재 라인업 저장"
                  class="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800/40 transition-colors border border-blue-100 dark:border-blue-800/50"
                >
                  <Save class="w-4 h-4" />
                </button>
                <button 
                  @click="loadLineup(false)" 
                  title="저장된 라인업 불러오기"
                  class="p-2 rounded-lg bg-neutral-50 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-600 transition-colors border border-neutral-200 dark:border-neutral-600"
                >
                  <FolderOpen class="w-4 h-4" />
                </button>
                <button 
                  @click="resetLineup" 
                  title="라인업 전체 초기화"
                  class="p-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-800/40 transition-colors border border-red-100 dark:border-red-800/50"
                >
                  <RotateCcw class="w-4 h-4" />
                </button>
                <span class="ml-2 text-xs text-neutral-500 dark:text-neutral-400">{{ Object.values(lineup).filter(Boolean).length }}/28</span>
              </div>
            </div>

            <div class="flex rounded-lg bg-neutral-100 dark:bg-neutral-700 p-1">
              <button
                  @click="lineupViewMode = 'batter'"
                  :class="lineupViewMode === 'batter' ? 'bg-white dark:bg-neutral-600 text-neutral-900 dark:text-neutral-100 shadow-sm' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'"
                  class="flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all"
              >
                타자
              </button>
              <button
                  @click="lineupViewMode = 'pitcher'"
                  :class="lineupViewMode === 'pitcher' ? 'bg-white dark:bg-neutral-600 text-neutral-900 dark:text-neutral-100 shadow-sm' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'"
                  class="flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all"
              >
                투수
              </button>
              <button
                  @click="lineupViewMode = 'bench'"
                  :class="lineupViewMode === 'bench' ? 'bg-white dark:bg-neutral-600 text-neutral-900 dark:text-neutral-100 shadow-sm' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'"
                  class="flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all"
              >
                벤치
              </button>
            </div>
          </header>

          <div class="flex-1 overflow-y-auto min-h-0 p-3 lg:p-5">
            <div v-if="lineupViewMode === 'batter'" class="space-y-12">
              <h3 class="mb-4 text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">타자</h3>
              <div class="pt-3">
                <div class="grid grid-cols-3 gap-3 lg:gap-6 mb-6 lg:mb-8">
                  <div class="w-24 lg:w-32 mx-auto">
                    <LineupSlot pos="LF" :p="lineup.LF" @clear="clearLineupSlot('LF')" :get-info="getPlayerSynergyInfo" />
                  </div>
                  <div class="w-24 lg:w-32 mx-auto">
                    <LineupSlot pos="CF" :p="lineup.CF" @clear="clearLineupSlot('CF')" :get-info="getPlayerSynergyInfo" />
                  </div>
                  <div class="w-24 lg:w-32 mx-auto">
                    <LineupSlot pos="RF" :p="lineup.RF" @clear="clearLineupSlot('RF')" :get-info="getPlayerSynergyInfo" />
                  </div>
                </div>
              </div>

              <div>
                <div class="relative" style="height: 400px;">
                  <div class="absolute top-0 transform -translate-x-1/2 w-20 lg:w-32" style="right: calc(24% - 50px);">
                    <LineupSlot pos="2B" :p="lineup['2B']" @clear="clearLineupSlot('2B')" :get-info="getPlayerSynergyInfo" />
                  </div>
                  <div class="absolute top-16 lg:top-24 left-2 lg:left-10 w-20 lg:w-32">
                    <LineupSlot pos="3B" :p="lineup['3B']" @clear="clearLineupSlot('3B')" :get-info="getPlayerSynergyInfo" />
                  </div>
                  <div class="absolute top-0 transform -translate-x-1/2 w-20 lg:w-32" style="left: calc(27% + 50px);">
                    <LineupSlot pos="SS" :p="lineup.SS" @clear="clearLineupSlot('SS')" :get-info="getPlayerSynergyInfo" />
                  </div>
                  <div class="absolute top-16 lg:top-24 right-2 lg:right-10 w-20 lg:w-32">
                    <LineupSlot pos="1B" :p="lineup['1B']" @clear="clearLineupSlot('1B')" :get-info="getPlayerSynergyInfo" />
                  </div>
                  <div class="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-20 lg:w-32" style="left: calc(50%);">
                    <LineupSlot pos="C" :p="lineup.C" @clear="clearLineupSlot('C')" :get-info="getPlayerSynergyInfo" />
                  </div>
                  <div class="absolute bottom-0 right-1/2 transform translate-x-1/2 w-20 lg:w-32" style="right: calc(25%);">
                    <LineupSlot pos="DH" :p="lineup.DH" @clear="clearLineupSlot('DH')" :get-info="getPlayerSynergyInfo" />
                  </div>
                </div>
              </div>
            </div>

            <div v-else-if="lineupViewMode === 'pitcher'" class="space-y-6 lg:space-y-8">
              <div>
                <h3 class="mb-4 text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">선발 투수</h3>
                <div class="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-6">
                  <div v-for="i in 5" :key="'SP'+i" class="w-24 lg:w-32 mx-auto">
                    <LineupSlot :pos="'SP'+i" :p="lineup['SP'+i]" @clear="clearLineupSlot('SP'+i)" :get-info="getPlayerSynergyInfo" />
                  </div>
                </div>
              </div>
              <div>
                <h3 class="mb-4 text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">중계 & 마무리</h3>
                <div class="grid grid-cols-2 lg:grid-cols-6 gap-3 lg:gap-6">
                  <div v-for="i in 6" :key="'RP'+i" class="w-24 lg:w-32 mx-auto">
                    <LineupSlot :pos="'RP'+i" :p="lineup['RP'+i]" @clear="clearLineupSlot('RP'+i)" :get-info="getPlayerSynergyInfo" />
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="space-y-6 lg:space-y-8">
              <div>
                <h3 class="mb-4 text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">벤치 선수</h3>
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
                  <div v-for="i in 8" :key="'BENCH'+i" class="w-24 lg:w-32 mx-auto">
                    <LineupSlot :pos="'BENCH'+i" :p="lineup['BENCH'+i]" @clear="clearLineupSlot('BENCH'+i)" :get-info="getPlayerSynergyInfo" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="lg:col-span-3 flex flex-col rounded-2xl bg-white dark:bg-neutral-800 ring-1 ring-neutral-200/70 dark:ring-neutral-700/70 min-h-0 transition-colors">
          <header class="border-b border-neutral-100 dark:border-neutral-700 px-5 py-4 flex-shrink-0">
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-base font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">시너지</h2>
              <div class="text-xs text-neutral-500 dark:text-neutral-400">
                활성 {{ activeSynergyList.filter(s=>s.activeCondition).length }} · 대기 {{ inactiveSynergyList.length }}
              </div>
            </div>

            <div class="flex rounded-lg bg-neutral-100 dark:bg-neutral-700 p-1">
              <button
                  @click="synergyViewMode = 'by-synergy'"
                  :class="synergyViewMode === 'by-synergy' ? 'bg-white dark:bg-neutral-600 text-neutral-900 dark:text-neutral-100 shadow-sm' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'"
                  class="flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all"
              >
                시너지별
              </button>
              <button
                  @click="synergyViewMode = 'by-player'"
                  :class="synergyViewMode === 'by-player' ? 'bg-white dark:bg-neutral-600 text-neutral-900 dark:text-neutral-100 shadow-sm' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'"
                  class="flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all"
              >
                선수별
              </button>
            </div>
          </header>

          <div class="flex-1 overflow-y-auto min-h-0 p-5">
            <div v-if="synergyViewMode === 'by-synergy'" class="space-y-6">
              <div>
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">활성</h3>
                  <div class="flex gap-1" v-if="activeSynergyList.filter(s=>s.activeCondition).length">
                    <button
                        @click="expandAllSynergies"
                        class="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                    >전체 펼치기</button>
                    <span class="text-xs text-neutral-300 dark:text-neutral-600">|</span>
                    <button
                        @click="collapseAllSynergies"
                        class="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                    >전체 접기</button>
                  </div>
                </div>
                <div v-if="!activeSynergyList.filter(s=>s.activeCondition).length" class="rounded-xl bg-neutral-50 dark:bg-neutral-700/50 p-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                  발동된 시너지가 없습니다
                </div>
                <div class="space-y-4">
                  <div
                      v-for="sy in activeSynergyList.filter(s=>s.activeCondition)"
                      :key="sy.name + '-active'"
                      class="rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 transition-colors"
                  >
                    <button
                        @click="toggleSynergy(sy.name)"
                        class="w-full p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors rounded-xl"
                    >
                      <div class="flex items-center gap-3 min-w-0 flex-1">
                        <div class="min-w-0 flex-1 text-left">
                          <div class="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100 mb-1">{{ sy.name }}</div>
                          <div class="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed truncate">{{ sy.synergy.description }}</div>
                        </div>
                        <div class="rounded-full bg-neutral-100 dark:bg-neutral-600 px-2 py-0.5 text-xs text-neutral-600 dark:text-neutral-300 flex-shrink-0">{{ sy.count }}명</div>
                      </div>
                      <ChevronDown
                          :class="expandedSynergies.has(sy.name) ? 'rotate-180' : ''"
                          class="w-4 h-4 text-neutral-400 dark:text-neutral-500 transition-transform flex-shrink-0 ml-2"
                      />
                    </button>
                    <div
                        v-show="expandedSynergies.has(sy.name)"
                        class="px-4 pb-4 border-t border-neutral-100 dark:border-neutral-700"
                    >
                      <div class="pt-3">
                        <div class="mb-4 rounded-lg bg-neutral-50 dark:bg-neutral-600 px-3 py-2 text-[13px] font-semibold text-neutral-900 dark:text-neutral-100">
                          {{ STAT_LABELS[sy.activeCondition!.stat] || sy.activeCondition!.stat }}
                          +{{ sy.activeCondition!.bonus.value }}{{ sy.activeCondition!.bonus.unit==='percent' ? '%' : '' }}
                        </div>
                        <div class="flex flex-wrap gap-1.5 mb-3">
                          <span v-for="nm in sy.appliedPlayers" :key="nm" class="rounded-md bg-neutral-100 dark:bg-neutral-600 px-2 py-0.5 text-[11px] text-neutral-700 dark:text-neutral-300">{{ nm }}</span>
                        </div>
                        <div v-if="sy.impliedChildren?.length" class="border-t border-neutral-100 dark:border-neutral-600 pt-3">
                          <div class="mb-2 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">하위 시너지 (표시)</div>
                          <div class="flex flex-wrap gap-1.5">
                            <span v-for="child in sy.impliedChildren" :key="child.name" class="rounded-full bg-white dark:bg-neutral-700 px-2 py-0.5 text-[11px] text-neutral-600 dark:text-neutral-300 ring-1 ring-neutral-200 dark:ring-neutral-600">
                              {{ child.name }} · {{ child.count }}명
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h3 class="mb-4 text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">비활성화</h3>
                <div v-if="!inactiveSynergyList.length" class="rounded-xl bg-neutral-50 dark:bg-neutral-700/50 p-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                  조건 부족 시너지가 없습니다
                </div>
                <div class="space-y-4">
                  <div v-for="sy in inactiveSynergyList" :key="sy.name + '-inactive'" class="rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 p-4 transition-colors">
                    <div class="mb-3 flex items-center justify-between">
                      <div class="truncate text-[15px] font-semibold text-neutral-900 dark:text-neutral-100 flex-1 pr-3">{{ sy.name }}</div>
                      <div class="rounded-full bg-neutral-100 dark:bg-neutral-600 px-2 py-0.5 text-xs text-neutral-600 dark:text-neutral-300 flex-shrink-0">{{ sy.count }}명</div>
                    </div>
                    <div class="mb-2 text-[13px] text-neutral-800 dark:text-neutral-200 leading-relaxed">{{ sy.nextEffectDescription }}</div>
                    <div class="mb-3 text-xs font-medium text-red-600 dark:text-red-400">{{ sy.remainingCount }}명 더 필요</div>
                    <div class="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-600 mb-2">
                      <div class="h-2 rounded-full bg-neutral-900 dark:bg-neutral-300 transition-[width] duration-500" :style="{ width: sy.progress + '%' }"></div>
                    </div>
                    <div class="text-center text-[11px] text-neutral-500 dark:text-neutral-400">{{ sy.progress }}% 진행</div>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="space-y-4">
              <div v-if="!playerSynergyList.length" class="rounded-xl bg-neutral-50 dark:bg-neutral-700/50 p-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                라인업에 선수가 없습니다
              </div>
              <div v-for="playerSynergy in playerSynergyList" :key="playerSynergy.playerName" class="rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 p-4 transition-colors">
                <div class="mb-3 flex items-start justify-between">
                  <div class="min-w-0 flex-1 pr-3">
                    <div class="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100 mb-1">{{ playerSynergy.playerName }}</div>
                    <div class="text-xs text-neutral-500 dark:text-neutral-400">{{ playerSynergy.position }}</div>
                  </div>
                  <div class="rounded-full bg-neutral-100 dark:bg-neutral-600 px-2 py-0.5 text-xs text-neutral-600 dark:text-neutral-300 flex-shrink-0">
                    {{ playerSynergy.activeSynergies.length }}개 활성
                  </div>
                </div>
                <div v-if="playerSynergy.activeSynergies.length" class="space-y-3">
                  <div v-for="synergy in playerSynergy.activeSynergies" :key="synergy.name" class="rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-300 p-3">
                    <div class="flex items-center justify-between mb-2">
                      <div class="text-sm font-medium text-green-900 dark:text-green-200">{{ synergy.name }}</div>
                      <div class="text-xs text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-800 px-2 py-0.5 rounded-full">활성</div>
                    </div>
                    <div class="text-xs text-green-800 dark:text-green-300 mb-2">{{ synergy.description }}</div>
                    <div class="text-sm font-semibold text-green-900 dark:text-green-100  px-2 py-1 rounded">
                      {{ STAT_LABELS[synergy.activeCondition.stat] || synergy.activeCondition.stat }}
                      +{{ synergy.activeCondition.bonus.value }}{{ synergy.activeCondition.bonus.unit==='percent' ? '%' : '' }}
                    </div>
                  </div>
                </div>
                <div v-if="playerSynergy.inactiveSynergies.length" class="mt-3 space-y-2">
                  <div class="text-xs font-medium text-neutral-500 dark:text-neutral-400 border-t border-neutral-100 dark:border-neutral-600 pt-3">비활성화된 시너지</div>
                  <div v-for="synergy in playerSynergy.inactiveSynergies" :key="synergy.name" class="rounded-lg bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 p-2">
                    <div class="flex items-center justify-between mb-1">
                      <div class="text-xs font-medium text-neutral-900 dark:text-neutral-100">{{ synergy.name }}</div>
                      <div class="text-xs text-neutral-600 dark:text-neutral-400">{{ synergy.remainingCount }}명 더 필요</div>
                    </div>
                    <div class="text-xs text-neutral-600 dark:text-neutral-400">{{ synergy.nextEffectDescription }}</div>
                  </div>
                </div>
                <div v-if="!playerSynergy.activeSynergies.length && !playerSynergy.inactiveSynergies.length" class="text-xs text-neutral-500 dark:text-neutral-400 italic">
                  적용 가능한 시너지가 없습니다
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
<style scoped>
button:disabled { opacity: 0.5; cursor: not-allowed; }
* { scroll-behavior: smooth; }
::-webkit-scrollbar { width: 8px; }

::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #3b82f6 0%, #8b5cf6 100%);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, #2563eb 0%, #7c3aed 100%);
}
.dark ::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #60a5fa 0%, #a78bfa 100%);
}
.dark ::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, #3b82f6 0%, #8b5cf6 100%);
}

.dark { color-scheme: dark; }

@media (max-width: 1024px) {
  .lineup-diamond { height: 250px !important; }
}
@media (max-width: 768px) {
  .lineup-diamond { height: 200px !important; }
}
</style>