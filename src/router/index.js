import { createRouter, createWebHashHistory } from 'vue-router'

const WelcomePage = () => import('../pages/WelcomePage.vue')
const ScenePage = () => import('../pages/ScenePage.vue')
const AiPage = () => import('../pages/AiPage.vue')

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'welcome',
      component: WelcomePage
    },
    {
      path: '/scene',
      name: 'scene',
      component: ScenePage
    },
    {
      path: '/ai',
      name: 'ai',
      component: AiPage
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ],
  scrollBehavior() {
    return { top: 0 }
  }
})

export default router
