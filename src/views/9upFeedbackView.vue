<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { MessageSquare, AlertCircle, Sparkles } from 'lucide-vue-next'

const giscusContainer = ref<HTMLElement | null>(null)

// 💡 Giscus 로드 함수
function loadGiscus() {
  if (!giscusContainer.value) return
  
  // 기존에 생성된 댓글창이 있다면 싹 초기화
  giscusContainer.value.innerHTML = ''

  const script = document.createElement('script')
  script.src = 'https://giscus.app/client.js'
  
  /* =================================================================
     ⭐ [중요] 여기에 본인의 GitHub 레포지토리 정보를 넣어주셔야 작동합니다!
     giscus.app 사이트에서 발급받은 키 값을 아래에 채워넣어주세요.
     ================================================================= */
  script.setAttribute('data-repo', '본인의_깃허브_아이디/레포지토리_이름') 
  script.setAttribute('data-repo-id', '레포지토리_ID_값')
  script.setAttribute('data-category', 'General') // Discussions 카테고리 이름
  script.setAttribute('data-category-id', '카테고리_ID_값')
  /* ================================================================= */

  script.setAttribute('data-mapping', 'pathname')
  script.setAttribute('data-strict', '0')
  script.setAttribute('data-reactions-enabled', '1')
  script.setAttribute('data-emit-metadata', '0')
  script.setAttribute('data-input-position', 'bottom')
  
  // 현재 사이트의 다크 모드 여부를 감지하여 Giscus 테마 자동 매칭
  const isDark = document.documentElement.classList.contains('dark')
  script.setAttribute('data-theme', isDark ? 'dark' : 'light')
  
  script.setAttribute('data-lang', 'ko')
  script.setAttribute('crossorigin', 'anonymous')
  script.async = true

  giscusContainer.value.appendChild(script)
}

onMounted(() => {
  loadGiscus()
})

// 다크모드 토글 버튼을 누를 때 댓글창 테마도 실시간으로 변하도록 감시
const observer = new MutationObserver(() => {
  loadGiscus()
})

onMounted(() => {
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 bg-neutral-50 dark:bg-neutral-900 min-h-screen transition-colors">
    <!-- 상단 헤더 배너 -->
    <header class="mb-8 flex items-start gap-4 p-6 bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700">
      <div class="p-3.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-600/20 shrink-0">
        <MessageSquare class="w-6 h-6" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight mb-1">
          건의 및 질문 게시판
        </h1>
        <p class="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
          9UP 시뮬레이터와 계산기를 이용하시면서 느낀 불편한 점, 데이터 오류 제보, 혹은 추가되었으면 하는 새로운 기능(시너지/스킬/등급) 아이디어가 있다면 자유롭게 남겨주세요! 확인 후 패치 노트에 적극 반영하겠습니다.
        </p>
      </div>
    </header>

    <!-- 안내 사항 팁 박스 -->
    <div class="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="flex gap-3 p-4 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-800/40 rounded-xl">
        <AlertCircle class="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div class="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
          <span class="font-bold text-amber-700 dark:text-amber-400">의견 작성 안내</span><br />
          글을 작성하려면 <span class="font-semibold text-neutral-900 dark:text-white">GitHub 로그인</span>이 필요합니다. 로그인 후 일반 댓글창처럼 편하게 사용하실 수 있습니다.
        </div>
      </div>
      <div class="flex gap-3 p-4 bg-sky-50/50 dark:bg-sky-900/10 border border-sky-200/60 dark:border-sky-800/40 rounded-xl">
        <Sparkles class="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
        <div class="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
          <span class="font-bold text-sky-700 dark:text-sky-400">실시간 패치 반영</span><br />
          남겨주신 버그 제보나 수치 밸런스 건의는 확인 즉시 서버 수정 및 정렬 로직 업데이트를 통해 빠르게 패치됩니다!
        </div>
      </div>
    </div>

    <!-- 🌟 실제 Giscus 댓글형 게시판이 렌더링되는 구역 -->
    <section class="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
      <div ref="giscusContainer" class="giscus w-full">
        <!-- 스크립트 주입에 의해 댓글창이 생성되는 자리 -->
        <div class="text-center py-8 text-sm text-neutral-400">
          게시판을 불러오는 중입니다...
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Giscus 자체 마진이나 스타일 미세 조정용 구역 */
.giscus {
  min-height: 300px;
}
</style>
