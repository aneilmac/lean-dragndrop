import Vue from 'vue';
import VueRouter from "vue-router";
import App from '@/App.vue';
import LevelManager from '@/components/LevelManager.vue';
import NotFound from '@/components/NotFound.vue';

Vue.use(VueRouter);

const router = new VueRouter({
  mode: "history",
  routes: [
    { path: '/levels/:id', component: LevelManager },
    { path: '*', component: NotFound }
  ]
})

Vue.config.productionTip = false;
//Add unimported components to ignore list to prevent warnings.
Vue.config.ignoredElements = ['field','block','category','xml','mutation','value','sep']

new Vue({
  router,
  el: '#app',
  render: h => h(App)
})
