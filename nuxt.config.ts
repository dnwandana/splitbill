// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  srcDir: 'src',
  serverDir: 'src/server',
  modules: ['@nuxt/eslint', '@nuxt/ui'],

  // nuxt ui
  css: ['~/assets/main.css'],

  // umami analytics
  app: {
    head: {
      script: [
        {
          defer: true,
          src: 'https://cloud.umami.is/script.js',
          'data-website-id': process.env.UMAMI_WEBSITE_ID || ''
        }
      ]
    }
  }
})
