<script setup lang="ts">
import Header from './components/ui/9upHeader.vue'
</script>

<template>
  <div class="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
    <!-- 1. 상단 메뉴바 (버튼들이 있는 곳) -->
    <Header />
    
    <!-- 2. 실제 페이지 내용이 표시되는 곳 (가장 중요!) -->
    <main class="flex-grow">
      <router-view />
    </main>
  </div>
</template>
