<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch } from 'vue'
import Papa from 'papaparse'
import { Search, Calculator, Star, Shield, Zap, TrendingUp, X, Users, ArrowUpCircle, Sparkles, UserCheck, Filter, ChevronRight as ChevronRightIcon, Check, Save, FolderOpen, Download, Upload } from 'lucide-vue-next'

type Raw = Record<string, any>
type CountOp = '==' | '>=' | '<=' | '>' | '<' | 'between'

interface JsonBonus { unit: 'percent' | 'fixed'; value: number }
interface JsonCond  { count: any; stat: string; bonus: JsonBonus }
interface JsonSynergy { id: number | string; synergy: string; conditions: JsonCond[] }
interface PlayerBuff {
  enhancementLevel: number; breakthroughLevel: number; careerTeamCount: number;
  hitAceBuff: number; imprintStarterPower: number;
  careerAllStatFlat: number; 
  imprintCoreStat: number; // 🌟 추가: 각인 전체 능력치 (5대 스탯)
  careerCoreStat: number;  // 🌟 추가: 커리어 전체 능력치 (5대 스탯)
  selectedSkills: string[];
  battingOrder: number | null;
  playerLevel: number; collectionBuff: number; careerLevelBuff: number;
  binderBuff: number; ultimateImprintPercent: number;
  imprintStats: Record<string, number>;
  careerStats: Record<string, number>;
}

const POSITION_ALIASES: Record<string, string> = {
  'b1': '1B', '1b': '1B', '1': '1B', '1루': '1B',
  'b2': '2B', '2b': '2B', '2': '2B', '2루': '2B',
  'b3': '3B', '3b': '3B', '3': '3B', '3루': '3B',
  'c': 'C', '포': 'C', 'ss': 'SS', '유격': 'SS',
  'lf': 'LF', '좌익': 'LF', 'cf': 'CF', '중견': 'CF', 'rf': 'RF', '우익': 'RF',
  'sp': 'SP', '선발': 'SP', 'rp': 'RP', '불펜': 'RP', 'dh': 'DH', '지타': 'DH',
}

const STAT_LABELS: Record<string, string> = {
  contact: '컨택트', gapPower: '갭파워', homeRunPower: '홈런파워', plateDiscipline: '선구', strikeoutAvoidance: '삼진회피',
  stealing: '도루', baseRunning: '주루', defense: '수비',
  movement: '무브먼트', longHitSuppression: '장타억제', homeRunSuppression: '홈런억제', control: '컨트롤', stuff: '스터프',
  runnerControl: '주자견제', pitchLimit: '한계투구'
}

const batterStats = ['contact', 'gapPower', 'homeRunPower', 'plateDiscipline', 'strikeoutAvoidance', 'stealing', 'baseRunning', 'defense'];
const pitcherStats = ['movement', 'longHitSuppression', 'homeRunSuppression', 'control', 'stuff', 'defense', 'pitchLimit', 'runnerControl'];

const isPitcher = (p: Raw | null) => {
  if (!p) return false;
  const pos = String(p.position || '').toUpperCase();
  return pos.includes('SP') || pos.includes('RP') || !!p.movement;
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

const expandedSynergy = ref<string | null>(null)
const expandedPendingSynergy = ref<string | null>(null)

const searchQuery = reactive({
  search: '', position: [] as string[], team: [] as string[],
  synergy: [] as string[], rarity: null as number | null, grade: [] as string[]
})

const lineupViewMode = ref('batter')
const selectedSlot = ref<string | null>(null)
const isManualSelection = ref(false)
const lineup = ref({
  C: null, '1B': null, '2B': null, '3B': null, SS: null,
  LF: null, CF: null, RF: null, DH: null,
  SP1: null, SP2: null, SP3: null, SP4: null, SP5: null,
  RP1: null, RP2: null, RP3: null, RP4: null, RP5: null, RP6: null,
  BENCH1: null, BENCH2: null, BENCH3: null, BENCH4: null,
  BENCH5: null, BENCH6: null, BENCH7: null, BENCH8: null
} as Record<string, Raw | null>)

// 🌟 시너지 마스터리 상태 추가 🌟
const globalBuffs = reactive({
  teamLevel: 100, preferredTeam: [] as string[], clanBuff: 15, managerType: '', managerEnhance: 0,
  synergyMasteries: ['', '', '', '', ''],
  amplifiedMasteryIndex: -1 // 증폭 선택 인덱스 (-1이면 미선택)
})

const playerBuffs = ref<Record<string, PlayerBuff>>({})

// 🌟 9up 인게임 고증: 각인(Imprint) 시스템 상태 및 로직 🌟
type ImprintRole = '타자' | '투수'; 
type ImprintGrade = '노말' | '고급' | '특별' | '레전드' | '얼티밋';
type SubOptType = '컨택' | '갭파워' | '홈런파워' | '선구' | '삼진회피' | '무브먼트' | '장타억제' | '홈런억제' | '컨트롤' | '스터프' | '수비' | '한계투구 증가' | '1~2선발시 파워증가' | '전체 능력치' | '조건부 파워' | '수익 증가';

interface ImprintSubOption {
  type: SubOptType;
  value: number;
}

interface Imprint {
  id: string;
  name: string;
  role: ImprintRole;
  grade: ImprintGrade;
  mainStat: string; // 🌟 핵심: 5대 스탯 중 어떤 스탯을 올려주는지 저장!
  mainPower: number; 
  subOptions: ImprintSubOption[]; 
  ultimateBonus?: { targetGrade: string, power: number }; 
}

const imprintInventory = ref<Imprint[]>([]);
const showImprintManager = ref(false);

const newImprint = ref({ 
  name: '', role: '타자' as ImprintRole, grade: '레전드' as ImprintGrade, 
  mainStat: '컨택', // 생성 기본값
  mainPower: 270,
  subOptions: [
    { type: '컨택' as SubOptType, value: 0 },
    { type: '갭파워' as SubOptType, value: 0 },
    { type: '전체 능력치' as SubOptType, value: 0 }
  ],
  ultimateBonus: { targetGrade: 'DGN', power: 0 } // 내부 코드로 변경
});

// 🌟 역할(타/투) 변경 시 주옵/부옵 스탯 꼬임 방지 🌟
const handleRoleChange = () => {
  newImprint.value.mainStat = newImprint.value.role === '타자' ? '컨택' : '무브먼트';
  newImprint.value.subOptions.forEach(opt => {
    opt.type = newImprint.value.role === '타자' ? '컨택' : '무브먼트';
    opt.value = 0;
  });
};

const updateSubOptionsCount = () => {
  let count = 3; 
  if (newImprint.value.grade === '노말') count = 0;
  if (newImprint.value.grade === '고급') count = 1;
  if (newImprint.value.grade === '특별') count = 2;
  
  while (newImprint.value.subOptions.length < count) {
    newImprint.value.subOptions.push({ type: newImprint.value.role === '타자' ? '컨택' : '무브먼트', value: 0 });
  }
  if (newImprint.value.subOptions.length > count) {
    newImprint.value.subOptions.splice(count);
  }
};

const createImprint = () => {
  if (!newImprint.value.name.trim()) return alert('각인 이름을 입력해주세요!');
  const imp: Imprint = {
    id: Date.now().toString(),
    name: newImprint.value.name.trim(),
    role: newImprint.value.role,
    grade: newImprint.value.grade,
    mainStat: newImprint.value.mainStat, // 주옵션 저장
    mainPower: Number(newImprint.value.mainPower) || 0,
    subOptions: newImprint.value.subOptions.map(o => ({ type: o.type, value: Number(o.value) || 0 }))
  };
  
  if (imp.grade === '얼티밋') {
    imp.ultimateBonus = {
      targetGrade: newImprint.value.ultimateBonus.targetGrade,
      power: Number(newImprint.value.ultimateBonus.power) || 0
    };
  }
  
  imprintInventory.value.push(imp);
  alert(`[${imp.role}용 - ${imp.mainStat}] 각인이 생성되었습니다!`);
};

const deleteImprint = (id: string) => {
  if(!confirm('이 각인을 보관함에서 완전히 삭제하시겠습니까?')) return;
  imprintInventory.value = imprintInventory.value.filter(i => i.id !== id);
  Object.keys(playerBuffs.value).forEach(pos => {
    if (playerBuffs.value[pos]?.imprint1?.id === id) playerBuffs.value[pos].imprint1 = null;
    if (playerBuffs.value[pos]?.imprint2?.id === id) playerBuffs.value[pos].imprint2 = null;
  });
};

const showImprintEquipper = ref(false);
const equipTarget = ref<{ pos: string, slot: 1 | 2 } | null>(null);

const openEquipModal = (pos: string, slot: 1 | 2) => {
  equipTarget.value = { pos, slot };
  showImprintEquipper.value = true;
};

const equipImprint = (imprint: Imprint) => {
  if (!equipTarget.value) return;
  const { pos, slot } = equipTarget.value;
  const p = lineup.value[pos];
  if (!p) return;
  
  const isPitcherSlot = pos.startsWith('SP') || pos.startsWith('RP');
  const targetRole = isPitcherSlot ? '투수' : '타자';
  if (imprint.role !== targetRole) return alert(`장착 실패! ${targetRole}용 각인만 낄 수 있습니다!`);

  if (!playerBuffs.value[pos]) playerBuffs.value[pos] = {};
  const currentBuffs = playerBuffs.value[pos];
  
  const otherImprint = slot === 1 ? currentBuffs.imprint2 : currentBuffs.imprint1;

  if (otherImprint?.id === imprint.id) return alert('이미 반대쪽 슬롯에 장착된 각인입니다.');

  // 🌟 핵심 방어막: 주옵션 중복 장착 절대 불가!
  if (otherImprint?.mainStat === imprint.mainStat) {
    return alert(`장착 실패! 이미 반대쪽 슬롯에 [${imprint.mainStat}] 주옵션 각인이 장착되어 있습니다. (동일 주옵 중복 장착 불가)`);
  }

  if (imprint.grade === '얼티밋' && p.grade !== 'Dignity') { 
    if (otherImprint?.grade === '얼티밋') return alert('디그니티 등급이 아닌 선수는 얼티밋 각인을 1개만 장착할 수 있습니다!');
  }

  if (slot === 1) playerBuffs.value[pos].imprint1 = imprint;
  else playerBuffs.value[pos].imprint2 = imprint;
  
  showImprintEquipper.value = false;
};

const unequipImprint = (pos: string, slot: 1 | 2) => {
  if (playerBuffs.value[pos]) {
    if (slot === 1) playerBuffs.value[pos].imprint1 = null;
    else playerBuffs.value[pos].imprint2 = null;
  }
};

const getGradeColor = (grade: ImprintGrade) => {
  switch(grade) {
    case '얼티밋': return 'text-red-600 bg-red-100 border-red-300';
    case '레전드': return 'text-purple-600 bg-purple-100 border-purple-300';
    case '특별': return 'text-blue-600 bg-blue-100 border-blue-300';
    case '고급': return 'text-green-600 bg-green-100 border-green-300';
    default: return 'text-neutral-600 bg-neutral-200 border-neutral-300';
  }
};
  
const initPlayerBuff = (slot: string, p: Raw) => {
  const grade = String(p.grade || '').toUpperCase()
  let colBuff = 1200
  
  if (['SEA', 'ASG'].includes(grade)) colBuff = 800
  else if (['POS', 'TEA', 'MMVP', 'HIT', 'ACE', 'GGY'].includes(grade)) colBuff = 900
  else if (['GG', 'ROY'].includes(grade)) colBuff = 1000
  else if (grade === 'TOP') colBuff = 1200
  else if (grade === 'DGN') colBuff = 0

  // 🌟 기존 슬롯(장비칸)에 있던 각인 데이터를 백업 (없으면 0으로 초기화)
  const existing = playerBuffs.value[slot]
  const savedImprintStats = existing ? { ...existing.imprintStats } : {}
  const savedImprintCoreStat = existing ? existing.imprintCoreStat : 0
  const savedUltimateImprintPercent = existing ? existing.ultimateImprintPercent : 0
  const savedImprintStarterPower = existing ? existing.imprintStarterPower : 0

  playerBuffs.value[slot] = {
    enhancementLevel: grade === 'DGN' ? 10 : 15, breakthroughLevel: 0,
    careerTeamCount: 0, hitAceBuff: 0, 
    imprintStarterPower: savedImprintStarterPower, // 🌟 1,2선발 각인 파워 유지
    careerAllStatFlat: 0, 
    imprintCoreStat: savedImprintCoreStat, // 🌟 전체 능력치 각인 유지
    careerCoreStat: 0, // 커리어는 선수 고유의 성장이므로 0으로 초기화
    selectedSkills: [], battingOrder: null,
    playerLevel: 100, collectionBuff: colBuff, careerLevelBuff: 149,
    binderBuff: 537, 
    ultimateImprintPercent: savedUltimateImprintPercent, // 🌟 얼티밋 각인 % 유지
    imprintStats: savedImprintStats, // 🌟 개별 스탯 각인 유지
    careerStats: {} // 커리어 스탯은 초기화
  }
}
  
const rightPanelTab = ref<'global' | 'player'>('global')
const playerTab = ref<'stats' | 'synergy'>('stats')

// 🌟 1단계: 시너지 카테고리 자동 분류 및 탭 필터링 로직 추가
const activeSynergyCategory = ref('전체');
const playerSynergyCategory = ref('전체');

const getSynergyCategory = (synName: string) => {
  const name = String(synName || '').replace(/\s+/g, '').trim();
  
  // 🌟 예외 처리 VIP: '라이벌' 키워드 추가! (중간에 '-' 기호가 있어도 기록 탭에 안 뺏기고 무조건 인물로 직행!)
  if (name.match(/대통령배MVP|봉황대기MVP|청룡기MVP|고춧가루|왕조주역|돌격대|황금세대|\d{4}국가대표팀|실업야구|라이벌/)) {
    return '인물';
  }

  // 1. 기본 (연도, 구단, 시즌카 종류)
  if (/^\d{4}$|^\d{4}년/.test(name) || name.match(/SSG|SK|키움|히어로즈|넥센|KIA|해태|삼성|두산|OB|롯데|LG|MBC|한화|빙그레|NC|KT|현대|태평양|청보|삼미|쌍방울|디그니티|탑클|에이스|히트|골든글러브|골글|MVP|신인왕|포스트시즌|올스타|국가대표|타이틀|프랜차이즈/)) return '기본';
  
  // 2. 출신 (학교, 외국인 등)
  if (name.match(/출신|외국인|용병|해외파|고등학교|대학교|중학교|초등학교/) || name.endsWith('고') || name.endsWith('대') || name.endsWith('상고') || name.endsWith('공고')) return '출신';
  
  // 3. 기록 (통산, 한시즌, 경기 등) - 🌟 '1위' 키워드 추가! (장타율1위, 평균자책점1위 등을 기록 탭으로!)
  if (name.match(/경기|안타|홈런|도루|타점|득점|승|세이브|홀드|탈삼진|이닝|클럽|철인|기록|-|1위/)) return '기록';
  
  // 4. 인물 (나머지 특수 시너지들)
  return '인물';
}

const filteredActiveTeamSynergies = computed(() => {
  return activeTeamSynergies.value.filter(s => activeSynergyCategory.value === '전체' || getSynergyCategory(s.name) === activeSynergyCategory.value);
});
const filteredPendingTeamSynergies = computed(() => {
  return pendingTeamSynergies.value.filter(s => activeSynergyCategory.value === '전체' || getSynergyCategory(s.name) === activeSynergyCategory.value);
});
const filteredPlayerActiveSynergies = computed(() => {
  if (!selectedSlot.value || !lineup.value[selectedSlot.value]) return [];
  return getExpandedPlayerSynergies(lineup.value[selectedSlot.value]!).filter(s => {
    const matchCategory = playerSynergyCategory.value === '전체' || getSynergyCategory(s) === playerSynergyCategory.value;
    return matchCategory && isSynergyActiveForPlayer(lineup.value[selectedSlot.value]!, s);
  });
});
const filteredPlayerInactiveSynergies = computed(() => {
  if (!selectedSlot.value || !lineup.value[selectedSlot.value]) return [];
  return getExpandedPlayerSynergies(lineup.value[selectedSlot.value]!).filter(s => {
    const matchCategory = playerSynergyCategory.value === '전체' || getSynergyCategory(s) === playerSynergyCategory.value;
    return matchCategory && !isSynergyActiveForPlayer(lineup.value[selectedSlot.value]!, s);
  });
});
  
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
  "공갈포": {"powerPercent": 0, "stats": {"homeRunPower": 20.0, "contact": -7.0, "strikeoutAvoidance": -7.0}}, 
  "그라운드볼러": {"powerPercent": 0, "stats": {"movement": -5.0, "homeRunSuppression": 10.0, "longHitSuppression": 10.0}}, 
  "그린라이트": {"powerPercent": 0, "stats": {}}, 
  "너클볼": {"powerPercent": 0, "stats": {"stuff": 20.0, "homeRunSuppression": -5.0, "longHitSuppression": -5.0, "movement": 20.0, "control": 20.0}}, 
  "더티 무브먼트": {"powerPercent": 0, "stats": {"movement": 25.0}}, "라이징 무브먼트": {"powerPercent": 0, "stats": {"stuff": 20.0}}, 
  "로우볼 히터": {"powerPercent": 0, "stats": {"gapPower": 5.0, "homeRunPower": 10.0, "plateDiscipline": -5.0}}, 
  "롱맨": {"powerPercent": 10.0, "stats": {}}, 
  "맞춰잡기": {"powerPercent": 0, "stats": {"control": 15.0, "pitchLimit": 10.0}}, 
  "묵직함": {"powerPercent": 0, "stats": {"longHitSuppression": 10.0, "homeRunSuppression": 10.0}}, 
  "믿을맨": {"powerPercent": 10.0, "stats": {}}, "배드볼히터": {"powerPercent": 0, "stats": {"contact": 15.0, "gapPower": 20.0, "plateDiscipline": -3.0}}, 
  "배럴 히터": {"powerPercent": 0, "stats": {"contact": 10.0, "gapPower": 10.0, "strikeoutAvoidance": 10.0}}, "변칙타순": {"powerPercent": 4.0, "stats": {}}, 
  "변칙투구": {"powerPercent": 0, "stats": {}}, "선구안": {"powerPercent": 0, "stats": {"strikeoutAvoidance": 15.0, "plateDiscipline": 15.0}}, 
  "셋업": {"powerPercent": 10.0, "stats": {}}, "셋업맨": {"powerPercent": 10.0, "stats": {}},
  "스토퍼": {"powerPercent": 10.0, "stats": {}}, "마무리": {"powerPercent": 10.0, "stats": {}},
  "스플리터": {"powerPercent": 0, "stats": {"movement": 15.0, "stuff": 25.0, "control": -5.0}}, 
  "승리계투": {"powerPercent": 10.0, "stats": {}}, "숏릴리프": {"powerPercent": 10.0, "stats": {}},
  "스피드스터": {"powerPercent": 0, "stats": {}}, "슬랩 히터": {"powerPercent": 0, "stats": {"contact": 20.0, "baseRunning": 10.0}}, 
  "싱커(투심)": {"powerPercent": 0, "stats": {"homeRunSuppression": 20.0, "stuff": -5.0}}, 
  "에이스": {"powerPercent": 9.0, "stats": {}}, "와일드씽": {"powerPercent": 0, "stats": {"control": -3.0, "stuff": 10.0}}, "원투펀치": {"powerPercent": 8.0, "stats": {}}, 
  "원포인터": {"powerPercent": 10.0, "stats": {}}, "이닝이팅": {"powerPercent": 0, "stats": {"pitchLimit": 5.0}}, "적극성": {"powerPercent": 0, "stats": {"contact": 15.0}}, 
  "지명타자": {"powerPercent": 8.5, "stats": {}}, "체인지업": {"powerPercent": 0, "stats": {"longHitSuppression": 15.0}}, 
  "커브": {"powerPercent": 0, "stats": {"movement": 15.0, "longHitSuppression": 10.0}}, 
  "컨택터": {"powerPercent": 0, "stats": {"contact": 20.0}}, "클로저": {"powerPercent": 10.0, "stats": {}}, "클린업": {"powerPercent": 8.0, "stats": {}}, 
  "타격 전략": {"powerPercent": 0, "stats": {"contact": 20.0}}, "테이블세터": {"powerPercent": 7.0, "stats": {}}, "파워": {"powerPercent": 0, "stats": {"gapPower": 15.0, "homeRunPower": 15.0}}, 
  "파이어볼러": {"powerPercent": 0, "stats": {"stuff": 15.0}}, "펀치력": {"powerPercent": 0, "stats": {"gapPower": 10.0, "homeRunPower": 5.0}}, 
  "플라이볼피쳐": {"powerPercent": 0, "stats": {"movement": 20.0, "homeRunSuppression": -5.0}}, "하위타선": {"powerPercent": 8.0, "stats": {"defense": 10.0}}, 
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
const getCleanArray = (value: any): string[] => {
  if (!value) return []
  let str = Array.isArray(value) ? value.join(',') : String(value)
  str = str.replace(/[\[\]"'`]/g, '')
  return str.split(/[,;]+/).map(x => x.trim()).filter(Boolean)
}
const getArray = getCleanArray
const toArray = getCleanArray

const normalizePosition = (position: any): string => {
  const str = String(position ?? '').replace(/[\[\]"'`\s]/g, '').trim()
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
      teamLowerCase: toArray(player.team).map(toLowerCase), positionLowerCase: toArray(player.position).map(normalizePosition).map(toLowerCase),
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
  
  if (keyClean === '신') {
     return playerSynergies.some(s => clean(s) === '신');
  }

  // 🌟 핵심: '시즌'과 '포스트시즌' 글자 겹침으로 인한 교차 발동 완벽 차단 함수!
  const isIncludesSafe = (sClean: string, kClean: string) => {
    if (kClean.includes('시즌') && !kClean.includes('포스트') && sClean.includes('포스트시즌')) return false;
    return sClean.includes(kClean);
  }

  if (playerSynergies.some(s => clean(s) === keyClean)) return true
  const tm = keyClean.match(/^(\D*)(\d+)(\D*)$/)
  
  if (!tm) return playerSynergies.some(s => isIncludesSafe(clean(s), keyClean))
  
  const [,tp,tn,ts] = tm
  const isYearTarget = tn.length === 4 && (ts === '' || ts === '년' || ts === '년도');
  if (isYearTarget || tp.includes('동명이인') || ts.includes('동명이인')) return false
  
  const tnum = parseInt(tn,10)

  const careerThresholds: Record<string, number> = {
    '경기': 200, '안타': 250, '홈런': 100, '도루': 100, '타점': 200, '득점': 200,
    '승': 40, '세이브': 80, '홀드': 80, '탈삼진': 350, '이닝': 350
  };
  const isCareer = (val: number, type: string) => val >= (careerThresholds[type] || 9999);

  return playerSynergies.some(s => {
    const sClean = clean(s)
    if (isIncludesSafe(sClean, keyClean)) return true;
    
    const parts = sClean.split('-')
    for (const part of parts) {
      const sm = part.match(/^(\D*)(\d+)(\D*)$/)
      if (!sm) continue
      const [,pp,pn,ps] = sm
      
      const isYearPlayer = pn.length === 4 && (ps === '' || ps === '년' || ps === '년도');
      if (isYearPlayer || pp.includes('동명이인') || ps.includes('동명이인')) continue
      
      const cleanPrefix = (str: string) => str.replace(/통산|투수|타자/g, '').trim();
      
      if (cleanPrefix(pp) === cleanPrefix(tp) && ps === ts && parseInt(pn,10) >= tnum) {
        if (!isCareer(tnum, ts) && isCareer(parseInt(pn,10), ps)) continue; 
        
        // 🌟 혹시 연도(숫자)가 포함된 시즌/포스트시즌일 경우의 방어막
        if (ts.includes('시즌') && !ts.includes('포스트') && ps.includes('포스트시즌')) continue;
        
        return true; 
      }
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

// 🌟 시너지 마스터리 증폭 및 인원수 차감 계산 적용 🌟
const activeTeamSynergies = computed(() => {
  const lineupPlayers = Object.values(lineup.value).filter(Boolean) as Raw[]
  const result: { name: string, bonuses: { stat: string, bonus: JsonBonus }[], matchedPlayers: string[] }[] = []
  for (const s of synergys.value) {
    const name = String(s.synergy).trim()
    
    // 🌟 타자/투수 교차 발동 완벽 차단!
    const synType = getSynergyType(name, s.conditions)
    const matchedPlayers = lineupPlayers.filter(p => {
      if (!checkSynergyInclusion(name, getArray(p.synergy))) return false;
      const pIsPit = isPitcher(p);
      if (pIsPit && synType === 'batter') return false;
      if (!pIsPit && synType === 'pitcher') return false;
      return true;
    })
    const count = matchedPlayers.length

    // 마스터리 인원 보정 및 증폭 확인
    let masteryCount = 0;
    let isAmplified = false;
    globalBuffs.synergyMasteries.forEach((m, idx) => {
      if (m === name) {
        masteryCount++;
        if (globalBuffs.amplifiedMasteryIndex === idx) isAmplified = true;
      }
    });

    const effectiveCount = count + masteryCount; // 마스터리로 인해 가상의 인원이 추가된 효과

    if (effectiveCount > 0) {
       const matched = (s.conditions||[]).filter(c => {
          const op = c.count?.op as CountOp
          return op === 'between' 
            ? compareCondition('between', effectiveCount, c.count?.min, c.count?.max) 
            : compareCondition(op, effectiveCount, c.count?.value)
       })
       
       if (matched.length > 0) {
         const getThreshold = (c: any) => c.count?.op === 'between' ? (c.count?.max || 0) : (c.count?.value || 0)
         const maxThreshold = Math.max(...matched.map(getThreshold))
         const highestTierConditions = matched.filter(c => getThreshold(c) === maxThreshold)
         
         result.push({ 
           name, 
           bonuses: highestTierConditions.map(c => {
             let bVal = c.bonus.value;
             if (isAmplified && c.stat === 'power') {
               if (c.bonus.unit === 'percent') bVal += 0.5; // 퍼센트면 0.5 추가
               else if (c.bonus.unit === 'fixed') bVal += 50; // 상수면 50 추가
             }
             return { stat: c.stat, bonus: { unit: c.bonus.unit, value: bVal } }
           }),
           matchedPlayers: matchedPlayers.map(p => p.name)
         })
       }
    }
  }
  return result
})

const pendingTeamSynergies = computed(() => {
  const lineupPlayers = Object.values(lineup.value).filter(Boolean) as Raw[]
  const result: { name: string, current: number, required: number, matchedPlayers: string[] }[] = []
  
  for (const s of synergys.value) {
    const name = String(s.synergy).trim()
    
    // 🌟 대기 시너지에도 교차 발동 차단 로직 똑같이 적용!
    const synType = getSynergyType(name, s.conditions)
    const matchedPlayers = lineupPlayers.filter(p => {
      if (!checkSynergyInclusion(name, getArray(p.synergy))) return false;
      const pIsPit = isPitcher(p);
      if (pIsPit && synType === 'batter') return false;
      if (!pIsPit && synType === 'pitcher') return false;
      return true;
    })
    const count = matchedPlayers.length
    
    let masteryCount = 0;
    globalBuffs.synergyMasteries.forEach(m => {
      if (m === name) masteryCount++;
    });
    const effectiveCount = count + masteryCount;

    if (effectiveCount > 0) {
       const matched = (s.conditions||[]).filter(c => {
          const op = c.count?.op as CountOp
          return op === 'between' 
            ? compareCondition('between', effectiveCount, c.count?.min, c.count?.max) 
            : compareCondition(op, effectiveCount, c.count?.value)
       })
       
       if (matched.length === 0) {
         let minRequired = Infinity;
         (s.conditions||[]).forEach(c => {
           let req = 0;
           if (c.count?.op === 'between') req = c.count?.min;
           else if (['>=', '==', '>'].includes(c.count?.op)) req = c.count?.value;
           
           if (req > effectiveCount && req < minRequired) {
              minRequired = req;
           }
         });
         
         if (minRequired !== Infinity) {
            result.push({ 
              name, 
              current: effectiveCount,
              required: minRequired,
              matchedPlayers: matchedPlayers.map(p => p.name)
            })
         }
       }
    }
  }
  return result
})

const getTeamLevelPower = (level: number, isPref: boolean) => {
  const l = Math.min(100, Math.max(0, level || 0));
  let prefPwr = 0;
  let otherPwr = 0;
  if (l > 0) prefPwr += Math.min(l, 25) * 10;
  if (l > 25) otherPwr += Math.min(l - 25, 25) * 10;
  if (l > 50) prefPwr += Math.min(l - 50, 25) * 10;
  if (l > 75) {
    prefPwr += (l - 75) * 10;
    otherPwr += (l - 75) * 10;
  }
  return isPref ? prefPwr : otherPwr;
};

const getSameTeamCount = (p: Raw | null) => {
  if (!p) return 0;
  const myTeams = toArray(p.team).map(toLowerCase);
  let validTeamIds = new Set<string>(myTeams);
  groupedTeams.filter(g => g.id.some(id => myTeams.includes(id))).forEach(g => g.id.forEach(id => validTeamIds.add(id)));

  let count = 0;
  Object.values(lineup.value).forEach(other => {
     if (other) {
        const otherTeams = toArray(other.team).map(toLowerCase);
        if (otherTeams.some(t => validTeamIds.has(t))) count++;
     }
  });
  return count;
}

const getCareerTeamMultiplier = (slots: number) => {
  const s = Number(slots) || 0;
  if (s === 1) return 1;
  if (s === 2) return 2;
  if (s === 3) return 6;
  if (s === 4) return 8;
  if (s === 5) return 10;
  if (s >= 6) return 12;
  return 0;
}

// 🌟 1. 이름 + 스탯 이중 검사로 타자/투수를 완벽히 판별하는 엔진
const getSynergyType = (synName: string, conditions: any[]) => {
  // 쉼표와 공백을 모두 제거하여 정확도 100% 보장 (예: "1,500 경기" -> "1500경기")
  const name = String(synName || '').replace(/,/g, '').replace(/\s+/g, '').trim();
  
  // 🌟 타자 전용을 무조건 먼저 검사!!! ("1500" 안에 "500"이 포함되어 오작동하는 억울한 버그 완벽 차단)
  if (name.includes('1000경기') || name.includes('1500경기') || name.includes('2000경기') || name.includes('2500경기') || name.includes('3000경기') || name.includes('안타') || name.includes('홈런') || name.includes('도루') || name.includes('타점') || name.includes('득점')) return 'batter';

  // 그 다음 투수 전용 검사
  if (name.includes('500경기') || name.includes('700경기') || name.includes('승') || name.includes('세이브') || name.includes('홀드') || name.includes('탈삼진') || name.includes('이닝')) return 'pitcher';

  // 기존 스탯 기반 판별 로직
  const pitStats = ['movement', 'longHitSuppression', 'homeRunSuppression', 'control', 'stuff', 'pitchLimit', 'runnerControl'];
  const batStats = ['contact', 'gapPower', 'homeRunPower', 'plateDiscipline', 'strikeoutAvoidance', 'stealing', 'baseRunning'];
  const isPit = conditions?.some(c => pitStats.includes(c.stat));
  const isBat = conditions?.some(c => batStats.includes(c.stat));
  if (isPit && !isBat) return 'pitcher';
  if (isBat && !isPit) return 'batter';
  return 'both';
}

// 각 선수가 특정 시너지를 받고 있는지 확인 (개인설정 탭 용도)
const isPlayerReceivingSynergy = (p: Raw, synName: string) => {
  if (!p) return false;
  const hasSynergy = checkSynergyInclusion(synName, getArray(p.synergy));
  if (!hasSynergy) return false;
  const synData = synergys.value.find(s => String(s.synergy).trim() === synName);
  if (!synData) return false;
  const synType = getSynergyType(synName, synData.conditions); // 🌟 변경
  const playerIsPit = isPitcher(p);
  if (playerIsPit && synType === 'batter') return false;
  if (!playerIsPit && synType === 'pitcher') return false;
  return true;
}

const isSynergyActiveForPlayer = (p: Raw, rawSyn: string) => {
  if (!p) return false;
  return activeTeamSynergies.value.some(activeSyn => {
    if (!checkSynergyInclusion(activeSyn.name, [rawSyn])) return false;
    const synData = synergys.value.find(s => String(s.synergy).trim() === activeSyn.name);
    if (!synData) return false;
    const synType = getSynergyType(activeSyn.name, synData.conditions); // 🌟 변경
    const isPit = isPitcher(p);
    if (isPit && synType === 'batter') return false;
    if (!isPit && synType === 'pitcher') return false;
    return true;
  });
}

// 🌟 개인 시너지 화면에 하위 호환 시너지를 모두 찾아서 표시해 주는 함수
const getExpandedPlayerSynergies = (p: Raw) => {
  if (!p) return [];
  const rawSyns = getArray(p.synergy);
  const expanded = new Set<string>(rawSyns);
  const isPit = isPitcher(p);
  
  // 게임에 존재하는 모든 시너지를 한 바퀴 돌면서, 이 선수가 조건을 만족하는지 검사
  synergys.value.forEach(s => {
    const name = String(s.synergy).trim();
    const synType = getSynergyType(name, s.conditions); // 🌟 name 파라미터 추가
    
    // 🌟 여기서도 타자/투수가 서로의 시너지를 빼앗아 입는 것을 원천 봉쇄!
    if (isPit && synType === 'batter') return;
    if (!isPit && synType === 'pitcher') return;

    if (checkSynergyInclusion(name, rawSyns)) {
      expanded.add(name);
    }
  });
  
  return Array.from(expanded);
}
// 🌟 개인 시너지 '조건 미달' 시 필요 인원수 텍스트 반환 도우미 함수
const getPendingSynergyText = (synName: string) => {
  const found = pendingTeamSynergies.value.find(s => s.name === synName);
  return found ? `${found.current} / ${found.required}명` : '조건미달';
}
  
// 🌟 기존 코드: 절대 지우지 말고 그대로 두세요! (파워 계산기 엔진)
const getPlayerSynergySum = (p: Raw | null, unit: 'fixed' | 'percent') => {
  if (!p) return 0;
  let total = 0;
  activeTeamSynergies.value.forEach(syn => {
    if (isPlayerReceivingSynergy(p, syn.name)) {
      syn.bonuses.forEach(b => {
        if (b.stat === 'power' && b.bonus.unit === unit) total += b.bonus.value;
      });
    }
  });
  return total;
}

// 🌟 1단계 코드: 기존 코드 바로 밑에 "새로 추가" 해주세요! (화면 표시용)
const getPlayerSynergies = (p: Raw) => {
  if (!p || !p.synergy) return []
  return p.synergy.split(',').map(s => s.trim()).filter(Boolean)
}

const calculateTeamPlayerDignityBuff = (p: Raw) => {
  if (!p) return 0;
  const pTeams = toArray(p.team).map(toLowerCase);
  let validTeamIds = new Set<string>(pTeams);
  groupedTeams.filter(g => g.id.some(id => pTeams.includes(id))).forEach(g => g.id.forEach(id => validTeamIds.add(id)));

  let maxTeamPlayerPower = 0;
  let totalDignityPower = 0;

  Object.entries(lineup.value).forEach(([slotKey, other]) => {
     if (other) {
        const otherTeams = toArray(other.team).map(toLowerCase);
        if (otherTeams.some(t => validTeamIds.has(t))) {
           const oGrade = String(other.grade).toUpperCase();
           const oBuffs = playerBuffs.value[slotKey];
           const enhanceLvl = oBuffs?.enhancementLevel || 0;

           if (oGrade === 'TEA') {
             const power = 8 + Math.min(15, Math.max(0, enhanceLvl));
             if (power > maxTeamPlayerPower) maxTeamPlayerPower = power;
           } else if (oGrade === 'DGN') {
             const safeEnhance = Math.min(10, Math.max(0, enhanceLvl));
             const power = safeEnhance === 0 ? 5 : (safeEnhance * 10);
             totalDignityPower += power;
           }
        }
     }
  });

  return maxTeamPlayerPower + totalDignityPower;
}

const getMaxEnhance = (p: Raw) => {
  if (!p) return 15;
  const grade = String(p.grade).toUpperCase();
  return grade === 'DGN' ? 10 : 15;
}

const getMaxBreakthrough = (p: Raw | null) => {
  if (!p) return 0;
  const grade = String(p.grade || '').toUpperCase();
  if (grade === 'DGN') return 0;
  const r = parseInt(String(p.rarity || 1), 10) || 1;
  return r + 1;
}

const getEnhanceMultiplier = (p: Raw) => {
  const grade = String(p.grade).toUpperCase()
  const map: Record<string, number> = { 'SEA':30, 'ASG':30, 'POS':40, 'TEA':40, 'MMVP':40, 'ROY':50, 'HIT':50, 'ACE':50, 'GG':50, 'TOP':50, 'GGY':50, 'DGN':300 }
  return map[grade] || 0
}

const getBreakthroughFixed = (p: Raw, level: number) => {
  if (level === 0 || !p) return 0
  const grade = String(p.grade).toUpperCase()
  if (['SEA','ASG','POS'].includes(grade)) {
    const mults = [0, 1, 3, 6, 10, 15, 21, 28, 36]
    return 30 * (mults[level] || 0)
  } else if (['TEA','ROY','MMVP'].includes(grade)) {
    const mults = [0, 1, 3, 6, 10, 15, 21, 28, 36]
    return 50 * (mults[level] || 0)
  } else if (['HIT','ACE','GG','TOP','GGY'].includes(grade)) {
    const mults = [0, 1, 2.5, 4.5, 7, 10, 15, 21, 28] 
    return 100 * (mults[level] || 0)
  }
  return 0
}
const MANAGER_STATS_MY = [
  { main: 2, sub: 1 }, { main: 5, sub: 2 }, { main: 10, sub: 5 }, { main: 15, sub: 7 }, { main: 20, sub: 10 },
  { main: 50, sub: 25 }, { main: 55, sub: 27 }, { main: 60, sub: 30 }, { main: 65, sub: 32 }, { main: 70, sub: 35 },
  { main: 100, sub: 50 }, { main: 105, sub: 52 }, { main: 110, sub: 55 }, { main: 115, sub: 57 }, { main: 120, sub: 60 },
  { main: 150, sub: 75 }
];

const MANAGER_STATS_COM = [
  { main: 2, sub: 1 }, { main: 5, sub: 2 }, { main: 10, sub: 5 }, { main: 15, sub: 7 }, { main: 20, sub: 10 },
  { main: 45, sub: 20 }, { main: 50, sub: 22 }, { main: 55, sub: 25 }, { main: 60, sub: 27 }, { main: 65, sub: 30 },
  { main: 90, sub: 40 }, { main: 95, sub: 42 }, { main: 100, sub: 45 }, { main: 105, sub: 47 }, { main: 110, sub: 50 },
  { main: 135, sub: 60 }
];

const MANAGER_TYPES: Record<string, { main: string, sub: string }> = {
  '1st': { main: 'contact', sub: 'strikeoutAvoidance' },
  '2nd': { main: 'homeRunPower', sub: 'gapPower' },
  '3rd': { main: 'movement', sub: 'stuff' },
  '4th': { main: 'homeRunSuppression', sub: 'longHitSuppression' }
};

const getManagerBonusText = (typeKey: string, enhance: number) => {
  if (!typeKey) return '';
  const isMy = typeKey.startsWith('my_');
  const t = typeKey.split('_')[1];
  const table = isMy ? MANAGER_STATS_MY : MANAGER_STATS_COM;
  const level = Math.min(15, Math.max(0, enhance || 0));
  const stats = table[level];
  const mainName = STAT_LABELS[MANAGER_TYPES[t].main] || MANAGER_TYPES[t].main;
  const subName = STAT_LABELS[MANAGER_TYPES[t].sub] || MANAGER_TYPES[t].sub;
  return `${mainName} +${stats.main}, ${subName} +${stats.sub}`;
};

const computedPlayerStats = computed(() => {
  const result: Record<string, { power: number, stats: Record<string, number> }> = {}
  Object.keys(lineup.value).forEach(slot => {
    const p = lineup.value[slot]
    if (!p) return
    const buffs = playerBuffs.value[slot]
    if (!buffs) return

    const isPit = isPitcher(p);
    let baseSum = 0
    const coreStats = isPit ? ['movement', 'longHitSuppression', 'homeRunSuppression', 'control', 'stuff'] : ['contact', 'gapPower', 'homeRunPower', 'plateDiscipline', 'strikeoutAvoidance']
    const nonCoreStats = isPit ? ['defense', 'pitchLimit', 'runnerControl'] : ['stealing', 'baseRunning', 'defense']
    coreStats.forEach(s => baseSum += Number(p[s] || 0))
    nonCoreStats.forEach(s => baseSum += Number(p[s] || 0))
    
    const pTeams = toArray(p.team).map(toLowerCase);
    const isMyTeam = (globalBuffs.preferredTeam || []).some(t => pTeams.includes(t));
    const appliedTeamLevelBuff = getTeamLevelPower(globalBuffs.teamLevel, isMyTeam);
    const growthA = Number(Math.max(0, buffs.playerLevel - 1) * 10) + buffs.collectionBuff + appliedTeamLevelBuff + buffs.careerLevelBuff + (buffs.enhancementLevel * getEnhanceMultiplier(p))
    const flatC = buffs.binderBuff + globalBuffs.clanBuff + buffs.careerAllStatFlat + getBreakthroughFixed(p, buffs.breakthroughLevel)
    
    const is1st2ndSP = slot === 'SP1' || slot === 'SP2';
    const imprintStarterAddedPower = is1st2ndSP ? buffs.imprintStarterPower : 0;
    
    let autoSynergyFixed = 0, autoSynergyPercent = 0, skillPowerPercent = 0, statSpecificSkillPercents: Record<string, number> = {}
    activeTeamSynergies.value.forEach(syn => {
      if (isPlayerReceivingSynergy(p, syn.name)) {
        syn.bonuses.forEach(b => {
           if (b.stat === 'power') {
            if (b.bonus.unit === 'fixed') autoSynergyFixed += b.bonus.value
            else if (b.bonus.unit === 'percent') autoSynergyPercent += b.bonus.value
          }
        })
      }
    })
    const careerTeamPower = getSameTeamCount(p) * 2 * getCareerTeamMultiplier(buffs.careerTeamCount);
    const autoTeamDignityBuff = calculateTeamPlayerDignityBuff(p);

    const pGrade = String(p.grade || '').toUpperCase();
    const dynamicHitAceBuff = ['HIT', 'ACE', 'GG'].includes(pGrade) ? getSameTeamCount(p) * 32 : 0;
    
    const growthB = careerTeamPower + dynamicHitAceBuff + autoTeamDignityBuff + autoSynergyFixed + imprintStarterAddedPower;
    
    buffs.selectedSkills.forEach(s => {
      if (isSkillActive(s, slot, buffs.battingOrder)) {
         const eff = SKILL_EFFECTS[s]
         if (eff) {
           skillPowerPercent += eff.powerPercent || 0
           for (const [k, v] of Object.entries(eff.stats || {})) statSpecificSkillPercents[k] = (statSpecificSkillPercents[k] || 0) + Number(v)
         }
      }
    })
    const globalPercent = skillPowerPercent + autoSynergyPercent + buffs.ultimateImprintPercent
    const globalPercentPool = coreStats.reduce((acc, s) => acc + Number(p[s]||0), 0) + nonCoreStats.reduce((acc, s) => acc + Number(p[s]||0), 0) + growthA
    const globalBonusTotal = globalPercentPool * (globalPercent / 100)
    
    let managerMainStat = 0;
    let managerSubStat = 0;
    let managerMainName = '';
    let managerSubName = '';
    
    if (globalBuffs.managerType) {
      const isMy = globalBuffs.managerType.startsWith('my_');
      const typeStr = globalBuffs.managerType.split('_')[1];
      const table = isMy ? MANAGER_STATS_MY : MANAGER_STATS_COM;
      const level = Math.min(15, Math.max(0, globalBuffs.managerEnhance || 0));
      managerMainStat = table[level].main;
      managerSubStat = table[level].sub;
      managerMainName = MANAGER_TYPES[typeStr].main;
      managerSubName = MANAGER_TYPES[typeStr].sub;
    }

    let finalTotal = 0
    const stats: Record<string, number> = {}

    // 🌟 1. 각인 스탯 미리 계산 (주옵/부옵을 5대 스탯에 정확히 분배) 🌟
    let imprintStatBonus: Record<string, number> = {};
    let imprintGeneralPower = 0; 
    
    if (buffs) {
      const applyImp = (imp: Imprint) => {
         if(!imp) return;
         
         const statKeyMap: Record<string, string> = {
           '컨택': 'contact', '갭파워': 'gapPower', '홈런파워': 'homeRunPower', '선구': 'plateDiscipline', '삼진회피': 'strikeoutAvoidance',
           '무브먼트': 'movement', '장타억제': 'longHitSuppression', '홈런억제': 'homeRunSuppression', '컨트롤': 'control', '스터프': 'stuff',
           '수비': 'defense', '한계투구 증가': 'pitchLimit'
         };
         
         const mainKey = statKeyMap[imp.mainStat];
         if (mainKey) imprintStatBonus[mainKey] = (imprintStatBonus[mainKey] || 0) + imp.mainPower;
         else imprintGeneralPower += imp.mainPower;

         imp.subOptions.forEach(opt => {
           if (opt.type === '전체 능력치') {
             coreStats.forEach(c => imprintStatBonus[c] = (imprintStatBonus[c] || 0) + opt.value);
           } else if (opt.type !== '수익 증가') {
             const subKey = statKeyMap[opt.type];
             if (subKey) imprintStatBonus[subKey] = (imprintStatBonus[subKey] || 0) + opt.value;
             else imprintGeneralPower += opt.value;
           }
         });

         if (imp.ultimateBonus && pGrade === imp.ultimateBonus.targetGrade) {
           imprintGeneralPower += imp.ultimateBonus.power;
         }
      };
      applyImp(buffs.imprint1);
      applyImp(buffs.imprint2);
    }

    // 🌟 2. 세부 스탯 및 최종 파워 계산 🌟
    coreStats.forEach(s => {
      const base = Number(p[s] || 0)
      let preSpec = base + (growthA/5) + (growthB/5) + (globalBonusTotal/5)
      let specBonus = preSpec * ((statSpecificSkillPercents[s] || 0) / 100)
      let val = preSpec + specBonus + (flatC/5)
      if (s === managerMainName) val += managerMainStat;
      if (s === managerSubName) val += managerSubStat;
      
      val += Number(buffs.careerStats?.[s] || 0) + Number(buffs.imprintStats?.[s] || 0)
      val += Number(buffs.imprintCoreStat || 0) + Number(buffs.careerCoreStat || 0)
      
      val += Number(imprintStatBonus[s] || 0)

      stats[s] = Math.round(val)
      finalTotal += val
    })
    
    nonCoreStats.forEach(s => {
      let base = Number(p[s] || 0)
      if (statSpecificSkillPercents[s]) base += base * (statSpecificSkillPercents[s] / 100)
      let val = base
      if (s === managerMainName) val += managerMainStat;
      if (s === managerSubName) val += managerSubStat;
      val += Number(buffs.careerStats?.[s] || 0) + Number(buffs.imprintStats?.[s] || 0)
      
      val += Number(imprintStatBonus[s] || 0)

      stats[s] = Math.round(val)
      finalTotal += val
    })

    finalTotal += imprintGeneralPower;

    result[slot] = { power: Math.round(finalTotal), stats }
  })
  return result
})

const calculatePlayerPower = (p: Raw, slot: string) => computedPlayerStats.value[slot]?.power || 0

const teamTotalPower = computed(() => {
  let sum = 0
  Object.keys(lineup.value).forEach(slot => {
    if (slot.startsWith('BENCH')) return 
    sum += computedPlayerStats.value[slot]?.power || 0
  })
  return sum
})

const isSamePlayer = (p1: Raw, p2: Raw) => {
  return p1.id === p2.id;
}

const getAvailableSlot = (basePos: string): string => {
  if (isManualSelection.value && selectedSlot.value && selectedSlot.value.startsWith(basePos)) {
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
  Object.keys(lineup.value).forEach(k => { 
    if (lineup.value[k] && isSamePlayer(lineup.value[k]!, p)) lineup.value[k] = null 
  })
  const targetSlot = getAvailableSlot(posOrSlot)
  lineup.value[targetSlot] = p
  initPlayerBuff(targetSlot, p)
  selectedSlot.value = targetSlot
  isManualSelection.value = false 
  rightPanelTab.value = 'player'
}

const clearSlot = (pos: string) => {
  // 1. 라인업에서 선수 이름표만 뗍니다.
  lineup.value[pos] = null
  
  // 🌟 핵심: 기존에는 여기에 delete playerBuffs.value[pos] 같은 코드가 있어서 장비까지 날아갔습니다.
  // 이제 선수를 빼더라도 playerBuffs(각인 장비 데이터)는 절대 삭제하지 않고 칸에 그대로 남겨둡니다!

  // 2. 화면 초기화 (선택된 선수 화면 닫기)
  if (selectedSlot.value === pos) {
    selectedSlot.value = null
    rightPanelTab.value = 'global'
  }
}

// 🌟 드래그 앤 드롭으로 자리 맞바꾸기 로직 🌟
const onDragStart = (e: DragEvent, slot: string) => {
  if (!lineup.value[slot]) {
    e.preventDefault();
    return;
  }
  e.dataTransfer?.setData('text/plain', slot);
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
}

const onDrop = (e: DragEvent, targetSlot: string) => {
  const sourceSlot = e.dataTransfer?.getData('text/plain');
  if (!sourceSlot || sourceSlot === targetSlot) return;

  // 타자/투수 칸끼리 억지로 맞바꾸는 것 방지 (벤치는 자유롭게 이동 가능)
  const getGroup = (s: string) => s.startsWith('SP') || s.startsWith('RP') ? 'PITCHER' : s.startsWith('BENCH') ? 'BENCH' : 'BATTER';
  const sourceGroup = getGroup(sourceSlot);
  const targetGroup = getGroup(targetSlot);
  
  if (sourceGroup !== targetGroup && sourceGroup !== 'BENCH' && targetGroup !== 'BENCH') {
    alert('타자와 투수 칸은 서로 직접 바꿀 수 없습니다.');
    return;
  }

  // 1. 라인업 데이터(선수 본체) 맞교환
  const tempPlayer = lineup.value[targetSlot];
  lineup.value[targetSlot] = lineup.value[sourceSlot];
  lineup.value[sourceSlot] = tempPlayer;

  // 2. 장비(각인, 스킬, 성장 수치 등) 데이터 통째로 맞교환
  const tempBuff = playerBuffs.value[targetSlot];
  playerBuffs.value[targetSlot] = playerBuffs.value[sourceSlot];
  playerBuffs.value[sourceSlot] = tempBuff;

  // 3. 만약 화면에 띄워둔(선택된) 선수였다면, 바뀐 자리로 포커스 따라가기
  if (selectedSlot.value === sourceSlot) selectedSlot.value = targetSlot;
  else if (selectedSlot.value === targetSlot) selectedSlot.value = sourceSlot;
}  

const selectSlot = (slot: string) => { 
  selectedSlot.value = slot; 
  isManualSelection.value = true;
  if (lineup.value[slot]) { 
    rightPanelTab.value = 'player'; 
  } else {
    rightPanelTab.value = 'global';
  }
}

const fileInput = ref<HTMLInputElement | null>(null)

// 🌟 1. 공통 데이터 불러오기 (데이터 꼬임 방지 강력 버전) 🌟
const applyLoadedData = (data: any) => {
  if (data.lineup) lineup.value = JSON.parse(JSON.stringify(data.lineup));
  if (data.playerBuffs) playerBuffs.value = JSON.parse(JSON.stringify(data.playerBuffs));
  if (data.globalBuffs) {
    if (!data.globalBuffs.synergyMasteries) data.globalBuffs.synergyMasteries = ['', '', '', '', ''];
    if (data.globalBuffs.amplifiedMasteryIndex === undefined) data.globalBuffs.amplifiedMasteryIndex = -1;
    Object.assign(globalBuffs, JSON.parse(JSON.stringify(data.globalBuffs)));
  }
  if (data.imprintInventory) imprintInventory.value = JSON.parse(JSON.stringify(data.imprintInventory));

  // 🌟 핵심 패치: 파일 안에 다중 저장(multiSaves) 데이터가 있다면, 브라우저 메모리에 다시 복구시켜 줍니다!
  if (data.multiSaves && Object.keys(data.multiSaves).length > 0) {
    const existingSaves = JSON.parse(localStorage.getItem('9up_multi_saves') || '{}');
    const mergedSaves = { ...existingSaves, ...data.multiSaves }; // 기존 데이터가 있으면 안전하게 합치기
    localStorage.setItem('9up_multi_saves', JSON.stringify(mergedSaves));
  }

  // 불러올 때 화면 충돌 방지를 위해 빈 화면으로 깔끔하게 초기화
  selectedSlot.value = null; 
}

// 🌟 라인업 초기화 (각인 장비는 무조건 유지!) 🌟
const resetLineup = () => {
  if(!confirm('라인업의 모든 선수를 비우시겠습니까?\n(포지션에 장착된 각인 수치는 그대로 유지됩니다)')) return;
  Object.keys(lineup.value).forEach(slot => {
    lineup.value[slot] = null;
    if (playerBuffs.value[slot]) {
      const b = playerBuffs.value[slot];
      const savedImprintStats = { ...b.imprintStats }
      playerBuffs.value[slot] = {
        enhancementLevel: 15, breakthroughLevel: 0, careerTeamCount: 0, hitAceBuff: 0,
        imprintStarterPower: b.imprintStarterPower, careerAllStatFlat: 0, 
        imprintCoreStat: b.imprintCoreStat, careerCoreStat: 0,
        selectedSkills: [], battingOrder: null, playerLevel: 100, collectionBuff: 1200, careerLevelBuff: 149,
        binderBuff: 537, ultimateImprintPercent: b.ultimateImprintPercent,
        imprintStats: savedImprintStats, careerStats: {}
      }
    }
  })
  selectedSlot.value = null;
  isManualSelection.value = false;
  rightPanelTab.value = 'global';
}

// 🌟 다중 페이지 저장 (이름 지정) 🌟
const saveToLocalStorage = () => {
  const saveName = prompt('저장할 라인업 이름을 입력하세요:\n(예: 국대전용, 홈런타자세팅 등)');
  if (!saveName) return;
  const saveData = { lineup: lineup.value, playerBuffs: playerBuffs.value, globalBuffs: globalBuffs, imprintInventory: imprintInventory.value }
  let saves = JSON.parse(localStorage.getItem('9up_multi_saves') || '{}')
  saves[saveName] = saveData
  localStorage.setItem('9up_multi_saves', JSON.stringify(saves))
  alert(`'${saveName}' 라인업이 브라우저에 저장되었습니다.`)
}

// 🌟 다중 페이지 불러오기 (목록에서 선택) 🌟
const loadFromLocalStorage = () => {
  const saves = JSON.parse(localStorage.getItem('9up_multi_saves') || '{}')
  const saveNames = Object.keys(saves)
  if (saveNames.length === 0) {
    alert('브라우저에 저장된 라인업이 없습니다.'); return;
  }
  const msg = '불러올 라인업 번호를 입력하세요:\n\n' + saveNames.map((n, i) => `${i + 1}. ${n}`).join('\n')
  const choice = prompt(msg)
  if (!choice) return;
  const idx = parseInt(choice) - 1
  if (idx >= 0 && idx < saveNames.length) {
    applyLoadedData(saves[saveNames[idx]])
    alert(`'${saveNames[idx]}' 라인업을 불러왔습니다.`)
  } else {
    alert('잘못된 번호입니다.')
  }
}

// 🌟 파일 내보내기 (다중 저장 리스트까지 싹 다 파일 안에 압축 저장!) 🌟
const exportToFile = () => {
  const defaultName = `9up_lineup_${new Date().toISOString().slice(0,10)}`
  const fileName = prompt('저장할 파일 이름을 입력하세요:', defaultName)
  if (!fileName) return; 
  
  // 브라우저에 있는 다중 저장 리스트 가져오기
  const multiSaves = JSON.parse(localStorage.getItem('9up_multi_saves') || '{}');

  // 현재 데이터 + 각인 보관함 + 다중 저장 리스트 전부 묶기!
  const saveData = { 
    lineup: lineup.value, 
    playerBuffs: playerBuffs.value, 
    globalBuffs: globalBuffs, 
    imprintInventory: imprintInventory.value,
    multiSaves: multiSaves 
  }
  
  const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName.endsWith('.json') ? fileName : `${fileName}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const triggerFileInput = () => { fileInput.value?.click() }

// 🌟 2. 파일 불러오기 기능 (다중 저장 복구 안내 메시지 추가) 🌟
const importFromFile = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const result = e.target?.result as string
      if (!result) throw new Error("파일이 비어있습니다.");
      
      const data = JSON.parse(result)
      applyLoadedData(data)
      
      // 파일 안에 다중 저장 데이터가 포함되어 있다면 알림창에 내용 추가!
      const msg = data.multiSaves && Object.keys(data.multiSaves).length > 0
        ? '✅ 파일 불러오기 완료!\n(다중 저장 목록도 무사히 복구되었습니다!)'
        : '✅ 파일에서 라인업을 성공적으로 불러왔습니다!';
      alert(msg)
      
    } catch (err: any) {
      console.error("파일 파싱 에러:", err)
      alert('❌ 파일 불러오기 실패: 형식이 맞지 않거나 손상된 파일입니다.\n(' + err.message + ')')
    } finally {
      if (fileInput.value) fileInput.value.value = ''
    }
  }
  reader.readAsText(file)
}

// 🌟 새로고침/재접속 시 데이터가 날아가지 않도록 실시간 백업 🌟
// 감시망(watch)에 imprintInventory를 추가해서 각인을 만들거나 삭제할 때마다 즉시 자동 저장됩니다.
watch([lineup, playerBuffs, globalBuffs, imprintInventory], () => {
  const autoSaveData = { lineup: lineup.value, playerBuffs: playerBuffs.value, globalBuffs: globalBuffs, imprintInventory: imprintInventory.value }
  localStorage.setItem('9up_auto_save', JSON.stringify(autoSaveData))
}, { deep: true })
  
const getPlayerPositions = (p: Raw) => {
  if (!p) return [];
  return Array.from(new Set(getArray(p.position).map(normalizePosition))).filter(Boolean);
}

const hideImage = (e: Event) => {
  if (e && e.target) {
    (e.target as HTMLElement).style.display = 'none';
  }
}

const activeFilterCount = computed(() => {
  let count = 0;
  count += searchQuery.position.length;
  count += searchQuery.team.length;
  count += searchQuery.synergy.length;
  count += searchQuery.grade.length;
  count += searchQuery.rarity !== null ? 1 : 0;
  return count;
});

const getAvailableSkills = (p: Raw | null) => {
  if (!p) return [];
  const excluded = ['야전사령관', '인사이드 워크', '투수 리드', '친화력', '도루 저지'];
  const rawSkills = [...getArray(p.skill), ...getArray(p.enhancedSkill)];
  return Array.from(new Set(rawSkills.filter(s => !excluded.includes(s))));
}

const togglePlayerSkill = (sk: string) => {
  if (!selectedSlot.value || !lineup.value[selectedSlot.value] || !playerBuffs.value[selectedSlot.value]) return;
  const p = lineup.value[selectedSlot.value];
  const buffs = playerBuffs.value[selectedSlot.value];
  const arr = buffs.selectedSkills;
  const rarity = parseInt(String(p?.rarity || 1), 10) || 1;
  const max = Math.min(3, Math.max(1, rarity - 1));
  
  const idx = arr.indexOf(sk);
  if (idx > -1) {
    arr.splice(idx, 1);
  } else if (arr.length < max) {
    arr.push(sk);
  }
}

const getMaxSkillCount = (p: Raw | null) => {
  if (!p) return 0;
  return Math.min(3, Math.max(1, (parseInt(String(p?.rarity || 1), 10) || 1) - 1));
}

const formatBonuses = (bonuses: { stat: string, bonus: JsonBonus }[]) => {
  if (!bonuses || !Array.isArray(bonuses)) return '';
  return bonuses.map(b => {
    const statName = b.stat === 'power' ? '파워' : STAT_LABELS[b.stat] || b.stat;
    const val = b.bonus.value;
    const unit = b.bonus.unit === 'percent' ? '%' : '';
    return `${statName} +${val}${unit}`;
  }).join(', ');
}

onMounted(async () => {
  // 🌟 사이트 켜자마자 자동 백업된 데이터 복구 🌟
  const saved = localStorage.getItem('9up_auto_save')
  if (saved) {
    try { applyLoadedData(JSON.parse(saved)) } catch(e) {}
  }

  try {
    const [csvRes, synRes, teamRes] = await Promise.all([
      fetch('/DB/player_sorted.csv', { cache: 'no-store' }), fetch('/DB/synergys.json', { cache: 'no-store' }), fetch('/DB/setting.json', { cache: 'no-store' })
    ])
    if (teamRes.ok) teamData.value = await teamRes.json()
    const text = await csvRes.text()
    
    // 원본 코드로 깔끔하게 복구
    Papa.parse(text, { header: true, skipEmptyLines: true, complete: ({ data }) => (players.value = data as Raw[]) })

    if (synRes.ok) {
        const synJson = await synRes.json()
        synergys.value = (Array.isArray(synJson) ? synJson : []).filter((it: any) => Array.isArray(it?.conditions) && it.conditions.length > 0)
        const options: string[] = Array.isArray(synJson) ? synJson.map((item: any) => (typeof item === 'string' ? item : item?.synergy)).filter(Boolean) : []
        synergyOptions.value = Array.from(new Set(options.map(s => String(s).trim()))).sort((a,b)=>a.localeCompare(b))
    }
  } catch(e) { 
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
        <div class="flex items-center gap-3">
<!-- 🌟 핵심 투명 파일 입력기 (절대 지우면 안 됨!) 🌟 -->
          <input type="file" ref="fileInput" accept=".json" class="hidden" @change="importFromFile" />
          
          <div class="flex items-center bg-black/20 rounded-lg p-1 border border-white/10 shadow-inner">
             <button @click="saveToLocalStorage" class="p-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-md transition-colors flex items-center gap-1" title="브라우저에 이름 지정하여 저장"><Save class="w-4 h-4" /><span class="text-[10px] font-bold hidden sm:block">다중 저장</span></button>
             <button @click="loadFromLocalStorage" class="p-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-md transition-colors flex items-center gap-1" title="브라우저에서 선택하여 불러오기"><FolderOpen class="w-4 h-4" /><span class="text-[10px] font-bold hidden sm:block">불러오기</span></button>
             <div class="w-px h-4 bg-white/20 mx-1"></div>
             <button @click="exportToFile" class="p-2 text-emerald-200 hover:text-white hover:bg-white/10 rounded-md transition-colors flex items-center gap-1" title="PC에 파일로 내보내기"><Download class="w-4 h-4" /><span class="text-[10px] font-bold hidden sm:block">파일 저장</span></button>
             <button @click="triggerFileInput" class="p-2 text-emerald-200 hover:text-white hover:bg-white/10 rounded-md transition-colors flex items-center gap-1" title="PC에서 파일 불러오기"><Upload class="w-4 h-4" /><span class="text-[10px] font-bold hidden sm:block">파일 열기</span></button>
             <div class="w-px h-4 bg-white/20 mx-1"></div>
             <button @click="resetLineup" class="p-2 text-rose-300 hover:text-white hover:bg-rose-500/50 rounded-md transition-colors flex items-center gap-1" title="각인 유지하고 라인업 초기화"><X class="w-4 h-4" /><span class="text-[10px] font-bold hidden sm:block">초기화</span></button>
          </div>

          <div class="flex items-center bg-black/20 rounded-xl px-5 py-2 border border-white/10 shadow-inner">
            <span class="text-blue-200 text-sm font-semibold mr-3">우리 팀 종합 파워</span>
            <span class="text-3xl font-black text-amber-300 tabular-nums tracking-tight">{{ teamTotalPower.toLocaleString() }}</span>
          </div>
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
                  {{ activeFilterCount }}
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
                    <img :src="`/assets/logos/grade/${grade}.png`" :alt="grade" class="w-full h-8 object-contain scale-[1.3]" @error="hideImage" />
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
                    <img v-if="getTeamLogoUrl(group.id[0])" :src="getTeamLogoUrl(group.id[0])" :alt="group.name" class="w-8 h-8 object-contain" @error="hideImage" />
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
                <img :src="`/assets/logos/grade/${player.grade}.png`" :alt="player.grade" class="h-10 w-10 rounded-md object-contain ring-1 ring-neutral-200 dark:ring-neutral-600 flex-shrink-0" @error="hideImage"/>
                <div class="min-w-0 flex-1">
                  <div class="mb-1 flex items-center gap-2">
                    <h3 class="truncate text-base font-semibold text-neutral-900 dark:text-neutral-100">{{ player.name }}</h3>
                    <div class="flex">
                      <Star v-for="k in (parseInt(String(player.rarity)) || 1)" :key="k" class="h-3 w-3 text-amber-400" fill="currentColor" />
                    </div>
                  </div>
                  <div class="mb-3 flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                    <img :src="getTeamLogoUrl(player.team)" :alt="player.team" class="h-4 w-4 flex-shrink-0" @error="hideImage" />
                    <span class="truncate">{{ findTeamName(player.team) }}</span>
                    <span>·</span>
                    <span>{{ player.year }}</span>
                  </div>
                  <div class="flex flex-wrap gap-1.5">
                    <button
                        v-for="pos in getPlayerPositions(player)"
                        :key="pos"
                        @click="assignPlayerToSlot(pos, player)"
                        class="rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 px-3 py-1 text-[11px] hover:bg-indigo-50 dark:hover:bg-indigo-900/40 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
                    >{{ pos }}</button>
                    <button
                        v-if="!isPitcher(player)"
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
            <!-- 타자 다이아몬드 UI -->
            <div v-if="lineupViewMode === 'batter'" class="h-full flex flex-col justify-center items-center">
               <div class="grid grid-cols-3 gap-4 w-full max-w-lg mb-8">
                 <div v-for="pos in ['LF', 'CF', 'RF']" :key="pos" @dragover.prevent @drop="onDrop($event, pos)">
                   <div v-if="!lineup[pos]" class="h-[100px] border border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all border-neutral-300 dark:border-neutral-600 bg-neutral-50/50 dark:bg-neutral-800/30 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 text-neutral-400" :class="{'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30': selectedSlot === pos}" @click="selectSlot(pos)"><span class="text-[10px] font-bold">{{ pos }}</span></div>
                   <div v-else draggable="true" @dragstart="onDragStart($event, pos)" class="relative h-[100px] border rounded-xl flex flex-col items-center p-2 cursor-pointer transition-all shadow-sm group bg-white dark:bg-neutral-800 hover:border-indigo-300 dark:hover:border-indigo-500" :class="{'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-200 dark:ring-indigo-800': selectedSlot === pos, 'border-neutral-200 dark:border-neutral-600': selectedSlot !== pos}" @click="selectSlot(pos)">
                      <div class="absolute top-1 left-2 text-[9px] font-black text-neutral-400 dark:text-neutral-500">{{ pos }}</div>
                      <button class="absolute top-1 right-1 w-4 h-4 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 hover:bg-red-500 hover:text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity" @click.stop="clearSlot(pos)">×</button>
                      <img :src="`/assets/logos/grade/${lineup[pos].grade}.png`" class="w-8 h-8 object-contain mt-1 drop-shadow-sm" @error="hideImage" />
                      <div class="text-xs font-bold text-neutral-800 dark:text-neutral-200 mt-1 truncate w-full text-center">{{ lineup[pos].name }}</div>
                      <div class="text-[10px] font-black text-blue-600 dark:text-blue-400 mt-0.5 tracking-tight">{{ calculatePlayerPower(lineup[pos], pos).toLocaleString() }}</div>
                      <div v-if="playerBuffs[pos]?.battingOrder && !isPitcher(lineup[pos])" class="absolute bottom-1 left-2 text-[9px] font-bold bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 px-1 rounded">{{ playerBuffs[pos].battingOrder }}번</div>
                      <div class="absolute bottom-1 right-2 text-[11px] font-black text-indigo-600 dark:text-indigo-400">설정➔</div>
                   </div>
                 </div>
               </div>
               <div class="grid grid-cols-4 gap-4 w-full max-w-2xl mb-8">
                 <div v-for="pos in ['3B', 'SS', '2B', '1B']" :key="pos" @dragover.prevent @drop="onDrop($event, pos)">
                   <div v-if="!lineup[pos]" class="h-[100px] border border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all border-neutral-300 dark:border-neutral-600 bg-neutral-50/50 dark:bg-neutral-800/30 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 text-neutral-400" :class="{'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30': selectedSlot === pos}" @click="selectSlot(pos)"><span class="text-[10px] font-bold">{{ pos }}</span></div>
                   <div v-else draggable="true" @dragstart="onDragStart($event, pos)" class="relative h-[100px] border rounded-xl flex flex-col items-center p-2 cursor-pointer transition-all shadow-sm group bg-white dark:bg-neutral-800 hover:border-indigo-300 dark:hover:border-indigo-500" :class="{'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-200 dark:ring-indigo-800': selectedSlot === pos, 'border-neutral-200 dark:border-neutral-600': selectedSlot !== pos}" @click="selectSlot(pos)">
                      <div class="absolute top-1 left-2 text-[9px] font-black text-neutral-400 dark:text-neutral-500">{{ pos }}</div>
                      <button class="absolute top-1 right-1 w-4 h-4 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 hover:bg-red-500 hover:text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity" @click.stop="clearSlot(pos)">×</button>
                      <img :src="`/assets/logos/grade/${lineup[pos].grade}.png`" class="w-8 h-8 object-contain mt-1 drop-shadow-sm" @error="hideImage" />
                      <div class="text-xs font-bold text-neutral-800 dark:text-neutral-200 mt-1 truncate w-full text-center">{{ lineup[pos].name }}</div>
                      <div class="text-[10px] font-black text-blue-600 dark:text-blue-400 mt-0.5 tracking-tight">{{ calculatePlayerPower(lineup[pos], pos).toLocaleString() }}</div>
                      <div v-if="playerBuffs[pos]?.battingOrder && !isPitcher(lineup[pos])" class="absolute bottom-1 left-2 text-[9px] font-bold bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 px-1 rounded">{{ playerBuffs[pos].battingOrder }}번</div>
                      <div class="absolute bottom-1 right-2 text-[11px] font-black text-indigo-600 dark:text-indigo-400">설정➔</div>
                   </div>
                 </div>
               </div>
               <div class="grid grid-cols-2 gap-16 w-full max-w-md">
                 <div v-for="pos in ['C', 'DH']" :key="pos" @dragover.prevent @drop="onDrop($event, pos)">
                   <div v-if="!lineup[pos]" class="h-[100px] border border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all border-neutral-300 dark:border-neutral-600 bg-neutral-50/50 dark:bg-neutral-800/30 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 text-neutral-400" :class="{'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30': selectedSlot === pos}" @click="selectSlot(pos)"><span class="text-[10px] font-bold">{{ pos }}</span></div>
                   <div v-else draggable="true" @dragstart="onDragStart($event, pos)" class="relative h-[100px] border rounded-xl flex flex-col items-center p-2 cursor-pointer transition-all shadow-sm group bg-white dark:bg-neutral-800 hover:border-indigo-300 dark:hover:border-indigo-500" :class="{'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-200 dark:ring-indigo-800': selectedSlot === pos, 'border-neutral-200 dark:border-neutral-600': selectedSlot !== pos}" @click="selectSlot(pos)">
                      <div class="absolute top-1 left-2 text-[9px] font-black text-neutral-400 dark:text-neutral-500">{{ pos }}</div>
                      <button class="absolute top-1 right-1 w-4 h-4 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 hover:bg-red-500 hover:text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity" @click.stop="clearSlot(pos)">×</button>
                      <img :src="`/assets/logos/grade/${lineup[pos].grade}.png`" class="w-8 h-8 object-contain mt-1 drop-shadow-sm" @error="hideImage" />
                      <div class="text-xs font-bold text-neutral-800 dark:text-neutral-200 mt-1 truncate w-full text-center">{{ lineup[pos].name }}</div>
                      <div class="text-[10px] font-black text-blue-600 dark:text-blue-400 mt-0.5 tracking-tight">{{ calculatePlayerPower(lineup[pos], pos).toLocaleString() }}</div>
                      <div v-if="playerBuffs[pos]?.battingOrder && !isPitcher(lineup[pos])" class="absolute bottom-1 left-2 text-[9px] font-bold bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 px-1 rounded">{{ playerBuffs[pos].battingOrder }}번</div>
                      <div class="absolute bottom-1 right-2 text-[11px] font-black text-indigo-600 dark:text-indigo-400">설정➔</div>
                   </div>
                 </div>
               </div>
            </div>

            <!-- 투수 UI -->
            <div v-else-if="lineupViewMode === 'pitcher'" class="space-y-8">
              <div>
                <h3 class="text-xs font-bold text-neutral-500 mb-3 ml-1">선발 투수</h3>
                <div class="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  <div v-for="i in 5" :key="'SP'+i" @dragover.prevent @drop="onDrop($event, 'SP'+i)">
                     <div v-if="!lineup['SP'+i]" class="h-[100px] border border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all border-neutral-300 dark:border-neutral-600 bg-neutral-50/50 dark:bg-neutral-800/30 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 text-neutral-400" :class="{'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30': selectedSlot === 'SP'+i}" @click="selectSlot('SP'+i)"><span class="text-[10px] font-bold">{{ 'SP'+i }}</span></div>
                   <div v-else draggable="true" @dragstart="onDragStart($event, 'SP'+i)" class="relative h-[100px] border rounded-xl flex flex-col items-center p-2 cursor-pointer transition-all shadow-sm group bg-white dark:bg-neutral-800 hover:border-indigo-300 dark:hover:border-indigo-500" :class="{'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-200 dark:ring-indigo-800': selectedSlot === 'SP'+i, 'border-neutral-200 dark:border-neutral-600': selectedSlot !== 'SP'+i}" @click="selectSlot('SP'+i)">
                      <div class="absolute top-1 left-2 text-[9px] font-black text-neutral-400 dark:text-neutral-500">{{ 'SP'+i }}</div>
                      <button class="absolute top-1 right-1 w-4 h-4 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 hover:bg-red-500 hover:text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity" @click.stop="clearSlot('SP'+i)">×</button>
                      <img :src="`/assets/logos/grade/${lineup['SP'+i].grade}.png`" class="w-8 h-8 object-contain mt-1 drop-shadow-sm" @error="hideImage" />
                      <div class="text-xs font-bold text-neutral-800 dark:text-neutral-200 mt-1 truncate w-full text-center">{{ lineup['SP'+i].name }}</div>
                        <div class="text-[10px] font-black text-blue-600 dark:text-blue-400 mt-0.5 tracking-tight">{{ calculatePlayerPower(lineup['SP'+i], 'SP'+i).toLocaleString() }}</div>
                      <div v-if="playerBuffs['SP'+i]?.battingOrder && !isPitcher(lineup['SP'+i])" class="absolute bottom-1 left-2 text-[9px] font-bold bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 px-1 rounded">{{ playerBuffs['SP'+i].battingOrder }}번</div>
                      <div class="absolute bottom-1 right-2 text-[11px] font-black text-indigo-600 dark:text-indigo-400">설정➔</div>
                   </div>
                  </div>
                </div>
              </div>
              <div>
                <h3 class="text-xs font-bold text-neutral-500 mb-3 ml-1">계투 및 마무리</h3>
                <div class="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  <div v-for="i in 6" :key="'RP'+i" @dragover.prevent @drop="onDrop($event, 'RP'+i)">
                     <div v-if="!lineup['RP'+i]" class="h-[100px] border border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all border-neutral-300 dark:border-neutral-600 bg-neutral-50/50 dark:bg-neutral-800/30 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 text-neutral-400" :class="{'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30': selectedSlot === 'RP'+i}" @click="selectSlot('RP'+i)"><span class="text-[10px] font-bold">{{ 'RP'+i }}</span></div>
                   <div v-else draggable="true" @dragstart="onDragStart($event, 'RP'+i)" class="relative h-[100px] border rounded-xl flex flex-col items-center p-2 cursor-pointer transition-all shadow-sm group bg-white dark:bg-neutral-800 hover:border-indigo-300 dark:hover:border-indigo-500" :class="{'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-200 dark:ring-indigo-800': selectedSlot === 'RP'+i, 'border-neutral-200 dark:border-neutral-600': selectedSlot !== 'RP'+i}" @click="selectSlot('RP'+i)">
                      <div class="absolute top-1 left-2 text-[9px] font-black text-neutral-400 dark:text-neutral-500">{{ 'RP'+i }}</div>
                      <button class="absolute top-1 right-1 w-4 h-4 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 hover:bg-red-500 hover:text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity" @click.stop="clearSlot('RP'+i)">×</button>
                      <img :src="`/assets/logos/grade/${lineup['RP'+i].grade}.png`" class="w-8 h-8 object-contain mt-1 drop-shadow-sm" @error="hideImage" />
                      <div class="text-xs font-bold text-neutral-800 dark:text-neutral-200 mt-1 truncate w-full text-center">{{ lineup['RP'+i].name }}</div>
                        <div class="text-[10px] font-black text-blue-600 dark:text-blue-400 mt-0.5 tracking-tight">{{ calculatePlayerPower(lineup['RP'+i], 'RP'+i).toLocaleString() }}</div>
                      <div v-if="playerBuffs['RP'+i]?.battingOrder && !isPitcher(lineup['RP'+i])" class="absolute bottom-1 left-2 text-[9px] font-bold bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 px-1 rounded">{{ playerBuffs['RP'+i].battingOrder }}번</div>
                      <div class="absolute bottom-1 right-2 text-[11px] font-black text-indigo-600 dark:text-indigo-400">설정➔</div>
                   </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 벤치 UI -->
            <div v-else class="space-y-4">
               <h3 class="text-xs font-bold text-neutral-500 mb-3 ml-1">벤치 멤버</h3>
               <div class="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  <div v-for="i in 8" :key="'BENCH'+i" @dragover.prevent @drop="onDrop($event, 'BENCH'+i)">
                     <div v-if="!lineup['BENCH'+i]" class="h-[100px] border border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all border-neutral-300 dark:border-neutral-600 bg-neutral-50/50 dark:bg-neutral-800/30 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 text-neutral-400" :class="{'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30': selectedSlot === 'BENCH'+i}" @click="selectSlot('BENCH'+i)"><span class="text-[10px] font-bold">{{ 'BENCH'+i }}</span></div>
                   <div v-else draggable="true" @dragstart="onDragStart($event, 'BENCH'+i)" class="relative h-[100px] border rounded-xl flex flex-col items-center p-2 cursor-pointer transition-all shadow-sm group bg-white dark:bg-neutral-800 hover:border-indigo-300 dark:hover:border-indigo-500" :class="{'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-200 dark:ring-indigo-800': selectedSlot === 'BENCH'+i, 'border-neutral-200 dark:border-neutral-600': selectedSlot !== 'BENCH'+i}" @click="selectSlot('BENCH'+i)">
                      <div class="absolute top-1 left-2 text-[9px] font-black text-neutral-400 dark:text-neutral-500">{{ 'BENCH'+i }}</div>
                      <button class="absolute top-1 right-1 w-4 h-4 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 hover:bg-red-500 hover:text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity" @click.stop="clearSlot('BENCH'+i)">×</button>
                      <img :src="`/assets/logos/grade/${lineup['BENCH'+i].grade}.png`" class="w-8 h-8 object-contain mt-1 drop-shadow-sm" @error="hideImage" />
                      <div class="text-xs font-bold text-neutral-800 dark:text-neutral-200 mt-1 truncate w-full text-center">{{ lineup['BENCH'+i].name }}</div>
                        <div class="text-[10px] font-black text-neutral-500 dark:text-neutral-400 mt-0.5 tracking-tight">{{ calculatePlayerPower(lineup['BENCH'+i], 'BENCH'+i).toLocaleString() }}</div>
                      <div v-if="playerBuffs['BENCH'+i]?.battingOrder && !isPitcher(lineup['BENCH'+i])" class="absolute bottom-1 left-2 text-[9px] font-bold bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 px-1 rounded">{{ playerBuffs['BENCH'+i].battingOrder }}번</div>
                      <div class="absolute bottom-1 right-2 text-[11px] font-black text-indigo-600 dark:text-indigo-400">설정➔</div>
                   </div>
                  </div>
               </div>
            </div>
          </div>
        </section>

        <!-- 오른쪽: 설정 패널 -->
        <section class="lg:col-span-4 flex flex-col rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 min-h-0 shadow-sm overflow-hidden">
          <div class="flex items-center bg-neutral-100 dark:bg-neutral-700/50 p-1 border-b border-neutral-200 dark:border-neutral-700 flex-shrink-0">
            <button @click="rightPanelTab = 'global'" :class="rightPanelTab === 'global' ? 'bg-white shadow-sm font-bold text-indigo-600' : 'text-neutral-500'" class="flex-1 py-2 text-xs rounded-lg transition-all flex items-center justify-center gap-1"><Users class="w-3 h-3"/> 공통 버프 설정</button>
            <button @click="rightPanelTab = 'player'" :class="rightPanelTab === 'player' ? 'bg-white shadow-sm font-bold text-indigo-600' : 'text-neutral-500'" class="flex-1 py-2 text-xs rounded-lg transition-all flex items-center justify-center gap-1"><UserCheck class="w-3 h-3"/> 선수 개인 설정</button>
          </div>

          <div class="flex-1 overflow-y-auto p-4 lg:p-5 custom-scrollbar">
            
            <!-- 글로벌 탭 -->
            <div v-if="rightPanelTab === 'global'" class="space-y-4 animate-in fade-in">
              
              <!-- 선호 구단 선택 -->
              <div class="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 shadow-sm flex-shrink-0">
                <h3 class="text-sm font-bold text-indigo-800 dark:text-indigo-300 mb-3 flex items-center gap-1"><Shield class="w-4 h-4"/> 선호 구단(자팀) 설정</h3>
                <div class="grid grid-cols-6 gap-1.5 mb-1">
                  <button v-for="group in groupedTeams" :key="'pref'+group.name" @click="globalBuffs.preferredTeam = group.id"
                      :class="globalBuffs.preferredTeam[0] === group.id[0] ? 'bg-indigo-200 dark:bg-indigo-800 border-indigo-500 shadow-md ring-2 ring-indigo-400' : 'bg-white dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600 opacity-60 hover:opacity-100'"
                      class="p-1 flex items-center justify-center rounded-lg border transition-all">
                    <img v-if="getTeamLogoUrl(group.id[0])" :src="getTeamLogoUrl(group.id[0])" class="w-8 h-8 object-contain" />
                  </button>
                </div>
              </div>

              <!-- 시너지 마스터리 설정 -->
              <div class="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 flex-shrink-0">
                <h3 class="text-sm font-bold text-indigo-800 dark:text-indigo-300 mb-2 flex items-center gap-1"><Sparkles class="w-4 h-4"/> 시너지 마스터리 설정</h3>
                <datalist id="synergy-list">
                  <option v-for="s in synergyOptions" :key="s" :value="s" />
                </datalist>
                <div class="space-y-2">
                  <div v-for="i in 5" :key="i" class="flex items-center gap-2">
                    <span class="text-[10px] font-bold text-neutral-500 w-6">칸 {{ i }}</span>
                    <input list="synergy-list" v-model="globalBuffs.synergyMasteries[i-1]" placeholder="시너지 검색..." class="w-full px-2 py-1 bg-white border rounded text-xs"/>
                    
                    <!-- 🌟 직관적인 증폭 On/Off 버튼 (오직 1개만 활성화) 🌟 -->
                    <label class="flex items-center justify-center cursor-pointer bg-white px-2 py-1.5 rounded border transition-colors shrink-0 select-none"
                           :class="globalBuffs.amplifiedMasteryIndex === i - 1 ? 'border-indigo-500 bg-indigo-100 dark:bg-indigo-900/50 shadow-inner' : 'border-neutral-200 hover:bg-neutral-50'">
                      <!-- 실제 동작은 체크박스처럼 하되 한 개만 켜지도록 제어 -->
                      <input type="checkbox" 
                             :checked="globalBuffs.amplifiedMasteryIndex === i - 1" 
                             @change="globalBuffs.amplifiedMasteryIndex = $event.target.checked ? i - 1 : -1" 
                             class="hidden" />
                      <span class="text-[10px] font-black tracking-tight" 
                            :class="globalBuffs.amplifiedMasteryIndex === i - 1 ? 'text-indigo-700 dark:text-indigo-300' : 'text-neutral-400'">
                        증폭
                      </span>
                    </label>
                  </div>
                  <div class="text-[10px] text-indigo-600 font-bold mt-1">※ '증폭' 버튼을 누르면 해당 시너지가 증폭됩니다. (최대 1개 지정, 다시 누르면 해제)</div>
                </div>
              </div>
              
              <!-- 공통 버프 입력 -->
              <div class="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 flex-shrink-0">
                <h3 class="text-sm font-bold text-indigo-800 dark:text-indigo-300 mb-3 flex items-center gap-1"><Users class="w-4 h-4"/> 팀 공통 버프</h3>
                <div class="grid grid-cols-2 gap-3">
                  <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold text-neutral-500">팀 레벨 (1~100)</label>
                    <input type="number" min="1" max="100" v-model.number="globalBuffs.teamLevel" class="w-full px-2 py-1.5 text-center bg-white border rounded-lg text-xs"/>
                  </div>
                  <div class="flex flex-col gap-1"><label class="text-[10px] font-bold text-neutral-500">클랜 레벨 파워</label><input type="number" v-model.number="globalBuffs.clanBuff" class="w-full px-2 py-1.5 text-center bg-white border rounded-lg text-xs"/></div>
                </div>
              </div>
              
              <!-- 자동 계산된 팀플/디그니티 합계 -->
              <div class="bg-indigo-50 dark:bg-indigo-900/10 p-3 rounded-xl border border-indigo-100 dark:border-indigo-800 shadow-sm flex-shrink-0">
                <h3 class="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 mb-2 flex items-center gap-1"><Zap class="w-3 h-3"/> 팀플/디그니티 버프 자동 적용</h3>
                <div class="grid grid-cols-2 gap-2">
                  <template v-for="teamId in Array.from(new Set(Object.values(lineup).filter(Boolean).flatMap(p => toArray(p.team).map(toLowerCase))))">
                     <div v-if="calculateTeamPlayerDignityBuff({ team: teamId }) > 0" class="flex justify-between items-center text-[10px] bg-white dark:bg-neutral-800 px-2 py-1.5 rounded border shadow-sm flex-shrink-0">
                       <span class="font-bold text-neutral-700">{{ findTeamName(teamId) }}</span>
                       <span class="text-indigo-600 font-black">+{{ calculateTeamPlayerDignityBuff({ team: teamId }) }}</span>
                     </div>
                  </template>
                </div>
              </div>
              
              <!-- 감독 카드 설정 -->
              <div class="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 shadow-sm flex-shrink-0">
                 <h3 class="text-sm font-bold text-indigo-800 dark:text-indigo-300 mb-3 flex items-center gap-1"><UserCheck class="w-4 h-4"/> 감독 카드 설정</h3>
                 <div class="grid grid-cols-2 gap-3">
                   <div class="flex flex-col gap-1">
                     <label class="text-[10px] font-bold text-neutral-500">감독 유형</label>
                     <select v-model="globalBuffs.managerType" class="w-full px-2 py-1.5 bg-white border rounded-lg text-xs font-medium">
                       <option value="">미장착</option>
                       <option value="my_1st">자팀 1st ({{ STAT_LABELS[MANAGER_TYPES['1st'].main] }} / {{ STAT_LABELS[MANAGER_TYPES['1st'].sub] }})</option>
                       <option value="com_1st">공통 1st ({{ STAT_LABELS[MANAGER_TYPES['1st'].main] }} / {{ STAT_LABELS[MANAGER_TYPES['1st'].sub] }})</option>
                       <option value="my_2nd">자팀 2nd ({{ STAT_LABELS[MANAGER_TYPES['2nd'].main] }} / {{ STAT_LABELS[MANAGER_TYPES['2nd'].sub] }})</option>
                       <option value="com_2nd">공통 2nd ({{ STAT_LABELS[MANAGER_TYPES['2nd'].main] }} / {{ STAT_LABELS[MANAGER_TYPES['2nd'].sub] }})</option>
                       <option value="my_3rd">자팀 3rd ({{ STAT_LABELS[MANAGER_TYPES['3rd'].main] }} / {{ STAT_LABELS[MANAGER_TYPES['3rd'].sub] }})</option>
                       <option value="com_3rd">공통 3rd ({{ STAT_LABELS[MANAGER_TYPES['3rd'].main] }} / {{ STAT_LABELS[MANAGER_TYPES['3rd'].sub] }})</option>
                       <option value="my_4th">자팀 4th ({{ STAT_LABELS[MANAGER_TYPES['4th'].main] }} / {{ STAT_LABELS[MANAGER_TYPES['4th'].sub] }})</option>
                       <option value="com_4th">공통 4th ({{ STAT_LABELS[MANAGER_TYPES['4th'].main] }} / {{ STAT_LABELS[MANAGER_TYPES['4th'].sub] }})</option>
                     </select>
                   </div>
                   <div class="flex flex-col gap-1">
                     <label class="text-[10px] font-bold text-neutral-500">강화 레벨 (0~15)</label>
                     <input type="number" min="0" max="15" v-model.number="globalBuffs.managerEnhance" class="w-full px-2 py-1.5 text-center bg-white border rounded-lg text-xs"/>
                   </div>
                 </div>
              </div>
              
<!-- 활성화된 팀 시너지 영역 -->
              <div class="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 shadow-sm flex-shrink-0">
                 <div class="flex flex-col mb-3">
                   <h3 class="text-sm font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-1 mb-2">
                      <Users class="w-4 h-4"/> 현재 활성화된 팀 시너지 ({{ filteredActiveTeamSynergies.length }}개)
                   </h3>
                   <!-- 🌟 팀 시너지 카테고리 탭 추가 -->
                   <div class="flex bg-white dark:bg-neutral-800 p-1 rounded-lg border border-indigo-100 dark:border-indigo-800 flex-shrink-0">
                     <button v-for="cat in ['전체', '기본', '출신', '기록', '인물']" :key="cat" @click="activeSynergyCategory = cat" :class="activeSynergyCategory === cat ? 'bg-indigo-100 dark:bg-indigo-900/50 font-bold text-indigo-700 dark:text-indigo-300 shadow-sm' : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-700'" class="flex-1 py-1 text-[10px] sm:text-xs rounded-md transition-all">{{ cat }}</button>
                   </div>
                 </div>

                 <div class="flex flex-col gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                   <div v-for="syn in filteredActiveTeamSynergies" :key="syn.name" class="flex flex-col text-xs bg-white dark:bg-neutral-800 rounded-lg border border-indigo-100 shadow-sm overflow-hidden flex-shrink-0">
                     <div class="flex justify-between items-center px-3 py-2 cursor-pointer hover:bg-neutral-50 transition-colors" @click="expandedSynergy = expandedSynergy === syn.name ? null : syn.name">
                       <span class="font-bold text-neutral-700">{{ syn.name }}</span>
                       <div class="flex items-center gap-2 flex-shrink-0 whitespace-nowrap"><span class="text-indigo-600 font-bold">{{ formatBonuses(syn.bonuses) }}</span><ChevronRightIcon class="w-4 h-4" /></div>
                     </div>
                     <div v-if="expandedSynergy === syn.name" class="px-3 py-2 bg-neutral-50 border-t">
                        <div class="text-[10px] text-neutral-500 mb-1">적용 선수 ({{ syn.matchedPlayers.length }}명):</div>
                        <div class="flex flex-wrap gap-1"><span v-for="pName in syn.matchedPlayers" :key="pName" class="text-[10px] bg-indigo-100 px-1.5 py-0.5 rounded">{{ pName }}</span></div>
                     </div>
                   </div>
                   <div v-if="filteredActiveTeamSynergies.length === 0" class="text-xs text-neutral-400 text-center py-2">해당 분류에 활성화된 시너지가 없습니다.</div>
                 </div>

                 <!-- 발동 대기 시너지 추가 -->
                 <div v-if="filteredPendingTeamSynergies.length > 0" class="mt-4 pt-3 border-t border-indigo-200 dark:border-indigo-800/50 flex-shrink-0">
                   <h3 class="text-[11px] font-bold text-neutral-500 mb-2 flex items-center gap-1">
                      <Users class="w-3 h-3"/> 발동 대기 중인 시너지 ({{ filteredPendingTeamSynergies.length }}개)
                   </h3>
                   <div class="flex flex-col gap-1.5 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                     <div v-for="syn in filteredPendingTeamSynergies" :key="'pend'+syn.name" class="flex flex-col text-[10px] bg-neutral-100 rounded border shadow-sm overflow-hidden flex-shrink-0">
                       <div class="flex justify-between items-center px-2 py-1.5 cursor-pointer hover:bg-neutral-200 transition-colors" @click="expandedPendingSynergy = expandedPendingSynergy === syn.name ? null : syn.name">
                         <span class="font-medium text-neutral-600">{{ syn.name }}</span>
                         <div class="flex items-center gap-1 flex-shrink-0 whitespace-nowrap">
                           <span class="text-red-500 font-bold bg-red-50 px-1.5 py-0.5 rounded">{{ syn.current }} / {{ syn.required }}명</span>
                           <ChevronRightIcon class="w-3 h-3" />
                         </div>
                       </div>
                       <div v-if="expandedPendingSynergy === syn.name" class="px-2 py-1.5 bg-neutral-50 border-t">
                          <div class="text-[9px] text-neutral-500 mb-1">현재 보유 선수:</div>
                          <div class="flex flex-wrap gap-1">
                            <span v-for="pName in syn.matchedPlayers" :key="pName" class="text-[9px] bg-red-100 text-red-700 px-1 py-0.5 rounded">{{ pName }}</span>
                          </div>
                       </div>
                     </div>
                   </div>
                 </div>
              </div>
            </div>

            <!-- 플레이어 탭 -->
            <div v-else-if="selectedSlot && lineup[selectedSlot] && playerBuffs[selectedSlot]" class="space-y-4 animate-in fade-in flex flex-col h-full">
              <!-- 선수 프로필 영역 -->
              <div class="flex items-center gap-3 p-3 bg-neutral-100 dark:bg-neutral-700/50 rounded-xl flex-shrink-0">
                <img :src="`/assets/logos/grade/${lineup[selectedSlot].grade}.png`" class="w-10 h-10 object-contain drop-shadow" @error="hideImage"/>
                <div>
                  <div class="font-bold text-sm text-neutral-900 dark:text-neutral-100">{{ lineup[selectedSlot].name }}</div>
                  <div class="text-[11px] text-neutral-500">{{ selectedSlot }} 슬롯 배치됨</div>
                </div>
                <div class="ml-auto text-right">
                  <div class="text-[10px] font-bold text-indigo-500">개별 총 파워</div>
                  <div class="text-xl font-black tabular-nums text-indigo-600 dark:text-indigo-400">{{ calculatePlayerPower(lineup[selectedSlot], selectedSlot).toLocaleString() }}</div>
                </div>
              </div>

              <!-- 스탯 / 스킬 탭 전환 -->
              <div class="flex bg-neutral-100 dark:bg-neutral-700/50 p-1 rounded-lg flex-shrink-0">
                <button @click="playerTab = 'stats'" :class="playerTab === 'stats' ? 'bg-white shadow-sm font-bold text-indigo-600' : 'text-neutral-500'" class="flex-1 py-1.5 text-xs rounded-md transition-all">세부 능력치</button>
                <button @click="playerTab = 'synergy'" :class="playerTab === 'synergy' ? 'bg-white shadow-sm font-bold text-indigo-600' : 'text-neutral-500'" class="flex-1 py-1.5 text-xs rounded-md transition-all">성장/스킬 설정</button>
              </div>

              <div class="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-2">
<!-- 세부 능력치 내용 -->
                <div v-if="playerTab === 'stats' && computedPlayerStats[selectedSlot]" class="space-y-4 animate-in fade-in">
                  <div class="bg-indigo-50 dark:bg-indigo-900/10 p-3 rounded-xl border border-indigo-100 shadow-sm flex-shrink-0">
                    <h3 class="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 mb-2 flex items-center gap-1"><TrendingUp class="w-3 h-3"/> 개별 및 전체 스탯 증가 (각인/커리어)</h3>
                    
                    <!-- 🌟 추가된 전체 능력치 증가 (5대 스탯) 입력칸 🌟 -->
                    <div class="grid grid-cols-2 gap-2 mb-3 bg-white p-2 rounded-lg border border-indigo-100 shadow-sm">
                      <div class="flex flex-col gap-1 items-center">
                        <label class="text-[10px] font-bold text-indigo-600">전체 능력치 증가 (각인)</label>
                        <div class="flex items-center justify-center gap-1">
                          <span class="text-[10px] font-black text-neutral-400">+</span>
                          <input type="number" v-model.number="playerBuffs[selectedSlot].imprintCoreStat" class="w-20 px-2 py-1 text-center bg-indigo-50 border border-indigo-200 rounded text-xs font-bold outline-none focus:border-indigo-500" placeholder="0" />
                        </div>
                      </div>
                      <div class="flex flex-col gap-1 items-center">
                        <label class="text-[10px] font-bold text-indigo-600">전체 능력치 증가 (커리어)</label>
                        <div class="flex items-center justify-center gap-1">
                          <span class="text-[10px] font-black text-neutral-400">+</span>
                          <input type="number" v-model.number="playerBuffs[selectedSlot].careerCoreStat" class="w-20 px-2 py-1 text-center bg-indigo-50 border border-indigo-200 rounded text-xs font-bold outline-none focus:border-indigo-500" placeholder="0" />
                        </div>
                      </div>
                    </div>

                    <!-- 기존 개별 스탯 입력칸 -->
                    <div class="grid grid-cols-2 lg:grid-cols-4 gap-2">
                       <div v-for="stat in (isPitcher(lineup[selectedSlot]) ? pitcherStats : batterStats)" :key="stat" class="flex flex-col gap-1 border border-indigo-100 p-1.5 rounded-lg bg-white shadow-sm flex-shrink-0">
                          <label class="text-[10px] font-bold text-neutral-600 text-center">{{ STAT_LABELS[stat] || stat }}</label>
                          <div class="flex items-center justify-between gap-1">
                            <span class="text-[9px] text-neutral-400 w-8">각인</span>
                            <input type="number" v-model.number="playerBuffs[selectedSlot].imprintStats[stat]" class="w-full px-1 py-0.5 text-center bg-neutral-50 border rounded text-[10px]" placeholder="0" />
                          </div>
                          <div class="flex items-center justify-between gap-1">
                            <span class="text-[9px] text-neutral-400 w-8">커리어</span>
                            <input type="number" v-model.number="playerBuffs[selectedSlot].careerStats[stat]" class="w-full px-1 py-0.5 text-center bg-neutral-50 border rounded text-[10px]" placeholder="0" />
                          </div>
                          <div class="mt-1 text-center bg-indigo-50 rounded py-0.5 border border-indigo-100">
                            <span class="text-[11px] font-black text-indigo-700">{{ computedPlayerStats[selectedSlot].stats[stat] }}</span>
                          </div>
                       </div>
                    </div>
                  </div>
                </div>

                <!-- 성장/스킬 설정 내용 -->
                <div v-else-if="playerTab === 'synergy'" class="space-y-4 animate-in fade-in">
                  <!-- 타순 설정 (타자일 경우만) -->
                  <div v-if="!isPitcher(lineup[selectedSlot])" class="bg-orange-50 p-3 rounded-xl border border-orange-100 flex-shrink-0">
                    <h3 class="text-[11px] font-bold text-orange-800 mb-1.5">타순 설정</h3>
                    <select v-model.number="playerBuffs[selectedSlot].battingOrder" class="w-full py-1.5 px-2 rounded-lg border border-orange-200 bg-white text-xs">
                      <option :value="null">타순 미지정</option>
                      <option v-for="i in 9" :key="i" :value="i">{{ i }}번 타자</option>
                    </select>
                  </div>

                  <!-- 카드 강화 -->
                  <div class="bg-emerald-50 p-3 rounded-xl border border-emerald-100 shadow-sm mt-3 flex-shrink-0">
                    <div class="flex items-center justify-between mb-2">
                      <h3 class="text-[11px] font-bold text-emerald-800 flex items-center gap-1"><ArrowUpCircle class="w-3 h-3"/> 카드 강화</h3>
                    </div>
                    <div class="flex flex-wrap gap-1">
                      <button v-for="lvl in (getMaxEnhance(lineup[selectedSlot]) + 1)" :key="'enh'+lvl"
                        @click="playerBuffs[selectedSlot].enhancementLevel = lvl-1"
                        :class="playerBuffs[selectedSlot].enhancementLevel === lvl-1 ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-neutral-600 border-neutral-300'"
                        class="w-8 h-7 flex items-center justify-center text-[10px] font-bold border rounded-md flex-shrink-0">+{{ lvl-1 }}</button>
                    </div>
                  </div>

                  <!-- 한계 돌파 -->
                  <div v-if="getMaxBreakthrough(lineup[selectedSlot]) > 0" class="bg-fuchsia-50 p-3 rounded-xl border border-fuchsia-100 shadow-sm mt-3 flex-shrink-0">
                    <div class="flex items-center justify-between mb-2">
                      <h3 class="text-[11px] font-bold text-fuchsia-800 flex items-center gap-1"><Sparkles class="w-3 h-3"/> 한계 돌파</h3>
                    </div>
                    <div class="flex flex-wrap gap-1">
                      <button v-for="lvl in (getMaxBreakthrough(lineup[selectedSlot]) + 1)" :key="'brk'+lvl"
                        @click="playerBuffs[selectedSlot].breakthroughLevel = lvl-1"
                        :class="playerBuffs[selectedSlot].breakthroughLevel === lvl-1 ? 'bg-fuchsia-600 text-white border-fuchsia-600' : 'bg-white text-neutral-600 border-neutral-300'"
                        class="px-2 h-7 flex items-center justify-center text-[10px] font-bold border rounded-md flex-shrink-0">{{ lvl-1 === 0 ? '돌파 안함' : (lvl-1) + '돌' }}</button>
                    </div>
                  </div>

                  <!-- 선수 개인 성장 버프 -->
                  <div class="bg-sky-50 p-4 rounded-xl border border-sky-100 mt-3 flex-shrink-0">
                    <h3 class="text-sm font-bold text-sky-800 mb-3 flex items-center gap-1"><Zap class="w-4 h-4"/> 선수 성장 및 깡스탯</h3>
                    <div class="grid grid-cols-2 gap-3">
                      <div class="flex flex-col gap-1"><label class="text-[10px] font-bold text-neutral-500">선수 레벨</label><input type="number" v-model.number="playerBuffs[selectedSlot].playerLevel" class="w-full px-2 py-1.5 text-center bg-white border rounded-lg text-xs"/></div>
                      <div class="flex flex-col gap-1"><label class="text-[10px] font-bold text-neutral-500">도감 파워</label><input type="number" v-model.number="playerBuffs[selectedSlot].collectionBuff" class="w-full px-2 py-1.5 text-center bg-white border rounded-lg text-xs"/></div>
                      <div class="flex flex-col gap-1"><label class="text-[10px] font-bold text-neutral-500">커리어 레벨 파워</label><input type="number" v-model.number="playerBuffs[selectedSlot].careerLevelBuff" class="w-full px-2 py-1.5 text-center bg-white border rounded-lg text-xs"/></div>
                      <div class="flex flex-col gap-1"><label class="text-[10px] font-bold text-neutral-500">바인더 파워</label><input type="number" v-model.number="playerBuffs[selectedSlot].binderBuff" class="w-full px-2 py-1.5 text-center bg-white border rounded-lg text-xs"/></div>
                      <div class="flex flex-col gap-1">
                        <label class="text-[10px] font-bold text-neutral-500">커리어 동일팀 칸수 (0~6)</label>
                        <input type="number" min="0" max="6" v-model.number="playerBuffs[selectedSlot].careerTeamCount" class="w-full px-2 py-1.5 text-center bg-white border rounded-lg text-xs"/>
                        <div class="mt-0.5 text-center bg-indigo-50 rounded py-0.5 border border-indigo-100">
                          <span class="text-[9px] font-black text-indigo-700">동일팀 {{ getSameTeamCount(lineup[selectedSlot]) }}명 ➔ 파워 +{{ getSameTeamCount(lineup[selectedSlot]) * 2 * getCareerTeamMultiplier(playerBuffs[selectedSlot].careerTeamCount) }}</span>
                        </div>
                      </div>
                      
                      <div v-if="['HIT', 'ACE', 'GG'].includes(String(lineup[selectedSlot]?.grade || '').toUpperCase())" class="flex flex-col gap-1">
                        <label class="text-[10px] font-bold text-rose-500">HIT/ACE/GG 동일팀 시너지</label>
                        <div class="w-full px-2 py-1.5 text-center bg-rose-50 border border-rose-200 rounded-lg text-xs font-black text-rose-600 flex items-center justify-center">
                          자동 적용중
                        </div>
                        <div class="mt-0.5 text-center bg-rose-100 rounded py-0.5 border border-rose-200">
                          <span class="text-[9px] font-black text-rose-700">동일팀 {{ getSameTeamCount(lineup[selectedSlot]) }}명 ➔ 파워 +{{ getSameTeamCount(lineup[selectedSlot]) * 32 }}</span>
                        </div>
                      </div>

                      <div v-if="selectedSlot === 'SP1' || selectedSlot === 'SP2'" class="flex flex-col gap-1" :class="['HIT', 'ACE', 'GG'].includes(String(lineup[selectedSlot]?.grade || '').toUpperCase()) ? 'col-span-2' : ''">
                        <label class="text-[10px] font-bold text-indigo-500">1,2선발시 파워증가</label>
                        <input type="number" v-model.number="playerBuffs[selectedSlot].imprintStarterPower" class="w-full px-2 py-1.5 text-center bg-white border border-indigo-200 rounded-lg text-xs"/>
                      </div>

                      <div class="flex flex-col gap-1 col-span-2">
                        <label class="text-[10px] font-bold text-neutral-500">얼티밋 각인 (% 증가)</label>
                        <input type="number" v-model.number="playerBuffs[selectedSlot].ultimateImprintPercent" class="w-full px-2 py-1.5 text-center bg-white border rounded-lg text-xs"/>
                      </div>
                    </div>
                  </div>

<!-- 보유 시너지 현황 -->
                  <div class="bg-indigo-50 dark:bg-indigo-900/10 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/20 shadow-sm mt-3 flex-shrink-0">
                    <div class="flex flex-col mb-2">
                      <h3 class="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 mb-2 flex items-center gap-1"><Sparkles class="w-3 h-3"/> 개인 시너지 적용 현황</h3>
                      
                      <!-- 🌟 개인 시너지 카테고리 탭 추가 -->
                      <div class="flex bg-white dark:bg-neutral-800 p-1 rounded-lg border border-indigo-100 dark:border-indigo-800 flex-shrink-0">
                        <button v-for="cat in ['전체', '기본', '출신', '기록', '인물']" :key="cat" @click="playerSynergyCategory = cat" :class="playerSynergyCategory === cat ? 'bg-indigo-100 dark:bg-indigo-900/50 font-bold text-indigo-700 dark:text-indigo-300 shadow-sm' : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-700'" class="flex-1 py-1 text-[9px] rounded-md transition-all">{{ cat }}</button>
                      </div>
                    </div>

                    <div class="flex flex-col gap-2 mb-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                       
                       <!-- 🟢 활성화된 시너지 그룹 -->
                       <div v-if="filteredPlayerActiveSynergies.length > 0" class="flex flex-col gap-1">
                         <div class="text-[10px] font-black text-indigo-600 dark:text-indigo-400 mb-0.5">🟢 활성화 됨</div>
                         <div v-for="(rawSyn, idx) in filteredPlayerActiveSynergies" :key="'act_'+idx" class="flex justify-between items-center text-[10px] bg-white dark:bg-neutral-800 px-2 py-1.5 rounded border border-indigo-200 dark:border-indigo-700/50 shadow-sm flex-shrink-0">
                            <span class="font-bold text-indigo-700 dark:text-indigo-300">{{ rawSyn }}</span>
                            <span class="text-indigo-500 font-black whitespace-nowrap ml-2">적용중</span>
                         </div>
                       </div>
                       
                       <!-- 🔴 조건 미달 시너지 그룹 -->
                       <div v-if="filteredPlayerInactiveSynergies.length > 0" class="flex flex-col gap-1 mt-1">
                         <div class="text-[10px] font-black text-neutral-500 dark:text-neutral-400 mb-0.5 border-t border-indigo-100 dark:border-indigo-800/50 pt-2">🔴 발동 대기 (필요 인원)</div>
                         <div v-for="(rawSyn, idx) in filteredPlayerInactiveSynergies" :key="'inact_'+idx" class="flex justify-between items-center text-[10px] bg-neutral-100 dark:bg-neutral-800/50 px-2 py-1.5 rounded border border-neutral-200 dark:border-neutral-700 opacity-60 flex-shrink-0">
                            <span class="text-neutral-500">{{ rawSyn }}</span>
                            <span class="text-red-500 font-bold bg-red-50 px-1.5 py-0.5 rounded whitespace-nowrap ml-2 border border-red-100">{{ getPendingSynergyText(rawSyn) }}</span>
                         </div>
                       </div>

                       <!-- 선수가 시너지가 아예 없을 때 -->
                       <div v-if="filteredPlayerActiveSynergies.length === 0 && filteredPlayerInactiveSynergies.length === 0" class="text-[10px] text-neutral-400 text-center py-2">해당 분류에 속한 시너지가 없습니다.</div>
                    </div>

                    <div class="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-indigo-100 dark:border-indigo-800">
                      <div class="flex flex-col gap-1">
                        <label class="text-[9px] font-bold text-neutral-500">총 시너지 깡파워</label>
                        <div class="w-full px-2 py-1 text-center bg-indigo-100 dark:bg-indigo-800/30 border border-indigo-200 dark:border-indigo-700 rounded text-xs font-bold text-indigo-700 dark:text-indigo-400">+{{ getPlayerSynergySum(lineup[selectedSlot], 'fixed') }}</div>
                      </div>
                      <div class="flex flex-col gap-1">
                        <label class="text-[9px] font-bold text-neutral-500">총 시너지 %파워</label>
                        <div class="w-full px-2 py-1 text-center bg-indigo-100 dark:bg-indigo-800/30 border border-indigo-200 dark:border-indigo-700 rounded text-xs font-bold text-indigo-700 dark:text-indigo-400">+{{ getPlayerSynergySum(lineup[selectedSlot], 'percent') }}%</div>
                      </div>
                    </div>
                  </div>
<!-- 🌟 각인 장착 슬롯 (고증 완벽 반영 버전) 🌟 -->
                  <div class="mt-3 bg-white dark:bg-neutral-800 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm flex-shrink-0">
                    <div class="flex justify-between items-center mb-2">
                      <h3 class="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1">🛡️ 각인 장착 (최대 2개 / 주옵 중복불가)</h3>
                      <button @click="showImprintManager = true" class="text-[9px] bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200 transition-colors font-bold">대장간(보관함)</button>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-2">
                      <div v-for="slotNum in [1, 2]" :key="'imp_slot_'+slotNum" 
                           class="border rounded-lg p-2 min-h-[70px] flex flex-col justify-center cursor-pointer transition-colors relative"
                           :class="playerBuffs[selectedSlot]?.[`imprint${slotNum}`] ? 'border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-dashed border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700'"
                           @click="openEquipModal(selectedSlot, slotNum)">
                         
                         <div v-if="playerBuffs[selectedSlot]?.[`imprint${slotNum}`]" class="w-full relative">
                           <button @click.stop="unequipImprint(selectedSlot, slotNum)" class="absolute -top-2 -right-2 w-5 h-5 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-[10px] hover:bg-red-500 hover:text-white transition-colors z-10 shadow-sm">×</button>
                           
                           <div class="flex items-center gap-1 mb-1">
                             <div class="text-[8px] font-black px-1.5 py-0.5 rounded border" :class="getGradeColor(playerBuffs[selectedSlot][`imprint${slotNum}`].grade)">{{ playerBuffs[selectedSlot][`imprint${slotNum}`].grade }}</div>
                             <div class="text-[10px] font-bold text-neutral-800 dark:text-neutral-200 truncate">{{ playerBuffs[selectedSlot][`imprint${slotNum}`].name }}</div>
                           </div>
                           
                           <div class="flex flex-col gap-0.5 text-[8px] text-neutral-500">
                             <!-- 🌟 주옵션 스탯명 표시! -->
                             <div class="font-bold text-indigo-600">주옵({{ playerBuffs[selectedSlot][`imprint${slotNum}`].mainStat }}): +{{ playerBuffs[selectedSlot][`imprint${slotNum}`].mainPower }}</div>
                             <div v-for="(opt, idx) in playerBuffs[selectedSlot][`imprint${slotNum}`].subOptions" :key="idx">
                               - {{ opt.type }} +{{ opt.value }}
                             </div>
                             <div v-if="playerBuffs[selectedSlot][`imprint${slotNum}`].ultimateBonus" class="text-red-500 font-bold mt-0.5">
                               [등급효과] {{ playerBuffs[selectedSlot][`imprint${slotNum}`].ultimateBonus.targetGrade }} 장착시 +{{ playerBuffs[selectedSlot][`imprint${slotNum}`].ultimateBonus.power }}
                             </div>
                           </div>
                         </div>
                         <div v-else class="text-[10px] text-neutral-400 font-medium text-center">+ 각인 {{ slotNum }} 장착</div>
                      </div>
                    </div>
                  </div>

                  <!-- 스킬 설정 -->
                  <div class="mt-4 flex-shrink-0">
                    <div class="flex items-center justify-between mb-2">
                      <h3 class="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1"><Star class="w-4 h-4 text-amber-400"/> 스킬 장착</h3>
                      <span class="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 px-2 py-0.5 rounded font-bold">{{ playerBuffs[selectedSlot].selectedSkills.length }} / {{ getMaxSkillCount(lineup[selectedSlot]) }}</span>
                    </div>
                    <div class="flex flex-wrap gap-1.5">
                      <button 
                        v-for="sk in getAvailableSkills(lineup[selectedSlot])" 
                        :key="sk"
                        @click="togglePlayerSkill(sk)"
                        :class="[
                          playerBuffs[selectedSlot].selectedSkills.includes(sk) ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300',
                          playerBuffs[selectedSlot].selectedSkills.includes(sk) && !isSkillActive(sk, selectedSlot, playerBuffs[selectedSlot].battingOrder) ? 'bg-red-500 border-red-600 text-white' : ''
                        ]"
                        class="px-2 py-1 text-[11px] font-bold border rounded-lg transition-colors relative flex-shrink-0"
                      >
                        {{ sk }}
                        <span v-if="playerBuffs[selectedSlot].selectedSkills.includes(sk) && !isSkillActive(sk, selectedSlot, playerBuffs[selectedSlot].battingOrder)" class="absolute -top-2 -right-2 bg-white text-red-500 border border-red-500 text-[8px] px-1 rounded-full shadow-sm whitespace-nowrap z-10">조건불일치</span>
                      </button>
                    </div>
                  </div>
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
<!-- 🌟 각인 생성 및 보관함 (대장간) 모달 🌟 -->
  <div v-if="showImprintManager" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div class="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
      <div class="flex justify-between items-center p-4 border-b dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
        <h2 class="text-base font-bold text-neutral-800 dark:text-neutral-200">🛡️ 각인 보관함 (대장간)</h2>
        <button @click="showImprintManager = false" class="text-neutral-500 hover:text-neutral-800 dark:hover:text-white text-2xl font-bold">&times;</button>
      </div>
      
      <!-- 각인 생성 폼 -->
      <div class="p-4 border-b dark:border-neutral-800 flex flex-col gap-3 bg-white dark:bg-neutral-800/80">
        <div class="flex gap-2 items-center">
          <select v-model="newImprint.role" @change="handleRoleChange" class="text-xs border rounded p-2 font-bold bg-neutral-100 text-neutral-700 outline-none">
            <option value="타자">⚾ 타자용</option>
            <option value="투수">⚾ 투수용</option>
          </select>
          <select v-model="newImprint.grade" @change="updateSubOptionsCount" class="text-xs border rounded p-2 font-bold" :class="getGradeColor(newImprint.grade)">
            <option value="노말">노말</option>
            <option value="고급">고급</option>
            <option value="특별">특별</option>
            <option value="레전드">레전드</option>
            <option value="얼티밋">얼티밋</option>
          </select>
          <input v-model="newImprint.name" type="text" placeholder="각인 이름" class="flex-1 text-xs border rounded p-2">
        </div>
        
        <!-- 🌟 주옵션 스탯 종류 선택 추가 🌟 -->
        <div class="flex items-center gap-2 border rounded p-2 bg-indigo-50/50 border-indigo-100">
          <span class="text-[10px] text-indigo-700 font-bold shrink-0">주옵션 설정 :</span>
          <select v-model="newImprint.mainStat" class="text-xs font-bold bg-white border rounded p-1 text-indigo-700 outline-none flex-1">
             <template v-if="newImprint.role === '타자'">
               <option value="컨택">컨택</option>
               <option value="갭파워">갭파워</option>
               <option value="홈런파워">홈런파워</option>
               <option value="선구">선구</option>
               <option value="삼진회피">삼진회피</option>
             </template>
             <template v-else>
               <option value="무브먼트">무브먼트</option>
               <option value="장타억제">장타억제</option>
               <option value="홈런억제">홈런억제</option>
               <option value="컨트롤">컨트롤</option>
               <option value="스터프">스터프</option>
             </template>
          </select>
          <span class="text-[11px] text-neutral-400 font-black">+</span>
          <input v-model="newImprint.mainPower" type="number" class="w-16 text-xs bg-white border rounded p-1 outline-none text-right font-black text-indigo-600">
        </div>

        <!-- 부가 효과 슬롯 -->
        <div v-if="newImprint.subOptions.length > 0" class="flex flex-col gap-1.5 bg-neutral-50 p-2 rounded border">
          <div class="text-[10px] font-bold text-neutral-600 mb-1">부가 효과 설정 (레전드/얼티밋 기본 3줄)</div>
          <div v-for="(opt, idx) in newImprint.subOptions" :key="idx" class="flex gap-2">
            <select v-model="opt.type" class="text-xs border rounded p-1.5 flex-1 text-neutral-700 font-medium">
              <template v-if="newImprint.role === '타자'">
                <option value="컨택">컨택</option>
                <option value="갭파워">갭파워</option>
                <option value="홈런파워">홈런파워</option>
                <option value="선구">선구</option>
                <option value="삼진회피">삼진회피</option>
              </template>
              <template v-else>
                <option value="무브먼트">무브먼트</option>
                <option value="장타억제">장타억제</option>
                <option value="홈런억제">홈런억제</option>
                <option value="컨트롤">컨트롤</option>
                <option value="스터프">스터프</option>
                <option value="한계투구 증가">한계투구 증가</option>
                <option value="1~2선발시 파워증가">1~2선발시 파워증가</option>
              </template>
              <option value="수비">수비</option>
              <option value="전체 능력치">전체 능력치 (코어 5종 +수치)</option>
              <option value="조건부 파워">조건부 파워 (박빙/주자 등)</option>
              <option value="수익 증가">경기 총 수익 증가</option>
            </select>
            <input v-model="opt.value" type="number" placeholder="수치" class="w-20 text-xs border rounded p-1.5 text-center">
          </div>
        </div>

        <!-- 🌟 얼티밋 전용 4번째 부가 효과 (9개 등급 전체 추가) 🌟 -->
        <div v-if="newImprint.grade === '얼티밋'" class="flex items-center gap-2 bg-red-50 border border-red-200 p-2 rounded">
          <span class="text-[10px] font-bold text-red-600 shrink-0">등급 효과(얼티밋)</span>
          <select v-model="newImprint.ultimateBonus.targetGrade" class="text-xs border rounded p-1 text-red-800">
            <option value="DGN">디그니티 (DGN)</option>
            <option value="TOP">탑클래스 (TOP)</option>
            <option value="ACE">에이스 (ACE)</option>
            <option value="HIT">히트 (HIT)</option>
            <option value="TEA">팀플 (TEA)</option>
            <option value="MMVP">월간MVP (MMVP)</option>
            <option value="ROY">신인왕 (ROY)</option>
            <option value="GGY">연도골글 (GGY)</option>
            <option value="GG">골글 (GG)</option>
          </select>
          <span class="text-[10px] text-neutral-500">+</span>
          <input v-model="newImprint.ultimateBonus.power" type="number" class="w-16 text-xs border rounded p-1 text-center font-bold text-red-600">
        </div>

        <button @click="createImprint" class="w-full bg-indigo-600 text-white px-4 py-2 rounded font-bold hover:bg-indigo-700 text-sm mt-1 transition-colors">이 설정으로 각인 만들기</button>
      </div>

      <!-- 보관함 목록 -->
      <div class="p-4 overflow-y-auto flex-1 custom-scrollbar bg-neutral-100 dark:bg-neutral-900">
        <h3 class="text-xs font-bold text-neutral-600 mb-2">보관 중인 각인 ({{ imprintInventory.length }}개)</h3>
        <div class="flex flex-col gap-2">
          <div v-for="imp in imprintInventory" :key="imp.id" class="flex justify-between items-center border border-neutral-200 rounded-lg p-3 bg-white shadow-sm">
            <div class="flex flex-col">
              <div class="flex items-center gap-1.5 mb-1">
                <span class="text-[9px] font-black px-1.5 py-0.5 rounded" :class="imp.role === '타자' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'">{{ imp.role }}</span>
                <span class="text-[9px] font-black px-1.5 py-0.5 rounded border" :class="getGradeColor(imp.grade)">{{ imp.grade }}</span>
                <span class="font-bold text-sm">{{ imp.name }}</span>
                <!-- 🌟 주옵션 종류 표시 -->
                <span class="text-[10px] text-indigo-600 font-bold ml-1">주옵({{ imp.mainStat }})+{{ imp.mainPower }}</span>
              </div>
              <div class="text-[10px] text-neutral-500 flex flex-wrap gap-x-2">
                <span v-for="(opt, idx) in imp.subOptions" :key="idx" :class="{'text-orange-500 font-bold': opt.type === '전체 능력치'}">
                  {{ opt.type }}+{{ opt.value }}
                </span>
                <span v-if="imp.ultimateBonus" class="text-red-500 font-bold">
                  [등급효과] {{ imp.ultimateBonus.targetGrade }}+{{ imp.ultimateBonus.power }}
                </span>
              </div>
            </div>
            <button @click="deleteImprint(imp.id)" class="text-[10px] bg-red-100 text-red-600 px-3 py-1.5 rounded font-bold hover:bg-red-200 transition-colors">삭제</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 🌟 각인 장착 모달 -->
  <div v-if="showImprintEquipper" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div class="bg-white dark:bg-neutral-900 w-full max-w-sm rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[70vh]">
      <div class="flex justify-between items-center p-4 border-b bg-neutral-50">
        <h2 class="text-sm font-bold text-neutral-800">
          각인 선택 ({{ equipTarget?.pos?.startsWith('SP') || equipTarget?.pos?.startsWith('RP') ? '투수' : '타자' }}용 슬롯 {{ equipTarget?.slot }})
        </h2>
        <button @click="showImprintEquipper = false" class="text-neutral-500 text-2xl font-bold">&times;</button>
      </div>
      <div class="p-4 overflow-y-auto flex-1 custom-scrollbar">
        <div v-for="imp in imprintInventory.filter(i => i.role === (equipTarget?.pos?.startsWith('SP') || equipTarget?.pos?.startsWith('RP') ? '투수' : '타자'))" 
             :key="'eq_'+imp.id" @click="equipImprint(imp)" 
             class="flex justify-between items-center border rounded-lg p-2.5 mb-2 bg-white shadow-sm cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all">
          <div class="flex flex-col">
            <div class="flex items-center gap-1.5 mb-1">
              <span class="text-[8px] font-black px-1.5 py-0.5 rounded border" :class="getGradeColor(imp.grade)">{{ imp.grade }}</span>
              <span class="font-bold text-xs">{{ imp.name }}</span>
            </div>
            <!-- 🌟 주옵션 종류 표시 -->
            <span class="text-indigo-600 text-[10px] font-bold">주옵({{ imp.mainStat }})+{{ imp.mainPower }} / 부옵 {{ imp.subOptions.length }}개</span>
          </div>
          <span class="text-[10px] bg-indigo-600 text-white px-2.5 py-1 rounded font-bold">장착</span>
        </div>
        
        <div v-if="imprintInventory.filter(i => i.role === (equipTarget?.pos?.startsWith('SP') || equipTarget?.pos?.startsWith('RP') ? '투수' : '타자')).length === 0" class="text-center text-neutral-400 text-xs py-6">
          이 선수에게 장착할 수 있는 [{{ equipTarget?.pos?.startsWith('SP') || equipTarget?.pos?.startsWith('RP') ? '투수' : '타자' }}용] 각인이 없습니다.<br>대장간에서 생성해 주세요!
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 4px; }
::-webkit-scrollbar { display: none; }
</style>
