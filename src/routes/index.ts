import { createRouter, createWebHistory } from 'vue-router'
import CalculatorView from '@/views/9upCalculatorView.vue'

const routes = [
    {
        path: '/',
        redirect: '/notice',
    },
    {
        path: '/notice',
        name: 'Notice',
        component: () => import('@/views/9upNoticeView.vue')
    },
    {
        path: '/skills',
        name: 'Skills',
        component: () => import('@/views/9upSkillListView.vue'),
    },
    {
        path: '/calculator',
        name: 'Calculator',
        component: CalculatorView,
    },
    {
        path: '/lineups',
        name: 'Lineups',
        component: () => import('@/views/9upLineupView.vue'),
    },
    // 👇 팀 파워 시뮬레이터
    {
        path: '/team-calculator',
        name: 'TeamCalculator',
        component: () => import('@/views/9upTeamCalculatorView.vue'),
    },
    {
        path: '/players',
        name: 'Players',
        component: () => import('@/views/9upPlayersView.vue'),
    },
    {
        path: '/feedback',
        name: 'Feedback',
        component: () => import('@/views/9upFeedbackView.vue'),
    },
    // 👇 새로 추가된 강화 시뮬레이터! (에러 없이 완벽하게 배열 안에 삽입됨)
    {
        path: '/enhance',
        name: 'enhance',
        component: () => import('@/views/EnhancementView.vue')
    },
    // 404 fallback (이 항목은 반드시 배열의 맨 마지막에 있어야 합니다)
    {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: () => import('@/views/NotFound.vue'),
    }
]

export const router = createRouter({
    history: createWebHistory(),
    routes,
})
