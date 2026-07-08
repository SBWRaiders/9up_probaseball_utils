<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch, defineComponent, h } from 'vue'
import Papa from 'papaparse'
import { Search, Calculator, Star, Shield, Zap, TrendingUp, X, Users, ArrowUpCircle, Sparkles, UserCheck } from 'lucide-vue-next'

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

const isLoading = ref(true)
const players = ref<Raw[]>([])
const synergys = ref<JsonSynergy[]>([])
const searchQuery = ref('')
const selectedGrade = ref<string>('')
const filterGrades = ['DGN', 'TOP', 'GG', 'GGY', 'HIT', 'ACE', 'ROY', 'MMVP', 'TEA', 'POS', 'ASG', 'SEA']

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
  playerLevel: 100,
  collectionBuff: 1200,
  teamLevelBuff: 750,
  careerLevelBuff: 149,
  binderBuff: 537,
  clanBuff: 15,
  ultimateImprintPercent: 0
})

const playerBuffs = ref<Record<string, PlayerBuff>>({})

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

const rightPanelTab = ref<'global' | 'player'>('global')
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
    const cleanNames = getArray(p.synergy).map(x=>x.normalize('NFKC').replace(/​|‌|‍|⁠/g,'').replace(/[,\s클럽]/g,'').trim())
    const targetClean = synName.normalize('NFKC').replace(/​|‌|‍|⁠/g,'').replace(/[,\s클럽]/g,'').trim()
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

const PlayerCard = defineComponent({
  name: 'PlayerCard',
  props: { pos: String, p: Object, buffs: Object, isSelected: Boolean },
  emits: ['click', 'clear'],
  setup(props, { emit }) {
    return () => {
      if (!props.p) {
        return h('div', { class: 'h-[100px] border border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl flex flex-col items-center justify-center bg-neutral-50/50 dark:bg-neutral-800/30 text-neutral-400 cursor-pointer hover:bg-neutral-100', onClick: () => emit('click') }, [h('span', { class: 'text-[10px] font-bold' }, props.pos)])
      }
      return h('div', { 
        class: ['relative h-[100px] border rounded-xl flex flex-col items-center p-2 cursor-pointer transition-all shadow-sm group', props.isSelected ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-200' : 'border-neutral-200 bg-white hover:border-indigo-300'],
        onClick: () => emit('click')
      }, [
        h('div', { class: 'absolute top-1 left-2 text-[9px] font-black text-neutral-400' }, props.pos),
        h('button', { class: 'absolute top-1 right-1 w-4 h-4 rounded-full bg-neutral-100 text-neutral-400 hover:bg-red-500 hover:text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity', onClick: (e:Event) => { e.stopPropagation(); emit('clear') } }, '×'),
        h('img', { src: `/assets/logos/grade/${props.p.grade}.png`, class: 'w-8 h-8 object-contain mt-1 drop-shadow-sm' }),
        h('div', { class: 'text-xs font-bold text-neutral-800 mt-1 truncate w-full text-center' }, props.p.name),
        props.buffs?.battingOrder && (!String(props.p.position).toUpperCase().includes('P') && !props.p.movement) ? h('div', { class: 'absolute bottom-1 left-2 text-[9px] font-bold bg-orange-100 text-orange-600 px-1 rounded' }, `${props.buffs.battingOrder}번`) : null,
        h('div', { class: 'absolute bottom-1 right-2 text-[11px] font-black text-indigo-600' }, '설정➔')
      ])
    }
  }
})

onMounted(async () => {
  try {
    const res = await fetch('/DB/player_sorted.csv', { cache: 'no-store' })
    const text = await res.text()
    Papa.parse(text, { header: true, skipEmptyLines: true, complete: ({ data }) => (players.value = data as Raw[]) })
    const synRes = await fetch('/DB/synergys.json', { cache: 'no-store' })
    if (synRes.ok) synergys.value = (await synRes.json()).filter((it: any) => it?.conditions?.length > 0)
  } catch(e) { console.error(e) } finally { isLoading.value = false }
})
</script>

<template>
  <div class="bg-neutral-50 h-screen overflow-hidden flex flex-col font-sans">
    <header class="bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex-shrink-0">
      <div class="mx-auto max-w-[1800px] px-4 py-3 flex items-center justify-between">
        <h1 class="text-xl font-bold">9UP 팀 파워 시뮬레이터</h1>
        <div class="px-5 py-2 bg-black/20 rounded-xl text-3xl font-black text-amber-300 tabular-nums tracking-tight">{{ teamTotalPower.toLocaleString() }}</div>
      </div>
    </header>
    <div class="mx-auto max-w-[1800px] w-full p-3 flex-1 flex flex-col min-h-0">
      <div v-if="isLoading" class="flex h-full items-center justify-center">Loading...</div>
      <div v-else class="grid grid-cols-12 gap-4 flex-1 min-h-0">
        <section class="col-span-3 flex flex-col rounded-2xl bg-white border border-neutral-200 overflow-hidden">
          <div class="p-4 border-b"><input v-model.trim="searchQuery" class="w-full p-2 border rounded-lg text-sm" placeholder="이름, 팀 검색..."></div>
          <div class="flex-1 overflow-y-auto p-2">
            <div v-for="p in filteredPlayers" :key="p.id" class="mb-2 p-2 rounded-lg border hover:border-blue-300 bg-white cursor-pointer" @click="assignPlayerToSlot(String(getArray(p.position)[0]||'BENCH1'), p)">
              <div class="text-sm font-bold">{{ p.name }} ({{ p.team }} {{ p.year }})</div>
            </div>
          </div>
        </section>
        <section class="col-span-5 flex flex-col rounded-2xl bg-white border border-neutral-200 overflow-hidden">
           <div class="p-4 overflow-y-auto">
             <div class="grid grid-cols-3 gap-2 mb-4">
                <PlayerCard v-for="pos in ['LF', 'CF', 'RF']" :key="pos" :pos="pos" :p="lineup[pos]" :buffs="playerBuffs[pos]" @click="selectSlot(pos)" @clear="clearSlot(pos)" />
             </div>
             <div class="grid grid-cols-4 gap-2 mb-4">
                <PlayerCard v-for="pos in ['3B', 'SS', '2B', '1B']" :key="pos" :pos="pos" :p="lineup[pos]" :buffs="playerBuffs[pos]" @click="selectSlot(pos)" @clear="clearSlot(pos)" />
             </div>
             <div class="grid grid-cols-2 gap-2">
                <PlayerCard v-for="pos in ['C', 'DH']" :key="pos" :pos="pos" :p="lineup[pos]" :buffs="playerBuffs[pos]" @click="selectSlot(pos)" @clear="clearSlot(pos)" />
             </div>
           </div>
        </section>
        <section class="col-span-4 flex flex-col rounded-2xl bg-white border border-neutral-200 overflow-hidden p-5">
           <h3 class="text-sm font-bold mb-4">설정 패널</h3>
           <div v-if="selectedSlot && lineup[selectedSlot]" class="space-y-4">
              <div class="text-sm font-bold">{{ lineup[selectedSlot]!.name }}</div>
              <input type="number" v-model.number="playerBuffs[selectedSlot].enhancementLevel" placeholder="강화" class="w-full p-2 border rounded text-xs">
              <input type="number" v-model.number="playerBuffs[selectedSlot].breakthroughLevel" placeholder="돌파" class="w-full p-2 border rounded text-xs">
           </div>
        </section>
      </div>
    </div>
  </div>
</template>
