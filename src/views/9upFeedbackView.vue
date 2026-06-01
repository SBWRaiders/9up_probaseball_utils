<script setup lang="ts">
import { ref } from 'vue'
import { MessageSquare, AlertCircle, Sparkles, Send, CheckCircle2 } from 'lucide-vue-next'

/* =================================================================
   ⭐ [중요] 디스코드에서 발급받은 웹훅 URL을 아래 따옴표 안에 붙여넣으세요!
   ================================================================= */
const WEBHOOK_URL = 'https://discord.com/api/webhooks/1511026553298092106/Bt9VVPblIgrzlh61pqDb9FTXFMiTHvhEWgnnHQv6IbK1hggWUDyTTuzUFkkeTDUdTs3-'
/* ================================================================= */

const form = ref({
  category: '기능 건의',
  nickname: '',
  content: ''
})

const isSubmitting = ref(false)
const isSuccess = ref(false)
const errorMessage = ref('')

const submitFeedback = async () => {
  if (!form.value.content.trim()) {
    errorMessage.value = '내용을 입력해주세요!'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''

  // 디스코드로 보낼 메시지 형태 꾸미기 (임베드 활용)
  const payload = {
    username: "9UP 피드백 알리미", // 디스코드에 표시될 봇 이름
    avatar_url: "https://cdn-icons-png.flaticon.com/512/3114/3114869.png", // 봇 프로필 이미지 (선택)
    embeds: [
      {
        title: `💡 [${form.value.category}] 새로운 피드백이 도착했습니다!`,
        description: form.value.content,
        color: 3700200, // 파란색 계열 헥스 코드
        fields: [
          {
            name: "👤 작성자",
            value: form.value.nickname.trim() ? form.value.nickname : "익명 유저",
            inline: true
          }
        ],
        timestamp: new Date().toISOString()
      }
    ]
  }

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error('전송 실패')
    }

    // 성공 처리
    isSuccess.value = true
    form.value.content = '' // 내용만 초기화 (닉네임, 카테고리는 유지)
    
    // 3초 후 성공 메시지 닫기
    setTimeout(() => {
      isSuccess.value = false
    }, 3000)

  } catch (error) {
    errorMessage.value = '전송에 실패했습니다. 시스템 오류이거나 웹훅 주소를 확인해주세요.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 bg-neutral-50 dark:bg-neutral-900 min-h-screen transition-colors">
    <header class="mb-8 flex items-start gap-4 p-6 bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700">
      <div class="p-3.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-600/20 shrink-0">
        <MessageSquare class="w-6 h-6" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight mb-1">
          개발자 다이렉트 건의함
        </h1>
        <p class="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
          로그인 없이 편하게 의견을 남겨주세요! 남겨주신 소중한 의견은 즉시 개발자의 디스코드로 전송되며, 확인 후 패치에 적극 반영하겠습니다.
        </p>
      </div>
    </header>

    <div class="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="flex gap-3 p-4 bg-sky-50/50 dark:bg-sky-900/10 border border-sky-200/60 dark:border-sky-800/40 rounded-xl">
        <Sparkles class="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
        <div class="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
          <span class="font-bold text-sky-700 dark:text-sky-400">실시간 알림 전송</span><br />
          버그 제보나 수치 밸런스 건의, 필요한 편의 기능 등 어떤 것이든 좋습니다.
        </div>
      </div>
      <div class="flex gap-3 p-4 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl">
        <CheckCircle2 class="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
        <div class="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
          <span class="font-bold text-emerald-700 dark:text-emerald-400">100% 익명 보장</span><br />
          원치 않으시면 닉네임을 비워두셔도 됩니다. 다른 유저에게는 내용이 공개되지 않습니다.
        </div>
      </div>
    </div>

    <section class="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6 sm:p-8">
      <div class="space-y-6">
        
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div class="flex flex-col gap-2">
            <label class="text-sm font-bold text-neutral-700 dark:text-neutral-300">어떤 의견인가요?</label>
            <select v-model="form.category" class="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors text-neutral-900 dark:text-neutral-100 font-medium">
              <option value="기능 건의">💡 새로운 기능 건의</option>
              <option value="버그 제보">🐛 버그/오류 제보</option>
              <option value="데이터 수정">📊 선수 스탯/데이터 수정</option>
              <option value="기타">💬 기타 의견</option>
            </select>
          </div>
          
          <div class="flex flex-col gap-2">
            <label class="text-sm font-bold text-neutral-700 dark:text-neutral-300">닉네임 <span class="text-neutral-400 font-normal text-xs">(선택사항)</span></label>
            <input type="text" v-model="form.nickname" placeholder="익명" class="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors text-neutral-900 dark:text-neutral-100" />
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-sm font-bold text-neutral-700 dark:text-neutral-300">건의 내용</label>
          <textarea v-model="form.content" rows="6" placeholder="자유롭게 의견을 적어주세요!" class="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors text-neutral-900 dark:text-neutral-100 resize-none"></textarea>
        </div>

        <p v-if="errorMessage" class="text-sm font-bold text-red-500 flex items-center gap-2">
          <AlertCircle class="w-4 h-4" /> {{ errorMessage }}
        </p>

        <div class="flex justify-end pt-2">
          <button 
            @click="submitFeedback" 
            :disabled="isSubmitting || isSuccess"
            class="px-8 py-3 rounded-xl font-bold text-white transition-all flex items-center gap-2 shadow-lg"
            :class="isSuccess ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed'"
          >
            <template v-if="isSubmitting">
              <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              전송 중...
            </template>
            <template v-else-if="isSuccess">
              <CheckCircle2 class="w-5 h-5" />
              전송 완료!
            </template>
            <template v-else>
              <Send class="w-5 h-5" />
              의견 보내기
            </template>
          </button>
        </div>

      </div>
    </section>
  </div>
</template>
