<script setup lang="ts">
import { ref, computed, watch, reactive, onMounted } from 'vue'
import { 
  Zap, RefreshCw, Star, Target, BarChart, Gem, Wallet, ShoppingCart, Lock, Package, Calendar, RotateCcw, Search
} from 'lucide-vue-next'

const activeTab = ref<'enhance' | 'career' | 'engraving' | 'dignity'>('dignity')

let ChartObj: any = null
onMounted(() => {
  if ((window as any).Chart) { ChartObj = (window as any).Chart } else {
    const script = document.createElement('script'); script.src = 'https://cdn.jsdelivr.net/npm/chart.js'; script.onload = () => { ChartObj = (window as any).Chart }; document.head.appendChild(script)
  }
})

// ==============================================
// [1] 강화 시뮬레이터 (압축)
// ==============================================
const BASE_PROBS=[1.0, 0.8, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.075, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05]; const FAIL_BONUS=0.025; const currentLevel=ref(0); const failStack=ref(0); const totalCardsUsed=ref(0); const logs=ref<any[]>([]); let logId=0
const currentRealProb=computed(()=>Math.min(1.0, (BASE_PROBS[currentLevel.value]||0.05) + failStack.value*FAIL_BONUS))
const tryEnhance=()=>{ if(currentLevel.value>=15)return; totalCardsUsed.value++; const success=Math.random()<=currentRealProb.value; logs.value.unshift({id:logId++, type:success?'success':'fail', from:currentLevel.value, to:success?currentLevel.value+1:currentLevel.value, prob:currentRealProb.value}); if(logs.value.length>50)logs.value.pop(); if(success){currentLevel.value++;failStack.value=0}else{failStack.value++} }
const resetEnhanceSim=()=>{currentLevel.value=0;failStack.value=0;totalCardsUsed.value=0;logs.value=[]}
const expectedValues=computed(()=>{ return BASE_PROBS.map(prob=>{ let exp=0, reach=1.0; for(let k=1;k<100;k++){ const cProb=Math.min(1.0, prob+(k-1)*FAIL_BONUS); exp+=k*reach*cProb; reach*=(1-cProb); if(reach<=0)break; }; return exp }) })
const calcStartLevel=ref(0); const calcTargetLevel=ref(15); const calculatedExpectedCards=computed(()=>{ let t=0; for(let i=calcStartLevel.value; i<calcTargetLevel.value; i++) t+=expectedValues.value[i]; return t })

// ==============================================
// [2] 커리어 시뮬레이터 (압축)
// ==============================================
const playerType=ref<'BATTER'|'PITCHER'>('BATTER'); const CARD_TYPES=[{id:0,name:'SEA, ASG, POS',baseAP:[1000,2000,10000,50000],lockAP:[0,30000,150000,500000,1000000],lockCash:[0,0,0,0,0]},{id:1,name:'TEAM, MMVP',baseAP:[10000,20000,50000,250000],lockAP:[0,50000,250000,900000,2000000],lockCash:[0,0,0,0,0]},{id:2,name:'ROY (신인왕)',baseAP:[30000,60000,150000,750000],lockAP:[0,50000,250000,900000,2000000],lockCash:[0,0,0,0,0]},{id:3,name:'HIT, ACE, GG, GGY',baseAP:[30000,60000,150000,750000],lockAP:[0,0,0,0,0],lockCash:[0,5,15,50,100]},{id:4,name:'TOP, DGN',baseAP:[40000,80000,200000,1000000],lockAP:[0,0,0,0,0],lockCash:[0,5,15,50,100]}]; const BATTER_OPTS=[{id:0,name:'전체 능력치 상승',setBonus:6,vals:[[2,3,4],[5,6,7],[8,9,10],[12,13,14]]},{id:1,name:'컨택트 능력치 상승',setBonus:25,vals:[[5,10,14],[19,23,28],[32,37,41],[46,50,55]]},{id:2,name:'홈런 능력치 상승',setBonus:25,vals:[[5,10,14],[19,23,28],[32,37,41],[46,50,55]]},{id:3,name:'삼진회피 능력치 상승',setBonus:25,vals:[[5,10,14],[19,23,28],[32,37,41],[46,50,55]]},{id:4,name:'선구 능력치 상승',setBonus:25,vals:[[5,10,14],[19,23,28],[32,37,41],[46,50,55]]},{id:5,name:'갭파워 능력치 상승',setBonus:25,vals:[[5,10,14],[19,23,28],[32,37,41],[46,50,55]]},{id:6,name:'지고 있을 시, 파워 상승',setBonus:50,vals:[[5,12,17],[22,29,34],[39,46,51],[56,63,68]]},{id:7,name:'안타 기록 시 파워 상승',setBonus:40,vals:[[3,5,9],[12,14,17],[20,22,26],[29,31,34]]},{id:8,name:'파워 높은 상대 시 파워 상승',setBonus:40,vals:[[7,14,22],[29,36,43],[49,56,65],[71,78,85]]},{id:9,name:'박빙(2점차) 파워 상승',setBonus:50,vals:[[5,11,16],[22,27,33],[38,43,49],[54,60,65]]},{id:10,name:'파워 낮은 상대 시 파워 상승',setBonus:40,vals:[[7,14,22],[29,36,43],[49,56,65],[71,78,85]]},{id:11,name:'★ 팀 컬러',setBonus:2,vals:[[0],[0],[0],[2]]}]; const PITCHER_OPTS=[{id:0,name:'전체 능력치 상승',setBonus:6,vals:[[2,3,4],[5,6,7],[8,9,10],[12,13,14]]},{id:1,name:'무브먼트 능력치 상승',setBonus:25,vals:[[5,10,14],[19,23,28],[32,37,41],[46,50,55]]},{id:2,name:'홈런억제 능력치 상승',setBonus:25,vals:[[5,10,14],[19,23,28],[32,37,41],[46,50,55]]},{id:3,name:'스터프 능력치 상승',setBonus:25,vals:[[5,10,14],[19,23,28],[32,37,41],[46,50,55]]},{id:4,name:'컨트롤 능력치 상승',setBonus:25,vals:[[5,10,14],[19,23,28],[32,37,41],[46,50,55]]},{id:5,name:'장타억제 능력치 상승',setBonus:25,vals:[[5,10,14],[19,23,28],[32,37,41],[46,50,55]]},{id:6,name:'지고 있을 시, 파워 상승',setBonus:50,vals:[[5,12,17],[22,29,34],[39,46,51],[56,63,68]]},{id:7,name:'삼진 기록 시 파워 상승',setBonus:6,vals:[[1,2,3],[3,5,7],[7,9,10],[10,12,14]]},{id:8,name:'파워 높은 상대 시 파워 상승',setBonus:40,vals:[[7,14,22],[29,36,43],[49,56,65],[71,78,85]]},{id:9,name:'박빙(2점차) 파워 상승',setBonus:50,vals:[[5,11,16],[22,27,33],[38,43,49],[54,60,65]]},{id:10,name:'파워 낮은 상대 시 파워 상승',setBonus:40,vals:[[7,14,22],[29,36,43],[49,56,65],[71,78,85]]},{id:11,name:'★ 팀 컬러',setBonus:2,vals:[[0],[0],[0],[2]]}]
const cData=computed(()=>playerType.value==='BATTER'?BATTER_OPTS:PITCHER_OPTS); const cIdx=ref(0); const cCard=computed(()=>CARD_TYPES[cIdx.value]); const cSlots=ref(Array.from({length:5},(_,i)=>({id:i,tier:0,optId:0,statVal:4,isLocked:false}))); const cSpec=ref({tier:3,optId:0,statVal:14}); const cAp=ref(0); const cCash=ref(0); const cSpin=ref(0); const cSpecSpin=ref(0); const rollOpt=(tier:number)=>{const isM=tier===3; let r=Math.random()*(isM?34:33), o=0; for(let i=0;i<12;i++){if(!isM&&i===11)continue; r-=(i===11)?1:3; if(r<0){o=i;break}}; const vs=cData.value[o].vals[tier]; return{optId:o, statVal:vs[Math.floor(Math.random()*vs.length)]}}; const doRoll=()=>{const lC=cSlots.value.filter(s=>s.isLocked).length; if(lC===5)return; let ap=cCard.value.lockAP[lC], cash=cCard.value.lockCash[lC]; cSlots.value.forEach(s=>{ap+=cCard.value.baseAP[s.tier]; if(!s.isLocked){if(s.tier<3&&Math.random()<0.01)s.tier++; const r=rollOpt(s.tier); s.optId=r.optId; s.statVal=r.statVal}}); cAp.value+=ap; cCash.value+=cash; cSpin.value++}; const doSpecRoll=()=>{const r=rollOpt(3); cSpec.value.optId=r.optId; cSpec.value.statVal=r.statVal; cSpecSpin.value++}; const resetCareer=()=>{cAp.value=0;cCash.value=0;cSpin.value=0;cSpecSpin.value=0;cSlots.value.forEach(s=>{s.tier=0;s.isLocked=false;s.optId=0;s.statVal=cData.value[0].vals[0][0]});cSpec.value.optId=0;cSpec.value.statVal=cData.value[0].vals[3][2]}; const setEffects=computed(()=>{const cnts:Record<number,number>={}; cSlots.value.forEach(s=>cnts[s.optId]=(cnts[s.optId]||0)+1); cnts[cSpec.value.optId]=(cnts[cSpec.value.optId]||0)+1; return Object.entries(cnts).filter(([_,c])=>c>=3).map(([id,c])=>{const d=cData.value[Number(id)]; return{name:d.name, count:c, str:`+${d.setBonus*c}`}}) })

// ==============================================
// [3] 각인 시뮬레이터 (압축)
// ==============================================
const eType=ref<'BATTER'|'PITCHER'>('BATTER'); const eState=reactive({ap:0,cash:0,legUsed:0,core:0,ref:0,conv:0,gacha:15}); const eCard=ref<any>(null); const eLogs=ref<any[]>([{id:0,msg:"준비 완료",type:'normal'}]); let eLId=1; const eLog=(msg:string,type:string='normal')=>{eLogs.value.unshift({id:eLId++,msg,type}); if(eLogs.value.length>30)eLogs.value.pop()}; const eSubB=[{n:'전체',u:[3,5,1,3],l:[2,3,1,2]},{n:'컨택트/무브먼트',u:[15,20,5,10],l:[10,15,5,8]}]; const drawLeg=()=>{eCard.value={g:'legend',lvl:0,rc:0,subs:[{n:'옵션1',b:10,bn:0,em:5,ex:8}]}; eLog('레전드 각인 획득','action')}; const drawUlt=()=>{eCard.value={g:'ultimate',lvl:0,rc:0,subs:[{n:'옵션1',b:15,bn:0,em:5,ex:10}]}; eLog('얼티밋 각인 획득','action')}; const eEnh=()=>{if(!eCard.value||eCard.value.lvl>=5)return; eCard.value.lvl++; eState.core+=100; eLog(`강화+${eCard.value.lvl} 성공!`, 'success')}; const eReset=()=>{if(!eCard.value||eCard.value.rc>=3||eCard.value.lvl===0)return; eCard.value.lvl=0; eCard.value.rc++; eState.cash+=100; eLog('강화 초기화', 'fail')}

// ==============================================
// 💎 [4] 디그니티 시뮬레이터 (인게임 완벽 고증)
// ==============================================
const TEAMS = ['kia', 'ssg', 'kiwoom', 'samsung', 'doosan', 'lg', 'hanwha', 'lotte', 'hyundai', 'kt', 'sbw', 'nc']
const T_NAMES: Record<string, string> = { kia:'KIA', ssg:'SSG', kiwoom:'키움', samsung:'삼성', doosan:'두산', lg:'LG', hanwha:'한화', lotte:'롯데', hyundai:'현대', kt:'KT', sbw:'쌍방울', nc:'NC' }
const T_COLORS: Record<string, string> = { kia:'text-red-600', ssg:'text-red-500', kiwoom:'text-rose-800', samsung:'text-blue-600', doosan:'text-indigo-800', lg:'text-pink-600', hanwha:'text-orange-500', lotte:'text-cyan-800', hyundai:'text-green-600', kt:'text-black dark:text-white', sbw:'text-yellow-600', nc:'text-blue-400' }

// 1~5차 디그니티 실명
const D_WAVES: Record<number, Record<string, string>> = {
  1: { kia:'홍현우', ssg:'최정', kiwoom:'이택근', samsung:'양준혁', doosan:'박건우', lg:'류지현', hanwha:'장종훈', lotte:'이대호', hyundai:'박재홍', kt:'강백호', sbw:'박노준', nc:'나성범' },
  2: { kia:'이종범', nc:'테임즈', hyundai:'심정수', samsung:'구자욱', sbw:'김기태', doosan:'김동주', lg:'박용택', hanwha:'김태균', kiwoom:'박병호', lotte:'조성환', kt:'로하스', ssg:'박경완' },
  3: { hanwha:'폰세', ssg:'앤더슨', nc:'페디', kia:'네일', samsung:'밴덴헐크', lotte:'스트레일리', doosan:'린드블럼', hyundai:'임선동', lg:'소사', sbw:'김원형', kt:'데스파이네', kiwoom:'나이트' },
  4: { samsung:'오승환', sbw:'조규제', ssg:'박희수', doosan:'정재훈', kia:'임에렉', kt:'김재윤', hyundai:'정명원', kiwoom:'손승락', hanwha:'박정진', nc:'임창민', lotte:'손승락', lg:'김용수' },
  5: { kt:'안현민', kiwoom:'강정호', lotte:'호식', doosan:'김현수', kia:'김도영', lg:'오스틴', ssg:'정근우', hyundai:'브로빈', samsung:'이승엽', hanwha:'송지만', nc:'박민우', sbw:'최태원' }
}

// 212명 전체 TOP 카드 DB
const TOP_DB: Record<string, string[]> = {
  kia: ['선동열', '이종범', '홍현우', '윤석민', '장성호', '이강철', '김성한', '조계현', '최형우', '양현종', '이순철', '이범호', '안치홍', '김선빈', '임에렉', '나성범', '김정수', '유동훈', '장채근'],
  ssg: ['최정', '김광현', '박희수', '에레디아', '정근우', '이진영', '브레띵', '정우람', '이승호', '채병용', '박재홍', '박경완', '이호준', '로맥', '켈리', '정대현', '김재현', '이재원', '박종훈'],
  kiwoom: ['이블렉', '안우진', '강정호', '박병호', '송성문', '서건창', '요키시', '김혜성', '김블렉', '이택근', '유한준', '브리검', '밴헤켄', '최원태', '조상우', '손승락', '한현희', '박동원'],
  samsung: ['오승환', '장효조', '양준혁', '이만수', '최형우', '이승엽', '구자욱', '김시진', '박석민', '김성래', '김일융', '박한이', '배영수', '강민호', '김상엽', '원태인', '김현욱', '권혁', '류중일'],
  doosan: ['양의지', '김현수', '김동주', '김상진', '박철순', '박명환', '니퍼트', '정재훈', '심정수', '김재환', '김경원', '박종훈', '박건우', '우준', '안경현', '홍성흔', '장원준', '김재호', '진필중'],
  lg: ['이병규', '이상훈', '오스틴', '김현수', '류지현', '켈리', '김동수', '김재현', '김태원', '박용택', '정성훈', '고우석', '임찬규', '윌슨', '이진영', '오지환', '김상훈', '김용수', '봉중근'],
  hanwha: ['이정훈', '정민철', '류현진', '장종훈', '김태균', '한용덕', '구대성', '데임병수', '이범호', '송진우', '이영우', '한희민', '송지만', '정근우', '정우람', '이강돈', '박정진', '강석천', '유승안'],
  lotte: ['최동원', '이대호', '호식', '주형광', '박정태', '손아섭', '마해영', '윤학길', '손민한', '전준우', '전준호', '황재균', '김용희', '강민호', '홍성흔', '박세웅', '강상수', '박석진', '임경완'],
  hyundai: ['심정수', '박재홍', '최창호', '김수경', '브로빈', '정민태', '박종호', '박정현', '전준호', '이숭용', '정성훈', '박경완', '박진만', '김동기', '정명원', '조웅천', '장명부', '조용준', '김경기'],
  kt: ['로하스', '쿠에바스', '소형준', '강백호', '김재윤', '엄상백', '고영표', '유한준', '황재균', '박영현', '피어밴드', '장성우', '박경수', '주권', '배정대'],
  sbw: ['김기태', '조규제', '조원우', '최태원', '김광림', '성영재', '김현욱', '김원형', '박경완', '심성보', '박성기', '김기덕'],
  nc: ['테이준', '양의지', '박건우', '박민우', '해커', '루친스키', '구창모', '나성범', '이재학', '원종현', '김진성', '임창민', '박석민', '김주원', '노진혁']
}
const ALL_TOPS = Object.entries(TOP_DB).flatMap(([t, players]) => players.map(p => ({ team: t, name: p })))

// 상태 관리
const dState = reactive({
  time: { month: 1 },
  myTeam: 'kia',
  targetWave: 5,
  inv: { normal: 0, pickup: 0, tickets: 0, myDgn: 0, myTop: 0, otherTop: 0 },
  album: Object.fromEntries(TEAMS.map(t => [t, 0])),
  topAlbum: Object.fromEntries(TEAMS.map(t => [t, Object.fromEntries(TOP_DB[t].map(p => [p, 0]))])),
  shop: { quest: 0, cash: 0, rookie: 0, prestige: 0, pickup: 0, pro: 0, legend: 0 },
  payback: { spent: 0, t1: false, t2: false, t3: false, t4: false, inf: 0 },
  pity: { pack: 0, trade: 0 },
  logs: [] as { id: number, msg: string, type: string }[]
})
let dLId = 0
const dLog = (msg: string, type: 'normal'|'success'|'fail'|'action'|'epic' = 'normal') => { dState.logs.unshift({ id: dLId++, msg, type }); if(dState.logs.length > 50) dState.logs.pop() }

// 전체 싹 밀기 (리셋)
const fullReset = () => {
  if(!confirm("모든 시뮬레이션 데이터(인벤토리, 도감, 시간, 스택)를 0으로 초기화하시겠습니까?")) return
  dState.time.month = 1; dState.inv = { normal: 0, pickup: 0, tickets: 0, myDgn: 0, myTop: 0, otherTop: 0 }
  TEAMS.forEach(t => dState.album[t] = 0)
  TEAMS.forEach(t => TOP_DB[t].forEach(p => dState.topAlbum[t][p] = 0))
  dState.shop = { quest: 0, cash: 0, rookie: 0, prestige: 0, pickup: 0, pro: 0, legend: 0 }
  dState.payback = { spent: 0, t1: false, t2: false, t3: false, t4: false, inf: 0 }
  dState.pity = { pack: 0, trade: 0 }; dState.logs = []
  dLog(`[시스템] 우주가 재창조되었습니다. 모든 데이터가 0으로 리셋되었습니다.`, 'action')
}

// 다음 달로 가기 (시간 진행 & 상점 초기화)
const nextMonth = () => {
  dState.time.month++
  dState.shop = { quest: 0, cash: 0, rookie: 0, prestige: 0, pickup: 0, pro: 0, legend: 0 }
  dState.payback = { spent: 0, t1: false, t2: false, t3: false, t4: false, inf: 0 }
  dLog(`[시간 흐름] 🗓️ ${dState.time.month}개월 차가 되었습니다. 상점 및 페이백이 초기화되었습니다.`, 'action')
}

// 도감 탭 (디그니티 vs TOP)
const albumTab = ref<'dignity'|'top'>('dignity')

watch(() => dState.targetWave, () => { TEAMS.forEach(t => dState.album[t] = 0); dLog(`[시스템] ${dState.targetWave}차 도감으로 전환되었습니다.`, 'action') })
const dupeDignityCount = computed(() => { let c=0; TEAMS.forEach(t=>{if(t!==dState.myTeam && dState.album[t]>1) c+=dState.album[t]-1}); return c })

// 페이백 처리
const processPayback = () => {
  const k = dState.payback.spent; const p = dState.payback
  if (k >= 9900 && !p.t1) { p.t1 = true; dState.inv.normal++; dLog(`[페이백] 9,900원 누적! 일반팩 1개 지급`, 'success') }
  if (k >= 99000 && !p.t2) { p.t2 = true; dState.inv.pickup++; dLog(`[페이백] 99,000원 누적! 픽업팩 1개 지급`, 'success') }
  if (k >= 199000 && !p.t3) { p.t3 = true; dState.inv.normal++; dLog(`[페이백] 199,000원 누적! 일반팩 1개 지급`, 'success') }
  if (k >= 299000 && !p.t4) { p.t4 = true; dState.inv.normal++; dLog(`[페이백] 299,000원 누적! 일반팩 1개 지급`, 'success') }
  let nextInf = (p.inf + 1) * 300000
  while (k >= nextInf) { p.inf++; dState.inv.tickets += 9; dLog(`[무한 페이백] 30만원 당첨! 트레이드권 9개 지급! (${p.inf}회차)`, 'epic'); nextInf = (p.inf + 1) * 300000 }
}
const addManualPayback = () => { dState.payback.spent += 300000; dLog(`[수동 충전] 타 패키지로 30만원 채움 처리 완료!`, 'action'); processPayback() }
const buyPkg = (key: keyof typeof dState.shop, limit: number, price: number, n: number, p: number, t: number, name: string) => {
  if (dState.shop[key] >= limit) return alert("이번 달 구매 가능 횟수를 모두 소진했습니다.")
  dState.shop[key]++; dState.payback.spent += price; dState.inv.normal += n; dState.inv.pickup += p; dState.inv.tickets += t
  dLog(`[상점] ${name} 구매 완료! (-${price}원)`, 'action'); processPayback()
}

// 가챠 & 믹서기
const openPack = (count: number) => {
  if (dState.inv.normal < count) return alert("일반팩이 부족합니다.")
  dState.inv.normal -= count; dState.inv.tickets += (count * 2)
  for (let i=0; i<count; i++) {
    for (let j=0; j<8; j++) {
      if (Math.random() < 0.03) {
        let t = TEAMS[Math.floor(Math.random()*12)], pn = D_WAVES[dState.targetWave][t]
        if (t === dState.myTeam) { dState.inv.myDgn++; dLog(`✨[기적] 디그니티팩에서 자팀 ${pn} 등장!✨`, 'epic') } 
        else { dState.album[t]++; dLog(`[획득] ${T_NAMES[t]} ${pn} 디그니티 획득!`, 'success') }
      } else {
        let top = ALL_TOPS[Math.floor(Math.random()*212)]
        if (top.team === dState.myTeam) { dState.inv.myTop++; dState.topAlbum[top.team][top.name]++; dLog(`[TOP보호] 자팀 TOP ${top.name} 자동 수집!`, 'normal') } 
        else { dState.inv.otherTop++; dState.topAlbum[top.team][top.name]++ }
      }
    }
    dState.pity.pack++; if(dState.pity.pack % 50 === 0) { dState.inv.myDgn++; dLog(`🎉[팩 천장] 50회 누적! 자팀 디그니티 확정!`, 'epic') }
  }
}
const openPickup = () => {
  if (dState.inv.pickup < 1) return alert("픽업팩이 부족합니다.")
  dState.inv.pickup--; let t = TEAMS[Math.floor(Math.random()*12)], pn = D_WAVES[dState.targetWave][t]
  if (t === dState.myTeam) { dState.inv.myDgn++; dLog(`✨[픽업] 자팀 ${pn} 100% 확정 등장!✨`, 'epic') } 
  else { dState.album[t]++; dLog(`[픽업] ${T_NAMES[t]} ${pn} 획득.`, 'success') }
}
const runMixer = () => {
  let cnt=0
  while (true) {
    let dupes = []; TEAMS.forEach(t => { if(t !== dState.myTeam) { let c = dState.album[t]; while(c>1){ dupes.push(t); c-- } } })
    if (dupes.length >= 3 && dState.inv.tickets >= 1) {
      dState.album[dupes[0]]--; dState.album[dupes[1]]--; dState.album[dupes[2]]--; dState.inv.tickets--; dState.inv.myDgn++; dState.pity.trade++; cnt++
      dLog(`[믹서기] 디그니티 트레이드 ➔ 자팀 디그니티 확정!`, 'epic')
      if (dState.pity.trade % 30 === 0) { dState.inv.myDgn++; dLog(`🎉[트레이드 천장] 30회 마일리지 자팀 확정!`, 'epic') }
    } else break;
  }
  while (true) {
    if (dState.inv.otherTop >= 3 && dState.inv.tickets >= 1) {
      dState.inv.otherTop -= 3; dState.inv.tickets--; cnt++
      // 타팀 TOP 도감에서 랜덤하게 3장 감소 로직 (생략: UI상 수량 표기를 위해 otherTop 숫자만 감소하고 도감 누적은 유지함)
      if (Math.random() < 0.03) {
        let t = TEAMS[Math.floor(Math.random()*12)], pn = D_WAVES[dState.targetWave][t]
        if (t === dState.myTeam) { dState.inv.myDgn++; dLog(`🔥[TOP 3% 기적] 자팀 ${pn} 디그니티 획득!`, 'epic') } 
        else { dState.album[t]++; dLog(`🔥[TOP 3% 기적] ${T_NAMES[t]} ${pn} 획득!`, 'success') }
      } else {
        let top = ALL_TOPS[Math.floor(Math.random()*212)]
        if (top.team === dState.myTeam) { dState.inv.myTop++; dState.topAlbum[top.team][top.name]++ } else { dState.inv.otherTop++; dState.topAlbum[top.team][top.name]++ }
      }
    } else break;
  }
  if(cnt===0) alert("재료(중복 디그니티 3장 또는 타팀 TOP 3장) 또는 티켓이 부족합니다.")
}

// 기댓값 계산기 (과금 플래너)
const simPlan = reactive({ wQ:true, wC:10, rk:0, pt:0, pk:0, pr:0, lg:0, target:3 })
const simResult = ref<any>(null); const isSim = ref(false)
const runPlanner = () => {
  isSim.value = true; setTimeout(() => {
    let costPerMonth = (simPlan.wC*500*4) + simPlan.rk*55000 + simPlan.pt*99000 + simPlan.pk*99000 + simPlan.pr*99000 + simPlan.lg*149000
    let nPerMonth = (simPlan.wQ?4:0) + simPlan.rk*1 + simPlan.pt*3 + simPlan.pr*2 + simPlan.lg*2
    let pPerMonth = simPlan.pk*2 + simPlan.lg*1
    let tPerMonth = (simPlan.wC*4) + simPlan.rk*20 + simPlan.pt*10 + simPlan.pr*10
    if(costPerMonth===0 && nPerMonth===0 && pPerMonth===0 && tPerMonth===0) { isSim.value=false; return alert("구매 패턴을 하나라도 설정해주세요.") }

    let totalMonthsRequired = 0, successHits = 0, iter = 2000
    for(let i=0; i<iter; i++) {
      let myDgn = 0, mTop = 0, oTop = 0, pPack = 0, pTrade = 0, tkt = 0, month = 0, krw = 0, inf = 0
      let alb = Object.fromEntries(TEAMS.map(t=>[t,0]))
      while(myDgn < simPlan.target) {
        month++; krw += costPerMonth; let mn = nPerMonth, mp = pPerMonth
        if(krw >= 9900) mn++; if(krw >= 99000) mp++; if(krw >= 199000) mn++; if(krw >= 299000) mn++
        let nextI = (inf+1)*300000; while(krw >= nextI) { inf++; tkt+=9; nextI=(inf+1)*300000 }
        tkt += tPerMonth
        for(let k=0; k<mp; k++) { let t=TEAMS[Math.floor(Math.random()*12)]; if(t===dState.myTeam) myDgn++; else alb[t]++ }
        for(let k=0; k<mn; k++) {
          tkt+=2
          for(let j=0; j<8; j++) { if(Math.random()<0.03){let t=TEAMS[Math.floor(Math.random()*12)]; if(t===dState.myTeam) myDgn++; else alb[t]++} else { if(Math.random()<(TOP_DB[dState.myTeam].length/212)) mTop++; else oTop++ } }
          pPack++; if(pPack%50===0) myDgn++
        }
        while(true) {
          let dp = []; TEAMS.forEach(t=>{if(t!==dState.myTeam){let c=alb[t]; while(c>1){dp.push(t);c--}}})
          if(dp.length>=3 && tkt>=1) { alb[dp[0]]--; alb[dp[1]]--; alb[dp[2]]--; tkt--; myDgn++; pTrade++; if(pTrade%30===0) myDgn++ }
          else if(oTop>=3 && tkt>=1) { oTop-=3; tkt--; if(Math.random()<0.03){let t=TEAMS[Math.floor(Math.random()*12)]; if(t===dState.myTeam) myDgn++; else alb[t]++} else { if(Math.random()<(TOP_DB[dState.myTeam].length/212)) mTop++; else oTop++ } }
          else break
        }
        if(month > 120) break // 10년 넘어가면 컷
      }
      totalMonthsRequired += month; successHits++
    }
    let avgM = totalMonthsRequired / iter; let w = Math.round((avgM % 1) * 4)
    simResult.value = { month: Math.floor(avgM), week: w, cost: new Intl.NumberFormat().format(Math.floor(avgM * costPerMonth)) }
    isSim.value = false
  }, 50)
}
</script>

<template>
  <div class="w-full mx-auto px-2 sm:px-4 py-4 font-sans text-neutral-900 dark:text-neutral-100 flex flex-col min-h-screen">
    
    <!-- 통합 탭 네비게이션 -->
    <div class="flex justify-center shrink-0 mb-4">
      <div class="bg-neutral-800 p-1.5 rounded-xl shadow-sm flex gap-1">
        <button @click="activeTab='dignity'" class="px-6 py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center gap-2" :class="activeTab==='dignity'?'bg-amber-600 text-white':'text-neutral-400 hover:bg-neutral-700'"><Gem class="w-4 h-4"/>디그니티 시뮬레이터</button>
        <button @click="activeTab='engraving'" class="px-6 py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center gap-2" :class="activeTab==='engraving'?'bg-amber-500 text-white':'text-neutral-400 hover:bg-neutral-700'"><Gem class="w-4 h-4"/>각인 시뮬레이터</button>
        <button @click="activeTab='enhance'" class="px-6 py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center gap-2" :class="activeTab==='enhance'?'bg-blue-600 text-white':'text-neutral-400 hover:bg-neutral-700'"><Zap class="w-4 h-4"/>강화 시뮬레이터</button>
        <button @click="activeTab='career'" class="px-6 py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center gap-2" :class="activeTab==='career'?'bg-purple-600 text-white':'text-neutral-400 hover:bg-neutral-700'"><Star class="w-4 h-4"/>커리어 시뮬레이터</button>
      </div>
    </div>

    <!-- 1️⃣ 강화 탭 -->
    <div v-show="activeTab==='enhance'" class="flex flex-col max-w-4xl mx-auto gap-4 animate-fade-in w-full">
      <div class="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 flex justify-between items-center text-white">
        <div><div class="text-sm text-neutral-400 font-bold mb-1">현재 레전드 카드 등급</div><div class="text-4xl font-black">{{ currentLevel === 15 ? 'MAX' : '+'+currentLevel }}</div></div>
        <div class="text-right"><div class="text-sm text-neutral-400 font-bold mb-1">성공 확률</div><div class="text-3xl font-black text-blue-400">{{ (currentRealProb*100).toFixed(1) }}%</div></div>
        <button @click="tryEnhance" class="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold text-lg transition-transform active:scale-95 text-white">강화 시도</button>
      </div>
      <div class="bg-neutral-900 p-4 rounded-xl border border-neutral-800 h-64 overflow-y-auto">
        <div v-for="l in logs" :key="l.id" :class="l.type==='success'?'text-green-400':'text-red-400'" class="font-mono text-sm mb-1">> [{{ l.type==='success'?'성공':'실패' }}] +{{ l.from }} ➔ +{{ l.to }} (확률: {{ (l.prob*100).toFixed(1) }}%)</div>
      </div>
    </div>

    <!-- 2️⃣ 커리어 탭 -->
    <div v-show="activeTab==='career'" class="flex flex-col max-w-4xl mx-auto gap-4 animate-fade-in w-full">
      <div class="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 text-white">
        <div class="flex gap-2 mb-4"><button @click="playerType='BATTER'" class="px-4 py-2 rounded-lg font-bold" :class="playerType==='BATTER'?'bg-purple-600':'bg-neutral-700'">타자</button><button @click="playerType='PITCHER'" class="px-4 py-2 rounded-lg font-bold" :class="playerType==='PITCHER'?'bg-purple-600':'bg-neutral-700'">투수</button></div>
        <div class="grid grid-cols-5 gap-2">
          <div v-for="s in cSlots" :key="s.id" class="p-3 bg-neutral-800 rounded-lg text-center cursor-pointer hover:bg-neutral-700 border" :class="s.isLocked?'border-red-500':'border-transparent'" @click="s.isLocked=!s.isLocked">
            <div class="text-xs mb-2">{{ ['루키','엘리트','프로','마스터'][s.tier] }}</div><div class="text-[10px] font-bold text-neutral-400 mb-1 h-8">{{ cData[s.optId]?.name }}</div><div class="font-black text-purple-400">+{{ s.statVal }}</div>
          </div>
        </div>
        <div class="mt-4 flex gap-4"><button @click="doRoll" class="flex-1 py-3 bg-purple-600 rounded-xl font-bold">일반 슬롯 돌리기</button><button @click="doSpecRoll" class="flex-1 py-3 bg-pink-600 rounded-xl font-bold">특수 슬롯 돌리기</button></div>
      </div>
    </div>

    <!-- 3️⃣ 각인 탭 -->
    <div v-show="activeTab==='engraving'" class="flex flex-col max-w-4xl mx-auto gap-4 animate-fade-in w-full">
      <div class="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 text-white flex justify-between items-center">
        <div class="flex gap-2"><button @click="drawLeg" class="px-4 py-2 bg-amber-600 rounded-lg font-bold">레전드 뽑기</button><button @click="drawUlt" class="px-4 py-2 bg-rose-600 rounded-lg font-bold">얼티밋 뽑기</button></div>
        <div class="flex gap-2"><button @click="eEnh" class="px-4 py-2 bg-blue-600 rounded-lg font-bold">각인 강화</button><button @click="eReset" class="px-4 py-2 bg-red-600 rounded-lg font-bold">초기화</button></div>
      </div>
      <div v-if="eCard" class="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 text-white grid grid-cols-2 gap-4">
        <div><div class="text-2xl font-black text-amber-400 mb-2">[{{ eCard.g==='ultimate'?'얼티밋':'레전드' }}] {{ eCard.mainName }} +{{ eCard.lvl }}</div><div class="text-lg">메인스탯: {{ eCard.mainBase + eCard.mainBonus }}</div></div>
        <div class="space-y-2"><div v-for="(s, i) in eCard.subs" :key="i" class="p-2 bg-neutral-800 rounded">[{{ i+1 }}] {{ s.name }}: +{{ s.base + s.bonus }}</div></div>
      </div>
    </div>

    <!-- 💎 4️⃣ 디그니티 탭 -->
    <div v-show="activeTab==='dignity'" class="grid grid-cols-1 xl:grid-cols-12 gap-5 w-full animate-fade-in max-w-[1600px] mx-auto">
      
      <!-- [좌측] 상점 & 설정 -->
      <section class="xl:col-span-3 flex flex-col gap-4 h-full">
        <div class="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex justify-between items-center text-white shrink-0">
          <div class="font-black text-lg flex items-center gap-2"><Calendar class="w-5 h-5 text-amber-500"/> {{ dState.time.month }}개월 차</div>
          <div class="flex gap-2">
            <button @click="fullReset" class="p-2 bg-red-900/50 hover:bg-red-800 rounded-lg text-red-300" title="우주 리셋"><RotateCcw class="w-4 h-4"/></button>
            <button @click="nextMonth" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg font-bold text-xs transition-colors">다음 달 가기 (초기화)</button>
          </div>
        </div>

        <div class="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shrink-0">
          <h3 class="font-extrabold text-sm mb-3 flex items-center gap-1.5 text-blue-400"><Target class="w-4 h-4"/> 타겟팅 설정</h3>
          <div class="space-y-3">
            <div><label class="text-[10px] font-bold text-neutral-500 block mb-1">내 구단 선택</label><select v-model="dState.myTeam" class="w-full bg-neutral-800 border-none rounded p-2 text-sm font-bold outline-none text-white"><option v-for="t in TEAMS" :key="t" :value="t">{{ T_NAMES[t] }}</option></select></div>
            <div><label class="text-[10px] font-bold text-neutral-500 block mb-1">목표 디그니티 차수 (Wave)</label><select v-model.number="dState.targetWave" class="w-full bg-neutral-800 border-none rounded p-2 text-sm font-bold text-amber-500 outline-none"><option v-for="n in 5" :key="n" :value="n">{{ n }}st ({{ D_WAVES[n][dState.myTeam] }})</option></select></div>
            <div class="text-[10px] text-neutral-400 bg-neutral-800 p-2 rounded">해당 구단 TOP 카드 생태계: <span class="text-blue-400 font-bold">{{ TOP_DB[dState.myTeam].length }} / 212 장</span></div>
          </div>
        </div>

        <div class="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex-1 flex flex-col overflow-hidden">
          <div class="flex justify-between items-center mb-2"><h3 class="font-extrabold text-sm text-green-400"><Wallet class="w-4 h-4 inline-block mr-1"/> 월간 누적 페이백</h3></div>
          <div class="text-2xl font-black text-green-400 mb-2">{{ new Intl.NumberFormat().format(dState.payback.spent) }} <span class="text-xs text-neutral-500">원</span></div>
          <div class="space-y-1 mb-3">
            <div class="flex justify-between text-[10px] p-1.5 rounded" :class="dState.payback.t1?'bg-green-900/30 text-green-400':'text-neutral-500'"><span>9,900원</span><span class="font-bold">일반팩 1</span></div>
            <div class="flex justify-between text-[10px] p-1.5 rounded" :class="dState.payback.t2?'bg-green-900/30 text-green-400':'text-neutral-500'"><span>99,000원</span><span class="font-bold">픽업팩 1</span></div>
            <div class="flex justify-between text-[10px] p-1.5 rounded" :class="dState.payback.t3?'bg-green-900/30 text-green-400':'text-neutral-500'"><span>199,000원</span><span class="font-bold">일반팩 1</span></div>
            <div class="flex justify-between text-[10px] p-1.5 rounded" :class="dState.payback.t4?'bg-green-900/30 text-green-400':'text-neutral-500'"><span>299,000원</span><span class="font-bold">일반팩 1</span></div>
            <div class="flex justify-between text-[10px] p-1.5 bg-amber-900/20 text-amber-500 border border-amber-800/50 mt-1 rounded"><span>30만 마다 (무한)</span><span class="font-bold">티켓 9개 ({{dState.payback.inf}}회)</span></div>
          </div>
          
          <button @click="addManualPayback" class="w-full py-2 mb-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold rounded border border-neutral-700">타 패키지 충전 (30만 원)</button>

          <h3 class="font-extrabold text-sm mb-2 text-neutral-300 pt-3 border-t border-neutral-800"><ShoppingCart class="w-4 h-4 inline-block mr-1"/> 인게임 상점</h3>
          <div class="space-y-2 overflow-y-auto pr-1 flex-1">
            <button @click="buyPkg('quest', 1, 0, 1, 0, 0, '주간 퀘스트')" :disabled="dState.shop.quest>=1" class="w-full text-left p-2 rounded-lg transition-colors flex justify-between" :class="dState.shop.quest<1?'bg-blue-900/20 border-blue-800':'bg-neutral-800 opacity-50'"><div><div class="text-[10px] text-blue-400">주간 퀘스트 [{{dState.shop.quest}}/1]</div><div class="text-xs font-bold text-white">일반팩 1</div></div></button>
            <button @click="buyPkg('cash', 10, 500, 0, 0, 1, '주간 상점 티켓')" :disabled="dState.shop.cash>=10" class="w-full text-left p-2 rounded-lg transition-colors flex justify-between" :class="dState.shop.cash<10?'bg-neutral-800 hover:bg-neutral-700 border-neutral-700':'bg-neutral-800 opacity-50'"><div><div class="text-[10px] text-neutral-400">티켓 구매 [{{dState.shop.cash}}/10]</div><div class="text-xs font-bold text-amber-500">티켓 1 (500원)</div></div></button>
            <button @click="buyPkg('rookie', 1, 55000, 1, 0, 20, '루키 패키지')" :disabled="dState.shop.rookie>=1" class="w-full text-left p-2 rounded-lg transition-colors flex justify-between" :class="dState.shop.rookie<1?'bg-neutral-800 hover:bg-neutral-700 border-neutral-700':'bg-neutral-800 opacity-50'"><div><div class="text-[10px] text-neutral-400">루키 패키지 [{{dState.shop.rookie}}/1]</div><div class="text-xs font-bold text-white">일반1 + 티켓20</div></div><div class="text-[11px] font-bold text-green-500">5.5만</div></button>
            <button @click="buyPkg('prestige', 1, 99000, 3, 0, 10, '프레스티지')" :disabled="dState.shop.prestige>=1" class="w-full text-left p-2 rounded-lg transition-colors flex justify-between" :class="dState.shop.prestige<1?'bg-neutral-800 hover:bg-neutral-700 border-neutral-700':'bg-neutral-800 opacity-50'"><div><div class="text-[10px] text-neutral-400">프레스티지 [{{dState.shop.prestige}}/1]</div><div class="text-xs font-bold text-white">일반3 + 티켓10</div></div><div class="text-[11px] font-bold text-green-500">9.9만</div></button>
            <button @click="buyPkg('pickup', 1, 99000, 0, 2, 0, '픽업 프레스티지')" :disabled="dState.shop.pickup>=1" class="w-full text-left p-2 rounded-lg transition-colors flex justify-between" :class="dState.shop.pickup<1?'bg-purple-900/20 border-purple-800':'bg-neutral-800 opacity-50'"><div><div class="text-[10px] text-purple-400">픽업 프레스티지 [{{dState.shop.pickup}}/1]</div><div class="text-xs font-bold text-purple-300">픽업팩 2</div></div><div class="text-[11px] font-bold text-green-500">9.9만</div></button>
            <button @click="buyPkg('pro', 5, 99000, 2, 0, 10, '프로 패키지')" :disabled="dState.shop.pro>=5" class="w-full text-left p-2 rounded-lg transition-colors flex justify-between" :class="dState.shop.pro<5?'bg-neutral-800 hover:bg-neutral-700 border-neutral-700':'bg-neutral-800 opacity-50'"><div><div class="text-[10px] text-neutral-400">프로 패키지 [{{dState.shop.pro}}/5]</div><div class="text-xs font-bold text-white">일반2 + 티켓10</div></div><div class="text-[11px] font-bold text-green-500">9.9만</div></button>
            <button @click="buyPkg('legend', 3, 149000, 2, 1, 0, '레전드 패키지')" :disabled="dState.shop.legend>=3" class="w-full text-left p-2 rounded-lg transition-colors flex justify-between" :class="dState.shop.legend<3?'bg-amber-900/20 border-amber-800':'bg-neutral-800 opacity-50'"><div><div class="text-[10px] text-amber-500">레전드 패키지 [{{dState.shop.legend}}/3]</div><div class="text-xs font-bold text-amber-300">일반2 + 픽업1</div></div><div class="text-[11px] font-bold text-green-500">14.9만</div></button>
          </div>
        </div>
      </section>

      <!-- [중앙] 가챠 및 믹서기 -->
      <section class="xl:col-span-5 flex flex-col gap-4 h-full">
        <div class="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col">
          <h2 class="text-lg font-black mb-4 flex items-center gap-2 text-indigo-400"><Package class="w-5 h-5"/> 인벤토리 & 뽑기</h2>
          <div class="grid grid-cols-3 gap-3 mb-5">
            <div class="bg-neutral-800 p-3 rounded-xl text-center"><div class="text-[10px] font-bold text-neutral-400 mb-1">일반 디그팩</div><div class="text-xl font-black text-white">{{ dState.inv.normal }}</div></div>
            <div class="bg-purple-900/20 border border-purple-800/50 p-3 rounded-xl text-center"><div class="text-[10px] font-bold text-purple-400 mb-1">픽업 디그팩</div><div class="text-xl font-black text-purple-300">{{ dState.inv.pickup }}</div></div>
            <div class="bg-amber-900/20 border border-amber-800/50 p-3 rounded-xl text-center"><div class="text-[10px] font-bold text-amber-500 mb-1">트레이드권</div><div class="text-xl font-black text-amber-400">{{ dState.inv.tickets }}</div></div>
          </div>
          <div class="flex flex-col gap-2 mb-3">
            <div class="flex gap-2"><button @click="openPack(1)" class="flex-1 py-3 bg-neutral-700 hover:bg-neutral-600 text-white rounded-xl font-bold">일반 1팩 까기</button><button @click="openPack(10)" class="flex-1 py-3 bg-neutral-700 hover:bg-neutral-600 text-white rounded-xl font-bold">일반 10팩 까기</button></div>
            <button @click="openPickup()" class="w-full py-3 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white rounded-xl font-black shadow-lg">픽업팩 까기 (100% 확정)</button>
          </div>
          <div class="mt-auto pt-3 border-t border-neutral-800 flex justify-between text-xs font-bold text-neutral-500">
            <span>팩 천장: <span class="text-blue-400">{{dState.pity.pack % 50}}</span> / 50</span><span>트레이드 천장: <span class="text-blue-400">{{dState.pity.trade % 30}}</span> / 30</span>
          </div>
        </div>

        <div class="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col shrink-0">
          <h3 class="font-extrabold text-sm mb-4 flex items-center gap-1.5 text-green-400"><RefreshCw class="w-4 h-4"/> 믹서기 (트레이드)</h3>
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div class="bg-neutral-800 p-3 rounded-xl text-center"><div class="text-[10px] font-bold text-neutral-400 mb-1">갈려나갈 중복 디그니티</div><div class="text-lg font-black text-red-400">{{ dupeDignityCount }} 장</div></div>
            <div class="bg-neutral-800 p-3 rounded-xl text-center"><div class="text-[10px] font-bold text-neutral-400 mb-1">갈려나갈 타팀 TOP</div><div class="text-lg font-black text-white">{{ dState.inv.otherTop }} 장</div></div>
          </div>
          <button @click="runMixer" class="w-full py-4 bg-green-700 hover:bg-green-600 text-white rounded-xl font-black text-lg shadow-lg flex justify-center items-center gap-2"><RefreshCw class="w-5 h-5"/> 자동 필터 믹서기 가동</button>
        </div>

        <div class="bg-[#0f0f13] border border-neutral-800 rounded-2xl p-4 flex-1 overflow-hidden flex flex-col min-h-[200px]">
          <div class="flex-1 overflow-y-auto space-y-1 font-mono text-[10px]">
            <div v-for="l in dState.logs" :key="l.id" :class="{'text-neutral-400':l.type==='normal', 'text-green-400 font-bold':l.type==='success', 'text-blue-300':l.type==='action', 'text-amber-400 font-black text-[11px]':l.type==='epic'}"><span class="opacity-50 mr-1">></span>{{ l.msg }}</div>
          </div>
        </div>
      </section>

      <!-- [우측] 도감 & 플래너 -->
      <section class="xl:col-span-4 flex flex-col gap-4 h-full">
        <!-- 메인 디그니티 획득창 -->
        <div class="bg-gradient-to-b from-blue-900 to-black border border-blue-800 rounded-2xl p-5 shadow-xl shrink-0 text-center relative overflow-hidden">
          <Gem class="absolute -right-4 -bottom-4 w-32 h-32 text-blue-500 opacity-10"/>
          <div class="text-[11px] font-extrabold text-blue-400 mb-1 relative z-10">최종 획득 결과물</div>
          <div class="text-2xl font-black text-white relative z-10">{{ T_NAMES[dState.myTeam] }} {{ D_WAVES[dState.targetWave][dState.myTeam] }}</div>
          <div class="text-5xl font-black text-yellow-400 mt-2 relative z-10">{{ dState.inv.myDgn }} <span class="text-xl text-yellow-600">장</span></div>
        </div>

        <!-- 멀티 도감 (디그니티 / TOP) -->
        <div class="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex-1 flex flex-col overflow-hidden">
          <div class="flex gap-2 mb-3">
            <button @click="albumTab='dignity'" class="flex-1 py-1.5 rounded text-[11px] font-bold" :class="albumTab==='dignity'?'bg-amber-600 text-white':'bg-neutral-800 text-neutral-400'">디그니티 명함</button>
            <button @click="albumTab='top'" class="flex-1 py-1.5 rounded text-[11px] font-bold" :class="albumTab==='top'?'bg-blue-600 text-white':'bg-neutral-800 text-neutral-400'">TOP카드 수집함</button>
          </div>
          
          <div v-show="albumTab==='dignity'" class="grid grid-cols-3 gap-2 overflow-y-auto pr-1 flex-1 content-start">
            <div v-for="t in TEAMS" :key="t" v-show="t!==dState.myTeam" class="p-2 rounded-lg border text-center relative transition-colors" :class="dState.album[t]>0?'bg-amber-900/30 border-amber-700':'bg-neutral-800 border-neutral-700 opacity-50 grayscale'">
              <div class="text-[9px] font-black mb-0.5" :class="T_COLORS[t]">{{ T_NAMES[t] }}</div><div class="text-xs font-bold text-white">{{ D_WAVES[dState.targetWave][t] }}</div>
              <div v-if="dState.album[t]>1" class="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">+{{ dState.album[t]-1 }} 중복</div>
              <div v-if="dState.album[t]===1" class="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full"><Lock class="w-2.5 h-2.5 inline"/> 명함</div>
            </div>
          </div>

          <div v-show="albumTab==='top'" class="flex flex-col flex-1 overflow-hidden">
            <div class="text-[10px] font-bold text-blue-400 mb-2 border-b border-neutral-800 pb-1">자팀 수집함 (자동 보호) - 총 {{ dState.inv.myTop }}장</div>
            <div class="flex-1 overflow-y-auto pr-1 flex flex-col gap-1 mb-2 content-start">
              <div v-for="p in TOP_DB[dState.myTeam]" :key="p" v-show="dState.topAlbum[dState.myTeam][p] > 0" class="flex justify-between text-xs bg-neutral-800 p-1.5 rounded"><span class="text-white">{{ p }}</span><span class="text-blue-400 font-bold">x{{ dState.topAlbum[dState.myTeam][p] }}</span></div>
            </div>
            <div class="text-[10px] font-bold text-red-400 mb-2 border-b border-neutral-800 pb-1 pt-2">타팀 획득 내역 (믹서기 재료) - 누적 획득 표기</div>
            <div class="flex-1 overflow-y-auto pr-1 flex flex-col gap-1 content-start">
              <template v-for="t in TEAMS" :key="'o'+t">
                <div v-if="t !== dState.myTeam" v-for="p in TOP_DB[t]" :key="p" v-show="dState.topAlbum[t][p] > 0" class="flex justify-between text-[10px] text-neutral-400"><span>[{{ T_NAMES[t] }}] {{ p }}</span><span>누적 x{{ dState.topAlbum[t][p] }}</span></div>
              </template>
            </div>
          </div>
        </div>

        <!-- 🚀 과금 플래너 -->
        <div class="bg-indigo-900/20 border border-indigo-800/50 rounded-2xl p-4 shrink-0 flex flex-col">
          <h3 class="font-extrabold text-sm mb-2 flex items-center gap-1.5 text-indigo-400"><BarChart class="w-4 h-4"/> 타임라인 과금 플래너</h3>
          <div class="grid grid-cols-2 gap-x-2 gap-y-1 mb-3 text-[10px]">
            <label class="flex items-center gap-1 text-neutral-300"><input type="checkbox" v-model="simPlan.wQ"> 주간퀘 완수</label>
            <label class="flex items-center gap-1 text-neutral-300 justify-end">티켓 <input type="number" v-model.number="simPlan.wC" class="w-8 bg-neutral-800 border border-neutral-700 text-center rounded"> /주</label>
            <label class="flex items-center gap-1 text-neutral-300">루키 <input type="number" v-model.number="simPlan.rk" class="w-8 bg-neutral-800 border border-neutral-700 text-center rounded"> /월</label>
            <label class="flex items-center gap-1 text-neutral-300 justify-end">프레스티지 <input type="number" v-model.number="simPlan.pt" class="w-8 bg-neutral-800 border border-neutral-700 text-center rounded"> /월</label>
            <label class="flex items-center gap-1 text-neutral-300">픽업 <input type="number" v-model.number="simPlan.pk" class="w-8 bg-neutral-800 border border-neutral-700 text-center rounded"> /월</label>
            <label class="flex items-center gap-1 text-neutral-300 justify-end">프로 <input type="number" v-model.number="simPlan.pr" class="w-8 bg-neutral-800 border border-neutral-700 text-center rounded"> /월</label>
            <label class="flex items-center gap-1 text-neutral-300 col-span-2 mt-1 justify-center">레전드 <input type="number" v-model.number="simPlan.lg" class="w-8 bg-neutral-800 border border-neutral-700 text-center rounded"> /월</label>
          </div>
          <div class="flex items-center gap-2 mb-2 justify-center"><span class="text-xs font-bold text-indigo-300">목표 자팀 획득:</span><input type="number" v-model.number="simPlan.target" class="w-12 bg-neutral-800 border border-indigo-700 rounded p-1 text-xs text-center font-bold outline-none text-white"><span class="text-xs font-bold text-indigo-300">장</span></div>
          <button @click="runPlanner" :disabled="isSim" class="w-full py-2 bg-indigo-700 hover:bg-indigo-600 text-white font-bold rounded-lg text-xs">{{ isSim ? '연산 중...' : '시뮬레이션 가동' }}</button>
          
          <div v-if="simResult" class="mt-3 p-3 bg-neutral-800 rounded-xl border border-indigo-800/50 flex justify-between items-center text-center">
            <div><div class="text-[9px] text-neutral-400 mb-0.5">평균 소요 기간</div><div class="text-sm font-black text-indigo-400">{{ simResult.month }}개월 {{ simResult.week }}주</div></div>
            <div><div class="text-[9px] text-neutral-400 mb-0.5">예상 총 과금액</div><div class="text-sm font-black text-green-400">{{ simResult.cost }}원</div></div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.2s ease-in-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #64748b; }
</style>
