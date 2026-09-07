<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Menu, X, Sun, Moon } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from "firebase/auth";
import { LogOut, Loader2 } from 'lucide-vue-next'

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyCu8atStx9y0CqyN-hokaEfwNDeyybaNW0",
  authDomain: "up-probaseball.firebaseapp.com",
  projectId: "up-probaseball",
  storageBucket: "up-probaseball.firebasestorage.app",
  messagingSenderId: "1003764482438",
  appId: "1:1003764482438:web:294e29137883ada1f96c07",
  measurementId: "G-0KKVYQSRK7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app); 
const provider = new GoogleAuthProvider();

const user = ref<User | null>(null);
const isAuthLoading = ref(true);

const login = async () => {
  try {
    isAuthLoading.value = true;
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Login failed", error);
    alert("로그인에 실패했습니다.");
  } finally {
    isAuthLoading.value = false;
  }
};

const logout = async () => {
  if(!confirm('로그아웃 하시겠습니까?')) return;
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout failed", error);
  }
};

const isSidebarOpen = ref(false)
const sidebarRef = ref<HTMLElement | null>(null)
const route = useRoute()
const router = useRouter()
const title = ref("9up 프로야구 유틸리티")

// 다크모드 상태 관리
const isDark = ref(false)

const initDarkMode = () => {
  const savedTheme = localStorage.getItem('theme')
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
    isDark.value = true
    document.documentElement.classList.add('dark')
  } else {
    isDark.value = false
    document.documentElement.classList.remove('dark')
  }
}

const toggleDarkMode = () => {
  isDark.value = !isDark.value
  if (isDark.value) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  }
}

const handleClickOutside = (event: MouseEvent) => {
  const sidebar = sidebarRef.value
  if (isSidebarOpen.value && sidebar && !sidebar.contains(event.target as Node)) {
    isSidebarOpen.value = false
  }
}

const handleEscKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape') isSidebarOpen.value = false
}

// ==========================================
// 🌟 메뉴 버튼 드래그 앤 드롭 로직 🌟
// ==========================================
const buttonPos = ref({ x: 16, y: 16 }) 
const isDragging = ref(false)
const isMoved = ref(false)
let startCoords = { x: 0, y: 0 }
let startPos = { x: 0, y: 0 }

const onPointerDown = (e: PointerEvent) => {
  isDragging.value = true
  isMoved.value = false
  startCoords = { x: e.clientX, y: e.clientY }
  startPos = { ...buttonPos.value }
  
  document.addEventListener('pointermove', onPointerMove)
  document.addEventListener('pointerup', onPointerUp)
}

const onPointerMove = (e: PointerEvent) => {
  if (!isDragging.value) return
  
  const dx = e.clientX - startCoords.x
  const dy = e.clientY - startCoords.y
  
  // 🌟 [핵심 변경] 모바일 터치 민감도 8px로 보정! 미세한 손떨림은 쿨하게 무시합니다! 🌟
  if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
    isMoved.value = true
  }
  
  if (isMoved.value) {
    buttonPos.value = {
      x: Math.max(0, Math.min(window.innerWidth - 60, startPos.x + dx)),
      y: Math.max(0, Math.min(window.innerHeight - 60, startPos.y + dy))
    }
  }
}

const onPointerUp = (e: PointerEvent) => {
  isDragging.value = false
  document.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('pointerup', onPointerUp)
  
  if (!isMoved.value) {
    isSidebarOpen.value = true
  }
}

onMounted(() => {
  initDarkMode()
  window.addEventListener('mousedown', handleClickOutside)
  window.addEventListener('keydown', handleEscKey)
  
  onAuthStateChanged(auth, (currentUser) => {
    user.value = currentUser;
    isAuthLoading.value = false;
  });
})

onBeforeUnmount(() => {
  window.removeEventListener('mousedown', handleClickOutside)
  window.removeEventListener('keydown', handleEscKey)
})

const menuItems = [
  { name: '공지 사항', path: '/notice', disabled: false },
  { name: '선수 검색', path: '/players', disabled: false },
  { name: '스킬 목록', path: '/skills', disabled: false },
  { name: '라인업 생성', path: '/lineups', disabled: false },
  { name: '스탯 계산기', path: '/calculator', disabled: false },
  { name: '팀 파워 시뮬레이터', path: '/team-calculator', disabled: false },
  { name: '강화 시뮬레이터', path: '/enhance', disabled: false },
  { name: '건의 게시판', path: '/feedback', disabled: false }
]

const navigate = (item: { path: string; disabled?: boolean }) => {
  if (item.disabled) return
  isSidebarOpen.value = false
  if (route.path !== item.path) router.push(item.path)
}
</script>

<template>
  <div>
    <!-- 🌟 드래그 가능한 플로팅 햄버거 메뉴 🌟 -->
    <button 
      class="fixed z-50 p-3 bg-white/90 dark:bg-neutral-800/90 backdrop-blur-md rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 text-gray-800 dark:text-neutral-100 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors cursor-move"
      :style="{ top: `${buttonPos.y}px`, left: `${buttonPos.x}px`, touchAction: 'none' }"
      @pointerdown="onPointerDown"
      title="드래그해서 이동할 수 있습니다"
    >
      <Menu class="w-6 h-6 pointer-events-none" />
    </button>

    <!-- 오버레이 -->
    <transition name="fade">
      <div v-if="isSidebarOpen" class="fixed inset-0 bg-black/40 z-20"></div>
    </transition>

    <!-- 사이드바 -->
    <transition name="slide-smooth">
      <aside v-if="isSidebarOpen" ref="sidebarRef" class="fixed top-0 left-0 w-72 max-w-[90%] h-full bg-white dark:bg-neutral-800 shadow-2xl z-[99999] p-5 flex flex-col pointer-events-auto">
        <div class="flex items-center justify-between mb-6 border-b border-neutral-200 dark:border-neutral-700 pb-4">
          <div class="flex items-center gap-3">
            <img src="/assets/9up_app_logo.webp" alt="logo" class="w-10 h-10 rounded-md shadow-sm" />
            <h2 class="text-base font-bold text-gray-800 dark:text-neutral-100">{{title}}</h2>
          </div>
          
          <div class="flex items-center gap-1">
            <button @click="toggleDarkMode" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors text-gray-600 dark:text-neutral-300">
              <component :is="isDark ? Sun : Moon" class="w-5 h-5" />
            </button>
            <button @click="isSidebarOpen = false" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors text-gray-600 dark:text-neutral-300">
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav class="flex flex-col gap-2 flex-1 overflow-y-auto">
          <button v-for="(item, index) in menuItems" :key="index" @click="navigate(item)"
                  class="px-4 py-2.5 rounded-lg transition-all duration-200 font-medium text-left shrink-0"
                  :class="[
              item.disabled ? 'text-neutral-400 dark:text-neutral-500 cursor-not-allowed opacity-60'
                : route.path === item.path ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-700 dark:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-700'
            ]" :disabled="item.disabled">
            {{ item.name }}
          </button>
        </nav>

        <div class="mt-auto pt-4 border-t border-neutral-200 dark:border-neutral-700 flex-shrink-0">
          <div v-if="isAuthLoading" class="flex justify-center py-2">
            <Loader2 class="w-6 h-6 animate-spin text-blue-500" />
          </div>
          
          <div v-else-if="user" class="flex flex-col gap-3">
            <div class="flex items-center gap-3 bg-neutral-50 dark:bg-neutral-900 p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
              <img :src="user.photoURL || '/assets/logos/teams/unknown.png'" alt="profile" class="w-9 h-9 rounded-full border border-neutral-300 dark:border-neutral-600" referrerpolicy="no-referrer" />
              <div class="flex flex-col min-w-0">
                <span class="text-xs font-black text-neutral-800 dark:text-neutral-100 truncate">{{ user.displayName || '유저' }}</span>
                <span class="text-[10px] text-neutral-500 dark:text-neutral-400 truncate flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-green-500"></span> 클라우드 연결됨</span>
              </div>
            </div>
            <button @click="logout" class="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-neutral-500 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-red-500 dark:hover:text-red-400 transition-colors shadow-sm">
              <LogOut class="w-3.5 h-3.5"/> 로그아웃
            </button>
          </div>

          <button v-else @click="login" class="w-full flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm group">
            <svg class="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            <span class="text-sm font-bold text-neutral-600 dark:text-neutral-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">구글로 시작하기</span>
          </button>
        </div>
      </aside>
    </transition>

    <div class="w-full">
      <router-view />
    </div>
  </div>
</template>

<style scoped>
.slide-smooth-enter-active, .slide-smooth-leave-active { transition: transform 0.3s ease, opacity 0.3s ease; }
.slide-smooth-enter-from { transform: translateX(-100%); opacity: 0; }
.slide-smooth-leave-to { transform: translateX(-100%); opacity: 0; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
