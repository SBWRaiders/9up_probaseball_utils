import { createRouter, createWebHistory } from 'vue-router'
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
        path: '/lineups',
        name: 'Lineups',
        component: () => import('@/views/9upLineupView.vue'),
    },
    {
        path: '/players',
        name: 'Players',
        component: () => import('@/views/9upPlayersView.vue'),
    },
    // 404 fallback
    {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: () => import('@/views/NotFound.vue'),
    },
]

export const router = createRouter({
    history: createWebHistory(),
    routes,
})
