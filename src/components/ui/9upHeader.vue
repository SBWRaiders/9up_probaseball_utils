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
    <!-- 🌟 플로팅 헤더: 배경줄 없애고 버튼만 둥둥 떠다니게 수정 🌟 -->
    <!-- pointer-events-none을 줘서 버튼 사이의 투명한 공간은 클릭이 통과되도록 함 -->
    <header class="fixed top-0 left-0 right-0 z-50 p-4 flex items-center justify-between pointer-events-none">
      
      <!-- 햄버거 메뉴 버튼 (포인터 이벤트 활성화 & 뒷배경이 살짝 흐려지게 처리) -->
      <button @click="isSidebarOpen = !isSidebarOpen" 
              class="pointer-events-auto p-2.5 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-md rounded-xl shadow-md text-gray-800 dark:text-neutral-100 hover:bg-white dark:hover:bg-neutral-700 transition-all">
        <component :is="isSidebarOpen ? X : Menu" class="w-6 h-6" />
      </button>

      <!-- 다크모드 토글 버튼 -->
      <button @click="toggleDarkMode" 
              class="pointer-events-auto p-2.5 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-md rounded-xl shadow-md text-gray-800 dark:text-neutral-100 hover:bg-white dark:hover:bg-neutral-700 transition-all">
        <component :is="isDark ? Sun : Moon" class="w-6 h-6" />
      </button>

    </header>

    <!-- 오버레이 -->
    <transition name="fade">
      <div v-if="isSidebarOpen" class="fixed inset-0 bg-black/40 z-20"></div>
    </transition>

    <!-- 사이드바 -->
    <transition name="slide-smooth">
      <aside v-if="isSidebarOpen" ref="sidebarRef" class="fixed top-0 left-0 w-72 max-w-[90%] h-full bg-white dark:bg-neutral-800 shadow-2xl z-[99999] p-5 flex flex-col pointer-events-auto">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-3">
            <img src="/assets/9up_app_logo.webp" alt="logo" class="w-10 h-10 rounded-md" />
            <h2 class="text-lg font-bold text-gray-800 dark:text-neutral-100">{{title}}</h2>
          </div>
          <button @click="isSidebarOpen = false">
            <X class="w-5 h-5 text-gray-700 dark:text-neutral-100 cursor-pointer" />
          </button>
        </div>
        <nav class="flex flex-col gap-2">
          <button v-for="(item, index) in menuItems" :key="index" @click="navigate(item)"
                  class="px-4 py-2 rounded-lg transition-all duration-200 font-medium text-left"
                  :class="[
              item.disabled ? 'text-neutral-400 dark:text-neutral-500 cursor-not-allowed opacity-60'
                : route.path === item.path ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-700 dark:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-700'
            ]" :disabled="item.disabled">
            {{ item.name }}
          </button>
        </nav>
      </aside>
    </transition>

    <!-- 🌟 실제 콘텐츠: 위쪽 여백(pt-20)을 날려버려서 페이지가 꼭대기부터 시작됨 🌟 -->
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
