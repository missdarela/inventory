import { createApp } from 'vue'
import App from './App.vue'
import "./style.css";
import router from './router'

import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

import { createPinia } from 'pinia'
import { supabase } from './supabase.js';

const app = createApp(App)
app.use(ElementPlus)
app.use(router)
app.use(createPinia())

app.mount('#app')