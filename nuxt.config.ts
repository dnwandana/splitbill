// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: true,
  srcDir: 'src',
  serverDir: 'src/server',
  modules: ['@nuxt/eslint', '@nuxt/ui'],

  // node:test files import sibling modules with explicit .ts extensions
  // (required by Node's native TS test runner); allow that under noEmit typecheck
  typescript: {
    tsConfig: {
      compilerOptions: { allowImportingTsExtensions: true }
    }
  },
  nitro: {
    typescript: {
      tsConfig: {
        compilerOptions: { allowImportingTsExtensions: true }
      }
    }
  },

  // nuxt ui
  css: ['~/assets/main.css'],

  // umami analytics + Google Fonts
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: 'anonymous'
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&display=swap'
        },
        {
          rel: 'stylesheet',
          href: 'https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap'
        }
      ],
      script: [
        {
          defer: true,
          src: 'https://cloud.umami.is/script.js',
          'data-website-id': import.meta.env.UMAMI_WEBSITE_ID
        }
      ]
    }
  }
})
