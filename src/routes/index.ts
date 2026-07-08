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
    // 👇 여기에 새로운 팀 파워 시뮬레이터 탭 주소가 추가되었습니다!
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
    // 404 fallback
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
