<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Menu, X, Sun, Moon } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'

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
const buttonPos = ref({ x: 16, y: 16 }) // 초기 위치 (좌측 상단)
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
  
  // 마우스가 조금이라도 움직였다면 드래그로 간주
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
    isMoved.value = true
  }
  
  if (isMoved.value) {
    // 버튼이 화면 밖으로 나가지 않도록 경계값 설정
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
  
  // 제자리에서 클릭만 했다면 사이드바 오픈
  if (!isMoved.value) {
    isSidebarOpen.value = true
  }
}

onMounted(() => {
  initDarkMode()
  window.addEventListener('mousedown', handleClickOutside)
  window.addEventListener('keydown', handleEscKey)
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
          
          <!-- 🌟 다크모드 버튼을 메뉴 안으로 이동! 🌟 -->
          <div class="flex items-center gap-1">
            <button @click="toggleDarkMode" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors text-gray-600 dark:text-neutral-300">
              <component :is="isDark ? Sun : Moon" class="w-5 h-5" />
            </button>
            <button @click="isSidebarOpen = false" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors text-gray-600 dark:text-neutral-300">
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav class="flex flex-col gap-2">
          <button v-for="(item, index) in menuItems" :key="index" @click="navigate(item)"
                  class="px-4 py-2.5 rounded-lg transition-all duration-200 font-medium text-left"
                  :class="[
              item.disabled ? 'text-neutral-400 dark:text-neutral-500 cursor-not-allowed opacity-60'
                : route.path === item.path ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-700 dark:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-700'
            ]" :disabled="item.disabled">
            {{ item.name }}
          </button>
        </nav>
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
