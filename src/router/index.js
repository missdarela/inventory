// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../authStore'
import { supabase } from '../supabase'

const routes = [
  {
     path: '/', 
     name: 'signUp', 
     component: ()=> import('/src/views/signUpPage.vue'),
     meta: { requiresCEO: true } // Mark this route as requiring CEO access
    },
    {
      path: '/login', 
      name: 'login', 
      component: ()=> import('/src/views/loginPage.vue')
     },
     {
      path: '/dashboard', 
      name: 'dashboard', 
      component: ()=> import('/src/views/dashboardContainer.vue'),
     children: [
      {
        path: "",
        name: "dashboardIndex",
        component: () => import("../components/sideBarDashboardIndex.vue"),
      },
      {
        path: "inventory",
        name: "inventory",
        component: () => import("../components/sideBarInventory.vue"),
      },
      {
        path: "dump",
        component: () => import("../views/sideBarDumpContainer.vue"),
        children: [
          {
            path: "",
            name: "Dumps",
            component: () => import("../components/sideBarDump.vue"),
          },
          {
            path: "inventoryDump",
            name: "inventoryDump",
            component: () => import("../components/inventoryDump.vue"),
          },
          {
            path: "inventory/:id",
            name: "dumpDetails",
            component: () => import("../components/DumpDetails.vue"),
            props: true
          },
          {
            path: "trackingDump",
            name: "trackingDump",
            component: () => import("../components/trackingDump.vue"),
            props: true
          },
          {
            path: "trackingDump/:id",
            name: "trackingDumpDetails",
            component: () => import("../components/TrackingDumpDetails.vue"),
            props: true
          },
          // // {
          //   path: "tracking",
          //   name: "trackingDump",
          //   component: () => import("../components/trackingDump.vue"),
          // }
        ]
      },
      {
        path: "report",
        name: "report",
        component: () => import("../views/reportContainer.vue"),
        children: [
          {
            path: "",
            name: "reportMenu",
            component: () => import("../components/sideBarReport.vue"),
          },
          {
            path: "inventory-report",
            name: "inventoryReport",
            component: () => import("../components/inventoryReport.vue"),
          },
          {
            path: "tracking-report",
            name: "trackingReport",
            component: () => import("../components/trackingReport.vue"),
          },
        ],
      },
      {
        path: "tracking",
        name: "tracking",
        component: () => import("../components/sideBarTracking.vue"),
      },
      {
        path: "users",
        name: "users",
        component: () => import("../components/usersManagement.vue"),
        meta: { requiresCEO: true } // Only CEO can access this page
      },
    ]},
     {
      path: '/forgot-password', 
      name: 'forgotPassword', 
      component: ()=> import('/src/views/forgottenPassword.vue')
     },
     {
      path: '/update-password', 
      name: 'updatePassword', 
      component: ()=> import('/src/views/updatePassword.vue')
     },
]

const router = createRouter({
  history: createWebHistory(), 
  routes,
})

// Add navigation guard for protected pages
router.beforeEach(async (to, from, next) => {
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  const authStore = useAuthStore()
  
  if (user) {
    // User is authenticated
    authStore.setUser(user)
    await authStore.fetchUserProfile()
    
    // Check if the route requires CEO access
    if (to.meta.requiresCEO) {
      // Only allow CEOs to access CEO-only pages when authenticated
      if (authStore.isCEO) {
        next()
      } else {
        // Redirect non-CEO users to dashboard
        next({ name: 'dashboard' })
      }
    } else {
      next()
    }
  } else {
    // User is not authenticated
    if (to.meta.requiresCEO || to.name === 'signUp') {
      // Redirect to login page if trying to access protected pages without authentication
      next({ name: 'login' })
    } else {
      next()
    }
  }
})

export default router
