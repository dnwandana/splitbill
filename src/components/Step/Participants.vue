<script lang="ts" setup>
import { useSplitBill } from '../../composables/useSplitBill'

const {
  participants,
  error,
  isParsingInBackground,
  parseProgress,
  addParticipant,
  removeParticipant,
  participantColor,
  proceedToAssign,
  goToStep
} = useSplitBill()
</script>

<template>
  <div
    class="step-page-editorial flex flex-col items-center p-4 py-12"
  >
    <div class="w-full max-w-2xl">
      <!-- Header -->
      <div class="step-header-editorial">
        <button class="back-link-editorial mb-6" @click="goToStep('upload')">
          <IconChevronLeft class="w-4 h-4" />
          Back to Upload
        </button>
        <h1 class="step-title-editorial">Who's In The Squad?</h1>
        <p class="step-subtitle-editorial">
          Add your friends while we parse your receipt in the background.
        </p>
      </div>

      <!-- Parsing Progress -->
      <div
        v-if="isParsingInBackground || parseProgress !== 'idle'"
        class="card-editorial mb-8"
      >
        <div class="flex items-center gap-3 mb-4">
          <div
            class="w-8 h-8 flex items-center justify-center"
            :class="{
              'text-[var(--color-accent)]':
                parseProgress === 'uploading' || parseProgress === 'parsing',
              'text-green-600': parseProgress === 'complete',
              'text-red-600': parseProgress === 'error'
            }"
          >
            <IconRefresh
              v-if="parseProgress === 'parsing'"
              class="w-5 h-5 animate-spin"
            />
            <IconCheckCircle
              v-else-if="parseProgress === 'complete'"
              class="w-5 h-5"
            />
            <IconStatusProcessing
              v-else-if="parseProgress === 'error'"
              class="w-5 h-5"
            />
            <IconDocumentText
              v-else
              class="w-5 h-5"
            />
          </div>
          <div>
            <p class="font-medium text-[var(--color-text-primary)]">
              Receipt Processing
            </p>
            <p class="text-caption">
              {{
                parseProgress === 'uploading'
                  ? 'Uploading receipt...'
                  : parseProgress === 'parsing'
                    ? 'Analyzing receipt with AI...'
                    : parseProgress === 'complete'
                      ? 'Receipt parsed successfully!'
                      : parseProgress === 'error'
                        ? 'Failed to parse receipt'
                        : 'Ready to parse'
              }}
            </p>
          </div>
        </div>

        <!-- Progress bar -->
        <div class="progress-editorial">
          <div
            class="progress-editorial-bar"
            :class="{ animate: parseProgress === 'parsing' }"
            :style="{
              width:
                parseProgress === 'uploading'
                  ? '30%'
                  : parseProgress === 'parsing'
                    ? '70%'
                    : parseProgress === 'complete' || parseProgress === 'error'
                      ? '100%'
                      : '0%',
              backgroundColor:
                parseProgress === 'complete'
                  ? '#16a34a'
                  : parseProgress === 'error'
                    ? '#dc2626'
                    : 'var(--color-accent)'
            }"
          />
        </div>
      </div>

      <!-- Participants -->
      <div class="card-editorial">
        <div
          class="flex justify-between items-center mb-6 pb-4 border-b border-[var(--color-border)]"
        >
          <h3 class="font-serif text-xl">The Squad</h3>
          <button
            class="btn-editorial btn-editorial-sm"
            @click="addParticipant"
          >
            <IconPlus class="w-4 h-4" />
            <span>Add Friend</span>
          </button>
        </div>

        <div class="space-y-4">
          <div
            v-for="(participant, index) in participants"
            :key="index"
            class="flex items-center gap-3"
          >
            <span
              class="avatar-editorial avatar-editorial-md"
              :style="{ backgroundColor: participantColor(index) }"
            >
              {{ (participant?.trim() || `P${index + 1}`)[0]?.toUpperCase() }}
            </span>
            <input
              v-model="participants[index]"
              type="text"
              :placeholder="`Person ${index + 1}`"
              :aria-label="`Participant ${index + 1} name`"
              class="input-editorial flex-1"
            >
            <button
              v-if="participants.length > 1"
              class="btn-editorial-ghost text-[var(--color-text-secondary)] hover:text-red-600"
              :aria-label="`Remove participant ${index + 1}`"
              @click="removeParticipant(index)"
            >
              <IconXMark class="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="error" class="alert-editorial alert-editorial-error mt-6">
        {{ error }}
      </div>

      <!-- Action Buttons -->
      <div class="flex justify-center mt-8">
        <button
          class="btn-editorial"
          :disabled="
            parseProgress === 'error' ||
            parseProgress === 'uploading' ||
            parseProgress === 'parsing'
          "
          :class="{
            'opacity-50 cursor-not-allowed':
              parseProgress === 'error' ||
              parseProgress === 'uploading' ||
              parseProgress === 'parsing'
          }"
          @click="proceedToAssign"
        >
          <span>Continue</span>
          <IconArrowRight class="w-5 h-5" />
        </button>
      </div>
    </div>
  </div>
</template>
