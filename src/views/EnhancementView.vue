<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { 
  Zap, RefreshCw, ArrowRight, Check, X, Calculator, History, 
  Lock, Unlock, Play, Star, Settings, Pause, Edit3, Target, BarChart, Info
} from 'lucide-vue-next'

const activeTab = ref<'enhance' | 'career'>('career')

// ==============================================
// [1] 강화 시뮬레이터 
// ==============================================
const BASE_PROBS = [1.0, 0.8, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.075, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05]
const FAIL_BONUS = 0.025
const MAX_LEVEL = 15

const currentLevel = ref(0)
const failStack = ref(0)
const totalCardsUsed = ref(0)
const logs = ref<{ id: number, type: 'success' | 'fail', from: number, to: number, prob: number, count: number }[]>([])
let logId = 0

const currentBaseProb = computed(() => BASE_PROBS[currentLevel.value] ?? 0.05)
const currentRealProb = computed(() => Math.min(1.0, currentBaseProb.value + failStack.value * FAIL_BONUS))

const tryEnhance = () => {
  if (currentLevel.value >= MAX_LEVEL) return
  totalCardsUsed.value++
  const r = Math.random()
  const success = r <= currentRealProb.value
  logs.value.unshift({ id: logId++, type: success ? 'success' : 'fail', from: currentLevel.value, to: success ? currentLevel.value + 1 : currentLevel.value, prob: currentRealProb.value, count: totalCardsUsed.value })
  if (logs.value.length > 50) logs.value.pop()
  if (success) { currentLevel.value++; failStack.value = 0 } else { failStack.value++ }
}
const resetEnhanceSim = () => { currentLevel.value = 0; failStack.value = 0; totalCardsUsed.value = 0; logs.value = [] }

const expectedValues = computed(() => {
  return BASE_PROBS.map((prob) => {
    let expectedTries = 0; let reachProb = 1.0;
    for (let k = 1; k < 100; k++) {
      const currentTryProb = Math.min(1.0, prob + (k - 1) * FAIL_BONUS)
      expectedTries += k * reachProb * currentTryProb
      reachProb *= (1 - currentTryProb)
      if (reachProb <= 0) break
    }
    return expectedTries
  })
})
const calcStartLevel = ref(0)
const calcTargetLevel = ref(15)
const calculatedExpectedCards = computed(() => {
  if (calcStartLevel.value >= calcTargetLevel.value) return 0
  let total = 0
  for (let i = calcStartLevel.value; i < calcTargetLevel.value; i++) total += expectedValues.value[i]
  return total
})

// ==============================================
// [2] 커리어 옵션 시뮬레이터 (100% 인게임 데이터 고증)
// ==============================================
const playerType = ref<'BATTER' | 'PITCHER'>('BATTER')

const TIERS = ['루키', '엘리트', '프로', '마스터']
const TIER_COLORS = ['text-green-600 dark:text-green-500', 'text-blue-600 dark:text-blue-500', 'text-pink-600 dark:text-pink-500', 'text-yellow-600 dark:text-yellow-500']
const TIER_BG = ['bg-green-100 dark:bg-green-900/30', 'bg-blue-100 dark:bg-blue-900/30', 'bg-pink-100 dark:bg-pink-900/30', 'bg-yellow-100 dark:bg-yellow-900/30']

const CARD_TYPES = [
  { id: 0, name: 'SEA, ASG, POS', baseAP: [1000, 2000, 10000, 50000], lockAP: [0, 30000, 150000, 500000, 1000000], lockCash: [0, 0, 0, 0, 0] },
  { id: 1, name: 'TEAM, MMVP', baseAP: [10000, 20000, 50000, 250000], lockAP: [0, 50000, 250000, 900000, 2000000], lockCash: [0, 0, 0, 0, 0] },
  { id: 2, name: 'ROY (신인왕)', baseAP: [30000, 60000, 150000, 750000], lockAP: [0, 50000, 250000, 900000, 2000000], lockCash: [0, 0, 0, 0, 0] },
  { id: 3, name: 'HIT, ACE, GG, GGY', baseAP: [30000, 60000, 150000, 750000], lockAP: [0, 0, 0, 0, 0], lockCash: [0, 5, 15, 50, 100] },
  { id: 4, name: 'TOP, DGN', baseAP: [40000, 80000, 200000, 1000000], lockAP: [0, 0, 0, 0, 0], lockCash: [0, 5, 15, 50, 100] }
]

const BATTER_OPTS = [
  { id: 0, name: '전체 능력치 상승', setBonus: 6, vals: [[2,3,4], [5,6,7], [8,9,10], [12,13,14]] },
  { id: 1, name: '컨택트 능력치 상승', setBonus: 25, vals: [[5,10,14], [19,23,28], [32,37,41], [46,50,55]] },
  { id: 2, name: '홈런 능력치 상승', setBonus: 25, vals: [[5,10,14], [19,23,28], [32,37,41], [46,50,55]] },
  { id: 3, name: '삼진회피 능력치 상승', setBonus: 25, vals: [[5,10,14], [19,23,28], [32,37,41], [46,50,55]] },
  { id: 4, name: '선구 능력치 상승', setBonus: 25, vals: [[5,10,14], [19,23,28], [32,37,41], [46,50,55]] },
  { id: 5, name: '갭파워 능력치 상승', setBonus: 25, vals: [[5,10,14], [19,23,28], [32,37,41], [46,50,55]] },
  { id: 6, name: '지고 있을 시, 파워 상승', setBonus: 50, vals: [[5,12,17], [22,29,34], [39,46,51], [56,63,68]] },
  { id: 7, name: '안타를 기록할 때마다 파워 상승', setBonus: 40, vals: [[3,5,9], [12,14,17], [20,22,26], [29,31,34]] },
  { id: 8, name: '자신 보다 파워 높은 카드 상대 시, 파워 상승', setBonus: 40, vals: [[7,14,22], [29,36,43], [49,56,65], [71,78,85]] },
  { id: 9, name: '박빙 상황(2점차 이내)에서 파워 상승', setBonus: 50, vals: [[5,11,16], [22,27,33], [38,43,49], [54,60,65]] },
  { id: 10, name: '자신보다 파워 낮은 카드 상대 시, 파워 상승', setBonus: 40, vals: [[7,14,22], [29,36,43], [49,56,65], [71,78,85]] },
  { id: 11, name: '★ 라인업의 동일 팀 카드 수만큼, 파워 상승', setBonus: 2, vals: [[0], [0], [0], [2]] }
]

const PITCHER_OPTS = [
  { id: 0, name: '전체 능력치 상승', setBonus: 6, vals: [[2,3,4], [5,6,7], [8,9,10], [12,13,14]] },
  { id: 1, name: '무브먼트 능력치 상승', setBonus: 25, vals: [[5,10,14], [19,23,28], [32,37,41], [46,50,55]] },
  { id: 2, name: '홈런억제 능력치 상승', setBonus: 25, vals: [[5,10,14], [19,23,28], [32,37,41], [46,50,55]] },
  { id: 3, name: '스터프 능력치 상승', setBonus: 25, vals: [[5,10,14], [19,23,28], [32,37,41], [46,50,55]] },
  { id: 4, name: '컨트롤 능력치 상승', setBonus: 25, vals: [[5,10,14], [19,23,28], [32,37,41], [46,50,55]] },
  { id: 5, name: '장타 억제 능력치 상승', setBonus: 25, vals: [[5,10,14], [19,23,28], [32,37,41], [46,50,55]] },
  { id: 6, name: '지고 있을 시, 파워 상승', setBonus: 50, vals: [[5,12,17], [22,29,34], [39,46,51], [56,63,68]] },
  { id: 7, name: '삼진을 기록할 때마다 파워 상승', setBonus: 6, vals: [[1,2,3], [3,5,7], [7,9,10], [10,12,14]] },
  { id: 8, name: '자신 보다 파워 높은 카드 상대 시, 파워 상승', setBonus: 40, vals: [[7,14,22], [29,36,43], [49,56,65], [71,78,85]] },
  { id: 9, name: '박빙 상황(2점차 이내)에서 파워 상승', setBonus: 50, vals: [[5,11,16], [22,27,33], [38,43,49], [54,60,65]] },
  { id: 10, name: '자신보다 파워 낮은 카드 상대 시, 파워 상승', setBonus: 40, vals: [[7,14,22], [29,36,43], [49,56,65], [71,78,85]] },
  { id: 11, name: '★ 라인업의 동일 팀 카드 수만큼, 파워 상승', setBonus: 2, vals: [[0], [0], [0], [2]] }
]

const CURRENT_DATA = computed(() => playerType.value === 'BATTER' ? BATTER_OPTS : PITCHER_OPTS)
const selectedCardIdx = ref(0)
const selectedCard = computed(() => CARD_TYPES[selectedCardIdx.value])

const slots = ref(Array.from({ length: 5 }, (_, i) => ({ id: i, tier: 0, optId: 0, statVal: 4, isLocked: false })))
const specialSlot = ref({ tier: 3, optId: 0, statVal: 14 })

const totalApSpent = ref(0)
const totalCashSpent = ref(0)
const specialSpinCount = ref(0)
const apSpinCount = ref(0)

const currentRollCostAP = computed(() => {
  const card = selectedCard.value; let lockedCount = slots.value.filter(s => s.isLocked).length
  if (lockedCount === 5) return 0
  let cost = card.lockAP[lockedCount]
  slots.value.forEach(slot => { if (!slot.isLocked) cost += card.baseAP[slot.tier] })
  return cost
})

const rollOption = (tier: number, useMathRandom = true, rngFunction?: () => number) => {
  const isMaster = tier === 3; const totalWeight = isMaster ? 34 : 33
  const rNum = useMathRandom ? Math.random() : (rngFunction ? rngFunction() : 0)
  let rand = rNum * totalWeight
  let optId = 0
  for (let i = 0; i < 12; i++) {
    if (!isMaster && i === 11) continue
    rand -= (i === 11) ? 1 : 3
    if (rand < 0) { optId = i; break }
  }
  const vals = CURRENT_DATA.value[optId].vals[tier]
  const valIdx = useMathRandom ? Math.floor(Math.random() * vals.length) : Math.floor((rngFunction ? rngFunction() : 0) * vals.length)
  return { optId, statVal: vals[valIdx] }
}

const rollSlots = () => {
  const card = selectedCard.value; let lockedCount = slots.value.filter(s => s.isLocked).length
  if (lockedCount === 5) return
  let costAP = card.lockAP[lockedCount]; let costCash = card.lockCash[lockedCount]
  slots.value.forEach(slot => {
    if (!slot.isLocked) {
      costAP += card.baseAP[slot.tier]
      if (slot.tier < 3 && Math.random() < 0.01) slot.tier++
      const rolled = rollOption(slot.tier)
      slot.optId = rolled.optId; slot.statVal = rolled.statVal
    }
  })
  totalApSpent.value += costAP; totalCashSpent.value += costCash; apSpinCount.value++
}

const spinSpecialSlot = () => { 
  const rolled = rollOption(3); specialSlot.value.optId = rolled.optId; specialSlot.value.statVal = rolled.statVal
  specialSpinCount.value++ 
}

const resetCareerSim = () => { 
  totalApSpent.value = 0; totalCashSpent.value = 0; apSpinCount.value = 0; specialSpinCount.value = 0; 
  slots.value.forEach(s => { s.tier = 0; s.isLocked = false; s.optId = 0; s.statVal = CURRENT_DATA.value[0].vals[0][0] }); 
  specialSlot.value.optId = 0; specialSlot.value.statVal = CURRENT_DATA.value[0].vals[3][2] 
}

const toggleLock = (index: number) => slots.value[index].isLocked = !slots.value[index].isLocked

const setEffects = computed(() => {
  const counts: Record<number, number> = {}
  slots.value.forEach(s => counts[s.optId] = (counts[s.optId] || 0) + 1); counts[specialSlot.value.optId] = (counts[specialSlot.value.optId] || 0) + 1
  return Object.entries(counts).filter(([_, count]) => count >= 3).map(([optId, count]) => {
    const optData = CURRENT_DATA.value[Number(optId)]
    const totalBonus = optData.setBonus * count
    return { name: optData.name, count, bonusStr: `슬롯당 +${optData.setBonus} (총 +${totalBonus})` }
  })
})

const validateStatVal = (slot: any) => {
  if (slot.tier !== 3 && slot.optId === 11) slot.optId = 0 
  const validVals = CURRENT_DATA.value[slot.optId].vals[slot.tier]
  if (!validVals.includes(Number(slot.statVal))) slot.statVal = validVals[validVals.length - 1]
}

watch(playerType, () => {
  slots.value.forEach(s => validateStatVal(s)); validateStatVal(specialSlot.value)
})

// ==============================================
// 🌟 고정 기대값 계산기 (승급 메모리 전략 포함) 🌟
// ==============================================
const calcTargetGoal = ref<'5MASTER' | 'TARGET_SET' | 'TARGET_3_3'>('5MASTER')
const calcTargetSetCount = ref(3)
const calcTargetSetOptId = ref(0)
const calcTarget3_3_Opt1 = ref(0)
const calcTarget3_3_Opt2 = ref(1)

// 🌟 신규: 승급 메모리 사용 옵션
const useUpgradeMemory = ref(true)

const calcResult = ref<{ 
  avgRolls: number, avgAp: number, avgCash: number, specialRolls: number,
  memElite: number, memPro: number, memMaster: number 
} | null>(null)
const isCalculating = ref(false)

function SeededRNG(seed: number) {
  let state = seed
  return function() { state = (state * 9301 + 49297) % 233280; return state / 233280 }
}

const runExpectedValueCalc = () => {
  isCalculating.value = true
  calcResult.value = null
  
  setTimeout(() => {
    const card = selectedCard.value
    let rng = SeededRNG(12345) 
    
    let simAp = 0, simCash = 0, simRolls = 0, simSpecialRolls = 0
    let simMemE = 0, simMemP = 0, simMemM = 0
    const iterations = 3000 
    
    for (let i = 0; i < iterations; i++) {
      let tempSlots = slots.value.map(s => ({ ...s }))
      let spOpt = specialSlot.value.optId
      let r = 0, ap = 0, cash = 0, sr = 0
      let mE = 0, mP = 0, mM = 0
      
      if (calcTargetGoal.value === '5MASTER') {
        while (true) {
          // 승급 메모리 사용 로직 (마지막 1칸 남았을 때 멱살 캐리)
          if (useUpgradeMemory.value) {
            let rCount = tempSlots.filter(s => s.tier === 0).length
            if (rCount === 1 && tempSlots.filter(s => s.tier >= 1).length >= 4) { tempSlots.find(s => s.tier === 0)!.tier = 1; mE++ }
            let eCount = tempSlots.filter(s => s.tier === 1).length
            if (eCount === 1 && tempSlots.filter(s => s.tier >= 2).length >= 4) { tempSlots.find(s => s.tier === 1)!.tier = 2; mP++ }
            let pCount = tempSlots.filter(s => s.tier === 2).length
            if (pCount === 1 && tempSlots.filter(s => s.tier === 3).length >= 4) { tempSlots.find(s => s.tier === 2)!.tier = 3; mM++ }
          }

          if (tempSlots.every(s => s.tier === 3)) break
          r++
          
          let lc = tempSlots.filter(s => s.isLocked).length
          let loopAp = card.lockAP[lc]
          tempSlots.forEach(s => {
            if (!s.isLocked) {
              loopAp += card.baseAP[s.tier]
              if (s.tier < 3 && rng() < 0.01) s.tier++
            }
          })
          ap += loopAp
          if (r > 15000) break
        }
      } 
      else if (calcTargetGoal.value === 'TARGET_SET') {
        if (calcTargetSetCount.value === 6 && spOpt !== calcTargetSetOptId.value) {
          const w = calcTargetSetOptId.value === 11 ? 1 : 3
          sr += 1 / (w / 34)
          spOpt = calcTargetSetOptId.value
        }
        
        while (true) {
          if (useUpgradeMemory.value) {
            let rCount = tempSlots.filter(s => s.tier === 0).length
            if (rCount === 1 && tempSlots.filter(s => s.tier >= 1).length >= 4) { tempSlots.find(s => s.tier === 0)!.tier = 1; mE++ }
            let eCount = tempSlots.filter(s => s.tier === 1).length
            if (eCount === 1 && tempSlots.filter(s => s.tier >= 2).length >= 4) { tempSlots.find(s => s.tier === 1)!.tier = 2; mP++ }
            let pCount = tempSlots.filter(s => s.tier === 2).length
            if (pCount === 1 && tempSlots.filter(s => s.tier === 3).length >= 4) { tempSlots.find(s => s.tier === 2)!.tier = 3; mM++ }
          }

          let c = (spOpt === calcTargetSetOptId.value ? 1 : 0) + tempSlots.filter(s => s.tier === 3 && s.optId === calcTargetSetOptId.value).length
          if (c >= calcTargetSetCount.value) break
          
          r++
          let allMaster = tempSlots.every(s => s.tier === 3)
          if (allMaster) {
            let currentLocked = (spOpt === calcTargetSetOptId.value ? 1 : 0) + tempSlots.filter(s => s.isLocked && s.optId === calcTargetSetOptId.value).length
            tempSlots.forEach(s => {
              if (!s.isLocked && s.tier === 3 && s.optId === calcTargetSetOptId.value && currentLocked < calcTargetSetCount.value) {
                s.isLocked = true; currentLocked++
              }
            })
          }
          
          let lc = tempSlots.filter(s => s.isLocked).length
          let loopAp = card.lockAP[lc]; let loopCash = card.lockCash[lc]
          
          tempSlots.forEach(s => {
            if (!s.isLocked) {
              loopAp += card.baseAP[s.tier]
              if (s.tier < 3 && rng() < 0.01) s.tier++
              const rolled = rollOption(s.tier, false, rng)
              s.optId = rolled.optId
            }
          })
          ap += loopAp; cash += loopCash
          if (r > 20000) break
        }
      }
      else if (calcTargetGoal.value === 'TARGET_3_3') {
        if (spOpt !== calcTarget3_3_Opt1.value && spOpt !== calcTarget3_3_Opt2.value) {
          const w1 = calcTarget3_3_Opt1.value === 11 ? 1 : 3
          const w2 = calcTarget3_3_Opt2.value === 11 ? 1 : 3
          const prob = (w1 + w2) / 34
          sr += 1 / prob
          spOpt = (rng() < w1/(w1+w2)) ? calcTarget3_3_Opt1.value : calcTarget3_3_Opt2.value
        }
        
        while (true) {
          if (useUpgradeMemory.value) {
            let rCount = tempSlots.filter(s => s.tier === 0).length
            if (rCount === 1 && tempSlots.filter(s => s.tier >= 1).length >= 4) { tempSlots.find(s => s.tier === 0)!.tier = 1; mE++ }
            let eCount = tempSlots.filter(s => s.tier === 1).length
            if (eCount === 1 && tempSlots.filter(s => s.tier >= 2).length >= 4) { tempSlots.find(s => s.tier === 1)!.tier = 2; mP++ }
            let pCount = tempSlots.filter(s => s.tier === 2).length
            if (pCount === 1 && tempSlots.filter(s => s.tier === 3).length >= 4) { tempSlots.find(s => s.tier === 2)!.tier = 3; mM++ }
          }

          let c1 = (spOpt === calcTarget3_3_Opt1.value ? 1 : 0) + tempSlots.filter(s => s.tier === 3 && s.optId === calcTarget3_3_Opt1.value).length
          let c2 = (spOpt === calcTarget3_3_Opt2.value ? 1 : 0) + tempSlots.filter(s => s.tier === 3 && s.optId === calcTarget3_3_Opt2.value).length
          if (c1 >= 3 && c2 >= 3) break
          
          r++
          let allMaster = tempSlots.every(s => s.tier === 3)
          if (allMaster) {
            let currentLocked1 = (spOpt === calcTarget3_3_Opt1.value ? 1 : 0) + tempSlots.filter(s => s.isLocked && s.optId === calcTarget3_3_Opt1.value).length
            let currentLocked2 = (spOpt === calcTarget3_3_Opt2.value ? 1 : 0) + tempSlots.filter(s => s.isLocked && s.optId === calcTarget3_3_Opt2.value).length
            
            tempSlots.forEach(s => {
              if (!s.isLocked && s.tier === 3) {
                if (s.optId === calcTarget3_3_Opt1.value && currentLocked1 < 3) { s.isLocked = true; currentLocked1++ }
                else if (s.optId === calcTarget3_3_Opt2.value && currentLocked2 < 3) { s.isLocked = true; currentLocked2++ }
              }
            })
          }
          
          let lc = tempSlots.filter(s => s.isLocked).length
          let loopAp = card.lockAP[lc]; let loopCash = card.lockCash[lc]
          
          tempSlots.forEach(s => {
            if (!s.isLocked) {
              loopAp += card.baseAP[s.tier]
              if (s.tier < 3 && rng() < 0.01) s.tier++
              const rolled = rollOption(s.tier, false, rng)
              s.optId = rolled.optId
            }
          })
          ap += loopAp; cash += loopCash
          if (r > 20000) break
        }
      }
      simRolls += r; simAp += ap; simCash += cash; simSpecialRolls += sr
      simMemE += mE; simMemP += mP; simMemM += mM
    }
    
    calcResult.value = { 
      avgRolls: Math.round(simRolls / iterations), 
      avgAp: Math.round(simAp / iterations), 
      avgCash: Math.round(simCash / iterations),
      specialRolls: Math.round(simSpecialRolls / iterations),
      memElite: simMemE / iterations,
      memPro: simMemP / iterations,
      memMaster: simMemM / iterations
    }
    isCalculating.value = false
  }, 50)
}

const isAutoModalOpen = ref(false)
const autoTab = ref<'SET' | 'TIER' | 'OPT_MASTER' | 'OPT_PRO' | 'OPT_ELITE' | 'OPT_ROOKIE'>('SET')
const autoTargetSetCount = ref(3)
const autoTargetSetOpts = ref<number[]>([])
const autoTargetTierTier = ref(3)
const autoTargetTierCount = ref(1)
const autoTargetOptOpts = ref<number[]>([])

const isSpinning = ref(false)
let spinInterval: ReturnType<typeof setInterval> | null = null

const toggleOptAuto = (arr: number[], id: number) => {
  const idx = arr.indexOf(id); if (idx > -1) arr.splice(idx, 1); else arr.push(id)
}
const toggleAllOptsAuto = (arr: number[], tier: number) => {
  const available = tier === 3 ? Array.from({length:12}, (_, i)=>i) : Array.from({length:11}, (_, i)=>i)
  if (arr.length === available.length) arr.splice(0, arr.length)
  else { arr.splice(0, arr.length); arr.push(...available) }
}
const checkAutoStopCondition = () => {
  const unlockedSlots = slots.value.filter(s => !s.isLocked)
  if (unlockedSlots.length === 0) return true
  if (autoTab.value === 'SET') {
    if (autoTargetSetOpts.value.length === 0) return false
    const counts: Record<number, number> = {}
    slots.value.forEach(s => counts[s.optId] = (counts[s.optId] || 0) + 1)
    counts[specialSlot.value.optId] = (counts[specialSlot.value.optId] || 0) + 1
    return autoTargetSetOpts.value.some(optId => (counts[optId] || 0) >= autoTargetSetCount.value)
  }
  if (autoTab.value === 'TIER') return unlockedSlots.filter(s => s.tier >= autoTargetTierTier.value).length >= autoTargetTierCount.value
  if (autoTab.value.startsWith('OPT_')) {
    if (autoTargetOptOpts.value.length === 0) return false
    const targetTier = autoTab.value === 'OPT_MASTER' ? 3 : autoTab.value === 'OPT_PRO' ? 2 : autoTab.value === 'OPT_ELITE' ? 1 : 0
    return unlockedSlots.some(s => s.tier === targetTier && autoTargetOptOpts.value.includes(s.optId))
  }
  return false
}
const startAutoSpin = () => {
  if (slots.value.every(s => s.isLocked)) return alert("모든 슬롯이 잠겨있습니다.")
  if (autoTab.value === 'SET' && autoTargetSetOpts.value.length === 0) return alert("목표 옵션을 선택해주세요.")
  if (autoTab.value.startsWith('OPT_') && autoTargetOptOpts.value.length === 0) return alert("목표 옵션을 선택해주세요.")
  isAutoModalOpen.value = false; isSpinning.value = true
  spinInterval = setInterval(() => { rollSlots(); if (checkAutoStopCondition() || totalApSpent.value > 1500000000) stopAutoSpin() }, 35)
}
const stopAutoSpin = () => { isSpinning.value = false; if (spinInterval) clearInterval(spinInterval) }
const formatNum = (num: number) => new Intl.NumberFormat().format(num)
</script>

<template>
  <div class="w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-4 font-sans text-neutral-900 dark:text-neutral-100 flex flex-col min-h-screen">
    
    <!-- 탭 메뉴 -->
    <div class="flex justify-center shrink-0 mb-6">
      <div class="bg-white dark:bg-neutral-800 p-1.5 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 flex gap-1">
        <button @click="activeTab = 'enhance'" class="px-6 py-2.5 rounded-lg font-bold text-base transition-colors" :class="activeTab === 'enhance' ? 'bg-blue-600 text-white' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'">강화 시뮬레이터</button>
        <button @click="activeTab = 'career'" class="px-6 py-2.5 rounded-lg font-bold text-base transition-colors" :class="activeTab === 'career' ? 'bg-purple-600 text-white' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'">커리어 시뮬레이터</button>
      </div>
    </div>

    <!-- [1] 강화 탭 (유지) -->
    <div v-show="activeTab === 'enhance'" class="flex flex-col max-w-6xl mx-auto w-full">
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section class="flex flex-col gap-6">
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm flex flex-col items-center shrink-0 relative">
            <RefreshCw @click="resetEnhanceSim" class="absolute top-4 right-4 w-5 h-5 cursor-pointer text-neutral-400 hover:text-blue-500" />
            <div class="flex flex-col items-center mb-2 bg-neutral-50 dark:bg-neutral-800 px-4 py-2 rounded-lg">
              <label class="text-xs font-bold text-neutral-500 mb-1">시작 단계 강제 세팅 (기록 초기화)</label>
              <select v-model="currentLevel" @change="failStack=0; totalCardsUsed=0; logs=[]" class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md px-4 py-1 text-sm font-bold outline-none text-center hover:border-blue-500 transition-colors cursor-pointer"><option v-for="n in (MAX_LEVEL+1)" :key="n-1" :value="n-1">+{{n-1}}부터 시작</option></select>
            </div>
            <div class="flex items-center gap-4 text-5xl font-black my-3">
              <span :class="currentLevel >= MAX_LEVEL ? 'text-yellow-500' : 'text-neutral-400'">+{{ currentLevel }}</span>
              <ArrowRight v-if="currentLevel < MAX_LEVEL" class="w-6 h-6 text-neutral-300" />
              <span v-if="currentLevel < MAX_LEVEL" class="text-blue-500">+{{ currentLevel + 1 }}</span>
            </div>
            <div class="text-lg font-bold mb-4">{{ (currentRealProb * 100).toFixed(1) }}% <span class="text-sm text-neutral-400 font-normal">(기본{{(currentBaseProb*100).toFixed(1)}}%)</span></div>
            <button @click="tryEnhance" :disabled="currentLevel >= MAX_LEVEL" class="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"><Zap class="w-5 h-5"/> 강화 시도</button>
          </div>
          <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col h-[400px] shadow-sm">
            <div class="font-bold text-base px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2 bg-neutral-50 dark:bg-neutral-800/50 rounded-t-2xl"><History class="w-4 h-4"/> 강화 기록</div>
            <div class="flex-1 overflow-y-auto p-3 space-y-2">
              <div v-for="log in logs" :key="log.id" class="flex justify-between items-center p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-100 dark:border-neutral-800 text-sm">
                <span :class="log.type === 'success' ? 'text-blue-600 font-bold' : 'text-red-500 font-medium'">+{{log.from}} ➔ +{{log.to}}</span>
                <span class="text-neutral-500">{{ (log.prob * 100).toFixed(1) }}% <span class="mx-1">|</span> {{log.count}}장</span>
              </div>
              <div v-if="logs.length === 0" class="text-center text-neutral-400 py-10 text-sm">기록이 없습니다.</div>
            </div>
          </div>
        </section>
        
        <section class="flex flex-col gap-6">
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm flex items-center justify-between shrink-0">
            <div class="flex gap-3 w-1/2">
              <select v-model="calcStartLevel" class="w-1/2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-2 font-medium"><option v-for="n in MAX_LEVEL" :key="n" :value="n-1">+{{n-1}}</option></select>
              <select v-model="calcTargetLevel" class="w-1/2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-2 font-medium"><option v-for="n in MAX_LEVEL" :key="n" :value="n">+{{n}}</option></select>
            </div>
            <div class="text-3xl font-black text-blue-600">{{ calculatedExpectedCards > 0 ? calculatedExpectedCards.toFixed(1) : '0' }} <span class="text-base font-medium text-neutral-500">장</span></div>
          </div>
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm flex-1">
            <div class="overflow-y-auto h-full max-h-[600px]">
              <table class="w-full text-center text-sm sm:text-base">
                <thead class="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 sticky top-0 z-10 font-bold">
                  <tr><th class="py-3.5">단계</th><th>확률</th><th>1업</th><th>누적 필요</th></tr>
                </thead>
                <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
                  <tr v-for="(prob, idx) in BASE_PROBS" :key="idx" class="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                    <td class="py-3 font-medium text-neutral-700 dark:text-neutral-300">+{{idx}}➔+{{idx+1}}</td><td>{{(prob*100).toFixed(1)}}%</td><td>{{expectedValues[idx].toFixed(1)}}</td><td class="font-extrabold text-blue-600">{{(1 + expectedValues.slice(0, idx + 1).reduce((a, b) => a + b, 0)).toFixed(1)}}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>


    <!-- ==============================================
         [2] 커리어 탭 (레이아웃 재조립 및 우측 스크롤 제거)
         ============================================== -->
    <div v-show="activeTab === 'career'" class="flex flex-col w-full">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        
        <!-- [좌측] 타자투수 선택 & 파산 영수증 & 인게임 동기화 박스 -->
        <section class="lg:col-span-3 flex flex-col gap-4">
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm shrink-0">
            <div class="flex gap-2 mb-3 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
              <button @click="playerType = 'BATTER'" class="flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors" :class="playerType === 'BATTER' ? 'bg-blue-600 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700'">타자</button>
              <button @click="playerType = 'PITCHER'" class="flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors" :class="playerType === 'PITCHER' ? 'bg-red-500 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700'">투수</button>
            </div>
            
            <select v-model="selectedCardIdx" class="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-2.5 font-bold text-xs mb-3 outline-none"><option v-for="(type, idx) in CARD_TYPES" :key="type.id" :value="idx">{{ type.name }}</option></select>
            <div class="text-[11px] text-neutral-500 bg-neutral-50 dark:bg-neutral-800 p-2.5 rounded-xl flex flex-col gap-1">
              <div class="flex justify-between"><span>기본 1칸:</span><strong class="text-blue-600">{{ formatNum(selectedCard.baseAP[3]) }}</strong></div>
              <div class="flex justify-between" v-if="selectedCard.lockAP[4] > 0"><span>4칸 잠금:</span><strong class="text-red-500">{{ formatNum(selectedCard.lockAP[4]) }}</strong></div>
            </div>
          </div>
          
          <div class="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-2xl p-4 text-white shadow-xl shrink-0">
            <div class="flex justify-between items-center mb-3"><div class="font-extrabold text-sm flex items-center gap-1.5"><Calculator class="w-4 h-4 text-green-400"/> 영수증</div><RefreshCw @click="resetCareerSim" class="w-3.5 h-3.5 text-neutral-400 hover:text-white cursor-pointer transition-colors"/></div>
            <div class="space-y-2.5 text-sm">
              <div class="flex justify-between items-center"><span class="text-neutral-400 text-xs">스핀 횟수</span><span class="font-bold">{{ formatNum(apSpinCount) }}회</span></div>
              <div class="flex justify-between items-center"><span class="text-neutral-400 text-xs">소모 AP</span><span class="font-black text-yellow-400 text-base">{{ formatNum(totalApSpent) }}</span></div>
              <div class="flex justify-between items-center pt-2 border-t border-neutral-700 text-xs">
                <span class="text-neutral-400">소모 CASH</span><span class="font-bold text-purple-400">{{ formatNum(totalCashSpent) }}💎 (갱신 {{ specialSpinCount }}회)</span>
              </div>
            </div>
          </div>

          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm shrink-0">
            <h3 class="font-extrabold text-xs flex items-center gap-1.5 mb-2 pb-1.5 border-b border-neutral-100 dark:border-neutral-800"><Edit3 class="w-3.5 h-3.5 text-blue-500"/> 내 상태 인게임 동기화 (수동 변경)</h3>
            <div class="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
              <div v-for="(slot, i) in [...slots, specialSlot]" :key="i" class="flex gap-1 bg-neutral-50 dark:bg-neutral-800 p-1 rounded-lg border border-neutral-100 dark:border-neutral-700 items-center">
                <span class="w-5 text-[9px] font-bold text-center text-neutral-400">{{ slot.id === undefined ? '고정' : `S${slot.id+1}` }}</span>
                <select v-model="slot.tier" @change="validateStatVal(slot)" :disabled="slot.id === undefined" class="w-1/4 bg-white dark:bg-neutral-900 border rounded text-[10px] font-bold p-0.5 outline-none disabled:opacity-50 cursor-pointer">
                  <option v-for="(t, idx) in TIERS" :key="idx" :value="idx">{{t}}</option>
                </select>
                <select v-model="slot.optId" @change="validateStatVal(slot)" class="w-1/2 bg-white dark:bg-neutral-900 border rounded text-[10px] font-bold p-0.5 outline-none truncate cursor-pointer">
                  <option v-for="(opt, oIdx) in CURRENT_DATA" :key="oIdx" :value="oIdx" :disabled="slot.tier !== 3 && oIdx === 11">{{opt.name}}</option>
                </select>
                <select v-model.number="slot.statVal" class="w-1/4 bg-white dark:bg-neutral-900 border rounded text-[10px] font-bold p-0.5 outline-none text-blue-600 cursor-pointer text-center">
                  <option v-for="val in CURRENT_DATA[slot.optId].vals[slot.tier]" :key="val" :value="val">+{{val}}</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        <!-- [중앙] 세트 효과 & 시뮬레이션 슬롯 -->
        <section class="lg:col-span-5 flex flex-col gap-4">
          
          <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-4 flex items-center gap-3 shrink-0 overflow-x-auto min-h-[70px]">
            <span class="text-sm font-extrabold text-blue-700 dark:text-blue-400 shrink-0">적용된 세트:</span>
            <div v-for="(ef, i) in setEffects" :key="i" class="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap shadow-sm flex items-center gap-2">
              {{ ef.name }} {{ ef.count }}셋 <span class="bg-blue-900 text-yellow-300 px-2 py-0.5 rounded text-xs border border-blue-500">{{ ef.bonusStr }}</span>
            </div>
            <div v-if="setEffects.length === 0" class="text-xs text-neutral-400 font-medium">적용된 세트 효과가 없습니다. (3개 이상 일치 시 발동)</div>
          </div>

          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm flex-1 flex flex-col">
            <div class="space-y-3 flex-1 overflow-y-auto mb-4">
              <div class="p-3.5 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800/30 flex items-center justify-between gap-3">
                <div class="bg-red-500 text-white font-extrabold px-3 py-1.5 rounded-md text-xs shrink-0 shadow-sm">마스터 고정</div>
                <div class="flex-1 font-extrabold text-base sm:text-lg truncate text-neutral-800 dark:text-neutral-200 flex items-center justify-between pr-2">
                  <span class="text-yellow-600 dark:text-yellow-500">{{ CURRENT_DATA[specialSlot.optId].name }}</span>
                  <span class="text-yellow-600 dark:text-yellow-500">+{{ specialSlot.statVal }}</span>
                </div>
                <button @click="spinSpecialSlot" class="px-4 py-2 bg-red-600 hover:bg-red-700 transition-colors text-white text-sm font-bold rounded-lg shadow-sm shrink-0">갱신</button>
              </div>
              
              <div v-for="slot in slots" :key="slot.id" class="flex items-center gap-3 p-3 rounded-xl border transition-all" :class="slot.isLocked ? 'bg-neutral-100 dark:bg-neutral-800 opacity-60 border-neutral-300 dark:border-neutral-700' : 'bg-white dark:bg-neutral-900 border-purple-200 dark:border-purple-800/50'">
                <div :class="[TIER_BG[slot.tier], TIER_COLORS[slot.tier]]" class="w-16 text-center py-1.5 rounded-lg font-extrabold text-sm shadow-sm shrink-0 select-none">{{ TIERS[slot.tier] }}</div>
                <div class="flex-1 font-bold text-base sm:text-lg truncate text-neutral-800 dark:text-neutral-200 flex justify-between items-center pr-2" :class="{'text-yellow-600 dark:text-yellow-500': slot.tier === 3}">
                  <span>{{ CURRENT_DATA[slot.optId].name }}</span>
                  <span :class="slot.tier === 3 ? 'text-yellow-600 dark:text-yellow-500' : slot.tier === 2 ? 'text-pink-600 dark:text-pink-500' : slot.tier === 1 ? 'text-blue-600 dark:text-blue-500' : 'text-green-600 dark:text-green-500'">+{{ slot.statVal }}</span>
                </div>
                <button @click="toggleLock(slot.id)" class="p-2.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:text-black dark:hover:text-white transition-colors shrink-0 shadow-sm">
                  <Lock v-if="slot.isLocked" class="w-5 h-5 text-yellow-500" /><Unlock v-else class="w-5 h-5" />
                </button>
              </div>
            </div>

            <div class="flex gap-3 shrink-0 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <button @click="rollSlots" :disabled="isSpinning" class="w-1/2 py-3 bg-purple-600 hover:bg-purple-700 transition-colors text-white rounded-xl active:scale-95 flex flex-col items-center justify-center disabled:opacity-50 shadow-md">
                <span class="text-base font-extrabold flex items-center gap-1.5"><Zap class="w-5 h-5"/> 수동 변경 (1회)</span>
                <span class="text-xs font-medium text-purple-200">{{ formatNum(currentRollCostAP) }} AP 소모</span>
              </button>
              <button v-if="!isSpinning" @click="isAutoModalOpen = true" class="w-1/2 py-3 bg-neutral-800 hover:bg-black dark:bg-neutral-700 dark:hover:bg-neutral-600 transition-colors text-white font-extrabold rounded-xl flex items-center justify-center gap-2 text-base shadow-md">
                <Settings class="w-5 h-5"/> 자동 설정
              </button>
              <button v-else @click="stopAutoSpin" class="w-1/2 py-3 bg-red-500 hover:bg-red-600 text-white font-extrabold rounded-xl flex items-center justify-center gap-2 text-base shadow-md animate-pulse">
                <Pause class="w-5 h-5"/> 정지 (가챠중)
              </button>
            </div>
          </div>
        </section>

        <!-- [우측] 공간 낭비 없는 대화면 고정 기대값 계산기 (메모리 전략 포함) -->
        <section class="lg:col-span-4 flex flex-col h-full">
          <div class="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800/40 rounded-2xl p-5 shadow-sm flex-1 flex flex-col relative overflow-hidden">
            <h3 class="font-extrabold text-base flex items-center gap-2 mb-4 text-blue-700 dark:text-blue-400"><Target class="w-5 h-5"/> 커리어 목표 고정 기대값 계산기</h3>
            
            <div class="space-y-4 mb-4 flex-1">
              <div>
                <label class="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">어떤 목표를 계산할까요?</label>
                <select v-model="calcTargetGoal" class="w-full bg-white dark:bg-neutral-900 border border-blue-200 dark:border-blue-800 rounded-xl p-2.5 text-sm font-bold outline-none shadow-sm cursor-pointer">
                  <option value="5MASTER">목표: 잠금 없이 모든 슬롯 '마스터' 달성</option>
                  <option value="TARGET_SET">목표: 특정 옵션 N세트 달성 (잠금 비용 포함)</option>
                  <option value="TARGET_3_3">목표: 3-3 듀얼 세트 달성 (잠금 비용 포함)</option>
                </select>
              </div>

              <!-- 단일 세트 설정 -->
              <div v-if="calcTargetGoal === 'TARGET_SET'" class="flex gap-2 p-3 bg-white dark:bg-neutral-900 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm">
                <select v-model="calcTargetSetOptId" class="flex-1 bg-neutral-50 dark:bg-neutral-800 border-none rounded-lg p-2 text-[11px] font-bold outline-none truncate cursor-pointer">
                  <option v-for="(opt, i) in CURRENT_DATA" :key="i" :value="i">{{opt.name}}</option>
                </select>
                <select v-model="calcTargetSetCount" class="w-20 bg-neutral-50 dark:bg-neutral-800 border-none rounded-lg p-2 text-xs font-bold outline-none text-center cursor-pointer">
                  <option v-for="n in [3,4,5,6]" :key="n" :value="n">{{n}}세트</option>
                </select>
              </div>

              <!-- 3-3 세트 설정 -->
              <div v-if="calcTargetGoal === 'TARGET_3_3'" class="flex flex-col gap-2 p-3 bg-white dark:bg-neutral-900 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm">
                <div class="text-[11px] font-bold text-blue-600">첫 번째 3세트 목표</div>
                <select v-model="calcTarget3_3_Opt1" class="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-lg p-2 text-[11px] font-bold outline-none truncate cursor-pointer">
                  <option v-for="(opt, i) in CURRENT_DATA" :key="i" :value="i">{{opt.name}}</option>
                </select>
                <div class="text-[11px] font-bold text-pink-600 mt-1">두 번째 3세트 목표</div>
                <select v-model="calcTarget3_3_Opt2" class="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-lg p-2 text-[11px] font-bold outline-none truncate cursor-pointer">
                  <option v-for="(opt, i) in CURRENT_DATA" :key="i" :value="i">{{opt.name}}</option>
                </select>
              </div>

              <!-- 🌟 신규 추가: 승급 메모리 전략 체크박스 -->
              <div class="pt-2">
                <label class="flex items-start gap-2 p-3 bg-blue-100/50 dark:bg-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-800 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                  <input type="checkbox" v-model="useUpgradeMemory" class="mt-0.5 w-4 h-4 accent-blue-600">
                  <div class="flex flex-col">
                    <span class="text-sm font-extrabold text-blue-800 dark:text-blue-300">하위 등급 1칸 남을 시 '승급 메모리' 사용</span>
                    <span class="text-[11px] font-medium text-blue-600 dark:text-blue-400 mt-0.5 leading-relaxed">
                      상위 등급 슬롯의 막대한 스핀 비용을 절약하기 위해, 마지막 남은 하위 등급 1개는 잠금 없이 승급 메모리로 바로 올립니다.
                    </span>
                  </div>
                </label>
              </div>

            </div>

            <button @click="runExpectedValueCalc" :disabled="isCalculating" class="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold text-sm shadow-md transition-colors flex justify-center items-center gap-2 disabled:opacity-50 shrink-0">
              <BarChart class="w-5 h-5"/> 
              {{ isCalculating ? '정밀 시뮬레이션 계산 중...' : '기대값 및 소모량 계산하기' }}
            </button>

            <!-- 결과 출력창 -->
            <div v-if="calcResult" class="mt-4 p-4 bg-white dark:bg-neutral-900 rounded-xl border border-blue-200 dark:border-blue-800/50 shadow-inner shrink-0">
              <div class="text-center text-[11px] font-bold text-neutral-500 mb-3 border-b border-neutral-100 dark:border-neutral-800 pb-2">현재 상태를 기준으로 한 수학적 평균 도달치</div>
              
              <div class="flex justify-between items-center mb-2.5">
                <span class="text-sm font-bold text-neutral-700 dark:text-neutral-300">평균 스핀 횟수</span>
                <span class="text-lg font-black text-blue-600 dark:text-blue-400">{{ formatNum(calcResult.avgRolls) }} 회</span>
              </div>
              
              <div class="flex justify-between items-center mb-2.5">
                <span class="text-sm font-bold text-neutral-700 dark:text-neutral-300 flex flex-col">
                  <span>평균 소모 AP</span>
                  <span class="text-[10px] text-neutral-400 font-normal">5칸 동시 소모 비용 포함</span>
                </span>
                <span class="text-xl font-black text-yellow-500">{{ formatNum(calcResult.avgAp) }} AP</span>
              </div>
              
              <div v-if="calcTargetGoal !== '5MASTER'" class="flex justify-between items-center pt-2.5 border-t border-neutral-100 dark:border-neutral-800">
                <span class="text-sm font-bold text-neutral-700 dark:text-neutral-300 flex flex-col">
                  <span>평균 소모 CASH</span>
                  <span class="text-[10px] text-neutral-400 font-normal">잠금 페널티 비용</span>
                </span>
                <span class="text-lg font-black text-purple-500">{{ formatNum(calcResult.avgCash) }} 💎</span>
              </div>

              <!-- 메모리 사용 통계 -->
              <div v-if="useUpgradeMemory && (calcResult.memElite > 0.05 || calcResult.memPro > 0.05 || calcResult.memMaster > 0.05)" class="pt-2.5 mt-2.5 border-t border-blue-100 dark:border-blue-900/30 space-y-1">
                <div class="text-xs font-bold text-blue-500 mb-1.5">평균 필요 승급 메모리 (AP 절약용)</div>
                <div class="flex justify-between text-[11px]" v-if="calcResult.memElite > 0.05"><span class="text-neutral-500">엘리트 메모리</span><span class="font-bold text-blue-600">{{ calcResult.memElite.toFixed(1) }} 개</span></div>
                <div class="flex justify-between text-[11px]" v-if="calcResult.memPro > 0.05"><span class="text-neutral-500">프로 메모리</span><span class="font-bold text-pink-600">{{ calcResult.memPro.toFixed(1) }} 개</span></div>
                <div class="flex justify-between text-[11px]" v-if="calcResult.memMaster > 0.05"><span class="text-neutral-500">마스터 메모리</span><span class="font-bold text-yellow-600">{{ calcResult.memMaster.toFixed(1) }} 개</span></div>
              </div>
              
              <!-- 6세트나 3-3세트 시 스페셜 갱신 횟수 -->
              <div v-if="calcTargetGoal !== '5MASTER' && calcResult.specialRolls > 0" class="flex justify-between items-center pt-2.5 mt-2.5 border-t border-red-100 dark:border-red-900/30">
                <span class="text-sm font-bold text-red-500 flex flex-col">
                  <span>스페셜 갱신 횟수</span>
                  <span class="text-[10px] text-red-400 font-normal">목표 옵션 등장을 위한 평균치</span>
                </span>
                <span class="text-lg font-black text-red-500">{{ formatNum(calcResult.specialRolls) }} 회</span>
              </div>
            </div>
            
          </div>
        </section>

      </div>
    </div>
  </div>

  <!-- 🌟 자동 승급 모달 🌟 -->
  <div v-if="isAutoModalOpen" class="fixed inset-0 bg-black/60 z-[99999] flex items-center justify-center p-4 backdrop-blur-sm">
    <div class="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-[550px] overflow-hidden flex flex-col text-neutral-800 dark:text-neutral-200">
      <div class="bg-cyan-500 p-4 text-center text-white font-extrabold text-xl">자동 승급 옵션 설정</div>
      <div class="text-xs text-center p-2 text-neutral-500 bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">선택한 설정이 적용될 때까지 옵션 변경이 시도됩니다.</div>
      
      <div class="flex h-[380px]">
        <div class="w-[110px] bg-neutral-800 p-2 flex flex-col gap-1.5 shrink-0">
          <button @click="autoTab = 'SET'" class="py-3 text-sm font-bold text-white rounded-md transition-colors" :class="autoTab === 'SET' ? 'bg-cyan-500 shadow-md' : 'bg-neutral-700 hover:bg-neutral-600'">세트 도달</button>
          <button @click="autoTab = 'TIER'" class="py-3 text-sm font-bold text-white rounded-md transition-colors" :class="autoTab === 'TIER' ? 'bg-cyan-500 shadow-md' : 'bg-neutral-700 hover:bg-neutral-600'">등급 도달</button>
          <button @click="autoTab = 'OPT_MASTER'" class="py-3 text-sm font-bold text-white rounded-md transition-colors" :class="autoTab === 'OPT_MASTER' ? 'bg-cyan-500 shadow-md' : 'bg-neutral-700 hover:bg-neutral-600'">마스터</button>
          <button @click="autoTab = 'OPT_PRO'" class="py-3 text-sm font-bold text-white rounded-md transition-colors" :class="autoTab === 'OPT_PRO' ? 'bg-cyan-500 shadow-md' : 'bg-neutral-700 hover:bg-neutral-600'">프로</button>
          <button @click="autoTab = 'OPT_ELITE'" class="py-3 text-sm font-bold text-white rounded-md transition-colors" :class="autoTab === 'OPT_ELITE' ? 'bg-cyan-500 shadow-md' : 'bg-neutral-700 hover:bg-neutral-600'">엘리트</button>
          <button @click="autoTab = 'OPT_ROOKIE'" class="py-3 text-sm font-bold text-white rounded-md transition-colors" :class="autoTab === 'OPT_ROOKIE' ? 'bg-cyan-500 shadow-md' : 'bg-neutral-700 hover:bg-neutral-600'">루키</button>
        </div>
        
        <div class="flex-1 p-5 overflow-y-auto bg-white dark:bg-neutral-900">
          <div v-if="autoTab === 'SET'" class="space-y-6">
            <div>
              <h3 class="font-extrabold text-sm mb-3 text-cyan-600">몇 세트를 원하시나요? (고정옵션 포함)</h3>
              <div class="flex gap-4">
                <label v-for="n in [3,4,5,6]" :key="n" class="flex flex-col items-center gap-1.5 cursor-pointer">
                  <input type="radio" :value="n" v-model="autoTargetSetCount" class="w-5 h-5 accent-cyan-500">
                  <span class="text-sm font-bold">{{n}}개</span>
                </label>
              </div>
            </div>
            <div>
              <div class="flex justify-between items-center mb-3">
                <h3 class="font-extrabold text-sm text-cyan-600">원하는 세트 옵션 선택</h3>
                <label class="text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">
                  <input type="checkbox" @change="toggleAllOptsAuto(autoTargetSetOpts, 3)" :checked="autoTargetSetOpts.length === 12" class="accent-cyan-500">전체 선택
                </label>
              </div>
              <div class="space-y-1">
                <label v-for="(opt, i) in CURRENT_DATA" :key="i" class="flex items-center gap-2 p-2 rounded hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer border-b border-neutral-100 dark:border-neutral-800">
                  <input type="checkbox" :checked="autoTargetSetOpts.includes(i)" @change="toggleOptAuto(autoTargetSetOpts, i)" class="w-4 h-4 accent-cyan-500">
                  <span class="text-sm font-semibold">{{ opt.name }}</span>
                </label>
              </div>
            </div>
          </div>

          <div v-if="autoTab === 'TIER'" class="space-y-6">
            <div>
              <h3 class="font-extrabold text-sm mb-3 text-cyan-600">원하는 목표 등급 선택</h3>
              <select v-model="autoTargetTierTier" class="w-full p-2.5 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm font-bold bg-white dark:bg-neutral-800 outline-none">
                <option :value="3">마스터</option><option :value="2">프로</option><option :value="1">엘리트</option>
              </select>
            </div>
            <div>
              <h3 class="font-extrabold text-sm mb-3 text-cyan-600">해당 등급을 몇 개 띄울까요? (잠금 제외)</h3>
              <div class="flex gap-4">
                <label v-for="n in [1,2,3,4,5]" :key="n" class="flex flex-col items-center gap-1.5 cursor-pointer">
                  <input type="radio" :value="n" v-model="autoTargetTierCount" class="w-5 h-5 accent-cyan-500">
                  <span class="text-sm font-bold">{{n}}개</span>
                </label>
              </div>
            </div>
          </div>

          <div v-if="autoTab.startsWith('OPT_')" class="space-y-2 pb-4">
            <div class="flex justify-between items-center mb-3 sticky top-0 bg-white dark:bg-neutral-900 py-1 z-10">
              <span class="text-sm font-extrabold text-cyan-600">{{ autoTab === 'OPT_MASTER' ? '마스터' : autoTab === 'OPT_PRO' ? '프로' : autoTab === 'OPT_ELITE' ? '엘리트' : '루키' }} 옵션 선택</span>
              <label class="text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">
                <input type="checkbox" @change="toggleAllOptsAuto(autoTargetOptOpts, autoTab === 'OPT_MASTER' ? 3 : 0)" :checked="autoTargetOptOpts.length === (autoTab === 'OPT_MASTER' ? 12 : 11)" class="accent-cyan-500">전체 선택
              </label>
            </div>
            <label v-for="(opt, i) in CURRENT_DATA" :key="i" class="flex items-center gap-3 p-2 border-b border-neutral-100 dark:border-neutral-800 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors" :class="{'opacity-40 pointer-events-none': autoTab !== 'OPT_MASTER' && i === 11}">
              <input type="checkbox" :checked="autoTargetOptOpts.includes(i)" @change="toggleOptAuto(autoTargetOptOpts, i)" class="w-4 h-4 accent-cyan-500">
              <span class="text-sm font-bold">{{ opt.name }}</span>
            </label>
          </div>
        </div>
      </div>
      
      <div class="p-4 bg-neutral-100 dark:bg-neutral-800 flex justify-between items-center shrink-0 border-t border-neutral-200 dark:border-neutral-700">
        <button @click="isAutoModalOpen = false" class="px-6 py-2.5 text-sm font-bold bg-neutral-300 dark:bg-neutral-600 hover:bg-neutral-400 dark:hover:bg-neutral-500 rounded-lg transition-colors">취소</button>
        <button @click="startAutoSpin" class="px-10 py-2.5 text-base font-extrabold bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg shadow-md transition-colors">시작</button>
      </div>
    </div>
  </div>
</template>
