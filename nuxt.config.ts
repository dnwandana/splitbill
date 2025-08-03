// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  srcDir: 'src',
  serverDir: 'src/server',
  modules: ['@nuxt/eslint', '@nuxt/ui'],

  // nuxt ui
  css: ['~/assets/main.css']
})
