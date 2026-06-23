<script lang="ts" setup>
import { useSplitBill } from '../../composables/useSplitBill'

const { splitResults, formatCurrency, participantColor, resetApp, goToStep } =
  useSplitBill()
</script>

<template>
  <div class="step-page-editorial flex flex-col items-center p-4 py-12">
    <div class="w-full max-w-4xl">
      <!-- Header -->
      <div class="step-header-editorial">
        <div
          class="w-16 h-16 mx-auto mb-6 flex items-center justify-center bg-green-100 text-green-600 rounded-full"
        >
          <IconCheck class="w-8 h-8" />
        </div>
        <h1 class="step-title-editorial">Bill Settled!</h1>
        <p class="step-subtitle-editorial">
          The moment of truth: who pays what
        </p>
      </div>

      <!-- Summary -->
      <div class="card-editorial mb-8">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <p class="text-caption mb-1">Subtotal</p>
            <p
              class="font-mono text-xl font-bold text-[var(--color-text-primary)]"
            >
              {{ formatCurrency(splitResults?.subtotal || 0) }}
            </p>
          </div>
          <div>
            <p class="text-caption mb-1">Tax</p>
            <p class="font-mono text-xl font-bold text-[var(--color-accent)]">
              {{ formatCurrency(splitResults?.tax || 0) }}
            </p>
          </div>
          <div>
            <p class="text-caption mb-1">Total</p>
            <p
              class="font-mono text-xl font-bold text-[var(--color-text-primary)]"
            >
              {{ formatCurrency(splitResults?.originalTotal || 0) }}
            </p>
          </div>
          <div>
            <p class="text-caption mb-1">Accuracy</p>
            <p
              class="text-xl font-bold"
              :class="
                Math.abs(
                  (splitResults?.originalTotal || 0) -
                    (splitResults?.splitTotal || 0)
                ) < 0.01
                  ? 'text-green-600'
                  : 'text-red-600'
              "
            >
              {{
                Math.abs(
                  (splitResults?.originalTotal || 0) -
                    (splitResults?.splitTotal || 0)
                ) < 0.01
                  ? '✓ Perfect'
                  : formatCurrency(
                      Math.abs(
                        (splitResults?.originalTotal || 0) -
                          (splitResults?.splitTotal || 0)
                      )
                    ) + ' off'
              }}
            </p>
          </div>
        </div>
      </div>

      <!-- Individual Results -->
      <div class="space-y-6 mb-8">
        <div
          v-for="participant in splitResults?.participants || []"
          :key="participant.name"
          class="card-editorial"
        >
          <div
            class="flex justify-between items-center mb-6 pb-4 border-b border-[var(--color-border)]"
          >
            <div class="flex items-center gap-3">
              <span
                class="avatar-editorial avatar-editorial-lg"
                :style="{ backgroundColor: participantColor(participant.index) }"
              >
                {{ participant.name?.[0]?.toUpperCase() || 'P' }}
              </span>
              <h3 class="font-serif text-xl">{{ participant.name }}</h3>
            </div>
            <span
              class="font-mono text-2xl font-bold text-[var(--color-accent)]"
            >
              {{ formatCurrency(participant.total) }}
            </span>
          </div>

          <div>
            <!-- Items breakdown -->
            <div
              v-for="item in participant.items"
              :key="item.name"
              class="flex justify-between items-center py-2 border-b border-[var(--color-border-light)]"
            >
              <span class="text-sm text-[var(--color-text-primary)]">
                {{ item.name }}
                <span v-if="item.sharedWith > 1" class="text-caption">
                  (shared with {{ item.sharedWith - 1 }} other{{
                    item.sharedWith > 2 ? 's' : ''
                  }})
                </span>
              </span>
              <span
                class="font-mono text-sm font-medium text-[var(--color-text-primary)]"
              >
                {{ formatCurrency(item.cost) }}
              </span>
            </div>

            <!-- Tax breakdown -->
            <div
              v-if="participant.taxPortion > 0"
              class="flex justify-between items-center py-2 border-b border-[var(--color-border-light)]"
            >
              <span class="text-sm text-[var(--color-accent)]">
                Tax (proportional share)
              </span>
              <span
                class="font-mono text-sm font-medium text-[var(--color-accent)]"
              >
                {{ formatCurrency(participant.taxPortion) }}
              </span>
            </div>

            <!-- Subtotal and total -->
            <div class="pt-4 space-y-2">
              <div class="flex justify-between items-center text-caption">
                <span>Items subtotal:</span>
                <span class="font-mono">{{
                  formatCurrency(participant.itemsTotal)
                }}</span>
              </div>
              <div
                v-if="participant.taxPortion > 0"
                class="flex justify-between items-center text-caption text-[var(--color-accent)]"
              >
                <span>Tax share:</span>
                <span class="font-mono">{{
                  formatCurrency(participant.taxPortion)
                }}</span>
              </div>
              <div class="summary-row summary-row-total">
                <span class="font-medium">Total</span>
                <span
                  class="font-mono font-bold text-xl text-[var(--color-accent)]"
                >
                  {{ formatCurrency(participant.total) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-wrap justify-center gap-4">
        <button class="btn-editorial-outline" @click="goToStep('assign')">
          <IconPencil class="w-5 h-5" />
          <span>Make Changes</span>
        </button>
        <button class="btn-editorial" @click="resetApp">
          <span>Split Another Bill</span>
          <IconPlus class="w-5 h-5" />
        </button>
      </div>
    </div>
  </div>
</template>
