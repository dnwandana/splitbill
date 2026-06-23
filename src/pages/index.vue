<script lang="ts" setup>
import { provide } from 'vue'
import { SplitBillKey, createSplitBillState } from '../composables/useSplitBill'

useSeoMeta({
  title: 'SplitBill AI: Snap, Split, Done. Group Bills Made Easy.',
  description:
    'Tired of awkward bill math? Just snap a photo of your receipt and let our AI handle the rest. Split expenses with your squad in seconds. Fast, free, and accurate.',
  ogTitle: 'SplitBill AI: Snap, Split, Done. Group Bills Made Easy.',
  ogDescription:
    'Tired of awkward bill math? Just snap a photo of your receipt and let our AI handle the rest. Split expenses with your squad in seconds. Fast, free, and accurate.',
  twitterCard: 'summary',
  ogUrl: 'https://splitbill.wandana.dev/'
})

useHead({
  link: [{ rel: 'canonical', href: 'https://splitbill.wandana.dev/' }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'SplitBill AI',
        url: 'https://splitbill.wandana.dev/',
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web',
        description:
          'Snap a photo of your receipt and let AI split the bill with your group in seconds. Fast, free, and accurate.',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
      })
    }
  ]
})

const splitBill = createSplitBillState()
provide(SplitBillKey, splitBill)

// Thin page shell: provide the state once; each step injects it via useSplitBill().
const { currentStep } = splitBill
</script>

<template>
  <StepLanding v-if="currentStep === 'landing'" />
  <StepUpload v-else-if="currentStep === 'upload'" />
  <StepParticipants v-else-if="currentStep === 'participants'" />
  <StepReview v-else-if="currentStep === 'review'" />
  <StepAssign v-else-if="currentStep === 'assign'" />
  <StepResults v-else-if="currentStep === 'results'" />
</template>
