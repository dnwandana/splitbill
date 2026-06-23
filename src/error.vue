<script lang="ts" setup>
import type { NuxtError } from '#app'

defineProps<{ error: NuxtError }>()

const handleClear = () => clearError({ redirect: '/' })
</script>

<template>
  <div class="step-page-editorial flex flex-col items-center justify-center p-4 py-12">
    <div class="w-full max-w-lg text-center">
      <p class="text-overline mb-4">{{ error.statusCode || 500 }}</p>
      <h1 class="step-title-editorial">Something went sideways</h1>
      <p class="step-subtitle-editorial mb-8">
        {{ error.statusCode === 404 ? "That page doesn't exist." : 'An unexpected error occurred.' }}
      </p>
      <button class="btn-editorial" @click="handleClear">
        <span>Back to Home</span>
      </button>
    </div>
  </div>
</template>
