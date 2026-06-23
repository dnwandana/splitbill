<script lang="ts" setup>
import { useSplitBill } from '../../composables/useSplitBill'

const {
  receipt,
  error,
  participants,
  namedParticipants,
  selectedParticipantIndex,
  itemAssignments,
  participantTotals,
  participantColor,
  formatCurrency,
  selectParticipant,
  assignItemToSelected,
  increaseItemQuantity,
  decreaseItemQuantity,
  removeAssignment,
  calculateSplit,
  goToStep
} = useSplitBill()
</script>

<template>
  <!-- Assign Items Step -->
  <div class="step-page-editorial flex flex-col items-center p-4 py-12">
    <div class="w-full max-w-4xl">
      <!-- Header -->
      <div class="step-header-editorial">
        <button class="back-link-editorial mb-6" @click="goToStep('review')">
          <IconChevronLeft class="w-4 h-4" />
          Back to Review
        </button>
        <h1 class="step-title-editorial">Who Gets What?</h1>
        <p class="step-subtitle-editorial">
          Assign items to your squad and we'll handle the math.
        </p>
      </div>

      <div class="space-y-8">
        <!-- Squad Selection -->
        <div class="card-editorial">
          <div class="mb-4">
            <h3 class="font-serif text-xl mb-1">Select Squad Member</h3>
            <p class="text-caption">
              Click a member, then click items to assign them
            </p>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            <div
              v-for="{ name: participant, index } in namedParticipants"
              :key="index"
              role="button"
              tabindex="0"
              :aria-pressed="selectedParticipantIndex === index"
              class="card-editorial card-editorial-interactive p-4 text-center"
              :class="[
                selectedParticipantIndex === index
                  ? 'card-editorial-selected'
                  : ''
              ]"
              @click="selectParticipant(index)"
              @keydown.enter.prevent="selectParticipant(index)"
              @keydown.space.prevent="selectParticipant(index)"
            >
              <div class="flex flex-col items-center gap-2">
                <span
                  class="avatar-editorial avatar-editorial-lg"
                  :style="{ backgroundColor: participantColor(index) }"
                >
                  {{ participant?.trim()?.[0]?.toUpperCase() || 'P' }}
                </span>
                <span
                  class="text-sm font-medium text-[var(--color-text-primary)]"
                >
                  {{ participant.trim() }}
                </span>
                <span
                  class="font-mono text-xs font-semibold text-[var(--color-accent)]"
                >
                  {{ formatCurrency(participantTotals[index]?.total || 0) }}
                </span>
              </div>
            </div>
          </div>

          <div
            v-if="selectedParticipantIndex === null"
            class="mt-6 text-center py-3 bg-[var(--color-bg)] border border-[var(--color-border)]"
          >
            <p class="text-caption">
              Select a squad member above to start assigning items
            </p>
          </div>
          <div
            v-else
            class="mt-6 text-center py-3 bg-[rgba(199,91,57,0.05)] border border-[var(--color-accent)]"
          >
            <p class="text-sm text-[var(--color-accent)]">
              <strong>{{
                participants[selectedParticipantIndex]?.trim()
              }}</strong>
              is selected.
            </p>
            <p class="text-sm text-[var(--color-accent)]">
              Click items below to assign them!
            </p>
          </div>
        </div>

        <!-- Receipt Items -->
        <div class="card-editorial">
          <h3
            class="font-serif text-xl mb-6 pb-4 border-b border-[var(--color-border)]"
          >
            The Goods
          </h3>

          <div class="space-y-4">
            <div
              v-for="(item, itemIndex) in receipt?.items || []"
              :key="itemIndex"
              class="border p-4 transition-all duration-200"
              :class="[
                selectedParticipantIndex !== null
                  ? 'border-[var(--color-border)]'
                  : 'border-[var(--color-border-light)] opacity-60'
              ]"
            >
              <div class="flex flex-col gap-4">
                <!-- Item info -->
                <div class="flex-1">
                  <h4 class="font-medium text-[var(--color-text-primary)]">
                    {{ item.name }}
                  </h4>
                  <p class="text-caption">
                    Qty: {{ item.quantity }} &times;
                    {{ formatCurrency(item.price) }}
                  </p>
                  <div
                    class="font-mono font-semibold text-lg mt-1 text-[var(--color-text-primary)]"
                  >
                    {{ formatCurrency(item.quantity * item.price) }}
                  </div>
                </div>

                <!-- Assigned participants with quantities -->
                <div class="flex flex-wrap gap-2">
                  <template v-for="(p, pIndex) in participants" :key="pIndex">
                    <div
                      v-if="
                        (itemAssignments[itemIndex] || {})[pIndex] && p.trim()
                      "
                      class="flex items-center gap-2 bg-[var(--color-bg)] px-3 py-1 border border-[var(--color-border)]"
                    >
                      <span
                        class="avatar-editorial avatar-editorial-sm"
                        :style="{ backgroundColor: participantColor(pIndex) }"
                      >
                        {{ p?.trim()?.[0]?.toUpperCase() || 'P' }}
                      </span>
                      <span class="text-sm text-[var(--color-text-primary)]">{{
                        p.trim()
                      }}</span>
                      <span
                        class="font-mono text-xs text-[var(--color-accent)] font-semibold"
                      >
                        x{{ (itemAssignments[itemIndex] || {})[pIndex] }}
                      </span>
                    </div>
                  </template>
                  <div
                    v-if="!Object.keys(itemAssignments[itemIndex] || {}).length"
                    class="text-caption px-3 py-1"
                  >
                    Not assigned yet
                  </div>
                </div>

                <!-- Selected participant controls -->
                <div
                  v-if="selectedParticipantIndex !== null"
                  class="border-t border-[var(--color-border)] pt-4"
                >
                  <div
                    v-if="
                      (itemAssignments[itemIndex] || {})[
                        selectedParticipantIndex
                      ]
                    "
                    class="flex items-center justify-between flex-wrap gap-3"
                  >
                    <span class="text-caption">
                      {{ participants[selectedParticipantIndex]?.trim() }}'s
                      quantity:
                    </span>
                    <div class="flex items-center gap-2">
                      <div class="qty-control-editorial">
                        <button
                          aria-label="Decrease quantity"
                          @click.stop="
                            decreaseItemQuantity(
                              itemIndex,
                              selectedParticipantIndex
                            )
                          "
                        >
                          <IconMinus class="w-4 h-4" />
                        </button>
                        <span>
                          {{
                            (itemAssignments[itemIndex] || {})[
                              selectedParticipantIndex
                            ]
                          }}
                        </span>
                        <button
                          aria-label="Increase quantity"
                          @click.stop="
                            increaseItemQuantity(
                              itemIndex,
                              selectedParticipantIndex
                            )
                          "
                        >
                          <IconPlus class="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        class="btn-editorial btn-editorial-sm btn-editorial-danger"
                        @click.stop="
                          removeAssignment(itemIndex, selectedParticipantIndex)
                        "
                      >
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                  <div v-else>
                    <button
                      class="btn-editorial btn-editorial-sm w-full"
                      @click="assignItemToSelected(itemIndex)"
                    >
                      <span
                        >Assign to
                        {{
                          participants[selectedParticipantIndex]?.trim()
                        }}</span
                      >
                    </button>
                  </div>
                </div>
                <div
                  v-else
                  class="text-caption text-center py-2 border-t border-[var(--color-border-light)]"
                >
                  Select a squad member above to assign this item
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Total and Actions -->
      <div class="mt-8">
        <div class="card-editorial mb-8">
          <div class="flex flex-wrap justify-center items-center gap-8">
            <div class="text-center">
              <p class="text-caption mb-1">Subtotal</p>
              <p
                class="font-mono font-bold text-xl text-[var(--color-text-primary)]"
              >
                {{
                  formatCurrency(
                    (receipt?.items || []).reduce(
                      (sum, item) => sum + item.price * item.quantity,
                      0
                    )
                  )
                }}
              </p>
            </div>
            <div v-if="receipt?.tax && receipt.tax > 0" class="text-center">
              <p class="text-caption mb-1">Tax</p>
              <p class="font-mono font-bold text-xl text-[var(--color-accent)]">
                {{ formatCurrency(receipt.tax) }}
              </p>
            </div>
            <div class="text-center">
              <p class="text-caption mb-1">Total</p>
              <p
                class="font-mono font-bold text-2xl text-[var(--color-text-primary)]"
              >
                {{ formatCurrency(receipt?.total || 0) }}
              </p>
            </div>
          </div>
        </div>

        <div v-if="error" class="alert-editorial alert-editorial-error mb-6">
          {{ error }}
        </div>

        <div class="text-center">
          <button class="btn-editorial" @click="calculateSplit">
            <span>Split It Up!</span>
            <IconCheckCircle class="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
