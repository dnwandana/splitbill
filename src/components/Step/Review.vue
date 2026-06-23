<script lang="ts" setup>
import { useSplitBill } from '../../composables/useSplitBill'

const {
  receipt,
  error,
  receiptSubtotal,
  formatCurrency,
  updateItemName,
  updateItemQuantity,
  updateItemPrice,
  removeItem,
  addNewItem,
  updateTax,
  proceedToAssignFromReview,
  goToStep,
} = useSplitBill()
</script>

<template>
  <div
    class="step-page-editorial flex flex-col items-center p-4 py-12"
  >
    <div class="w-full max-w-4xl">
      <!-- Header -->
      <div class="step-header-editorial">
        <button
          class="back-link-editorial mb-6"
          @click="goToStep('participants')"
        >
          <IconChevronLeft class="w-4 h-4" />
          Back to Participants
        </button>
        <h1 class="step-title-editorial">Review Your Receipt</h1>
        <p class="step-subtitle-editorial">
          Double-check the details and make any adjustments before assigning
          items.
        </p>
      </div>

      <!-- Items Card -->
      <div class="card-editorial mb-8">
        <div
          class="flex justify-between items-center mb-6 pb-4 border-b border-[var(--color-border)]"
        >
          <h3 class="font-serif text-xl">Receipt Items</h3>
          <button class="btn-editorial btn-editorial-sm" @click="addNewItem">
            <IconPlus class="w-4 h-4" />
            <span>Add Item</span>
          </button>
        </div>

        <div class="space-y-4">
          <div
            v-for="(item, index) in receipt?.items || []"
            :key="index"
            class="border border-[var(--color-border)] p-4"
          >
            <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <!-- Item Name -->
              <div class="md:col-span-5">
                <label class="label-editorial">Item Name</label>
                <input
                  :value="item.name"
                  type="text"
                  placeholder="Item name"
                  class="input-editorial"
                  @input="
                    updateItemName(
                      index,
                      ($event.target as HTMLInputElement).value
                    )
                  "
                >
              </div>

              <!-- Quantity -->
              <div class="md:col-span-2">
                <label class="label-editorial">Quantity</label>
                <input
                  :value="item.quantity"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Qty"
                  class="input-editorial input-editorial-mono"
                  @input="
                    updateItemQuantity(
                      index,
                      Number(($event.target as HTMLInputElement).value)
                    )
                  "
                >
              </div>

              <!-- Price -->
              <div class="md:col-span-2">
                <label class="label-editorial">Price</label>
                <input
                  :value="item.price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Price"
                  class="input-editorial input-editorial-mono"
                  @input="
                    updateItemPrice(
                      index,
                      Number(($event.target as HTMLInputElement).value)
                    )
                  "
                >
              </div>

              <!-- Total -->
              <div class="md:col-span-2">
                <label class="label-editorial">Total</label>
                <div
                  class="font-mono font-medium text-[var(--color-text-primary)] py-2"
                >
                  {{ formatCurrency(item.quantity * item.price) }}
                </div>
              </div>

              <!-- Delete Button -->
              <div class="md:col-span-1 flex items-end justify-end">
                <button
                  v-if="(receipt?.items || []).length > 1"
                  class="btn-editorial-ghost text-[var(--color-text-secondary)] hover:text-red-600"
                  aria-label="Remove item"
                  @click="removeItem(index)"
                >
                  <IconTrash class="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Summary Card -->
      <div class="card-editorial">
        <h3
          class="font-serif text-xl mb-6 pb-4 border-b border-[var(--color-border)]"
        >
          Summary
        </h3>

        <div>
          <!-- Subtotal (auto-calculated) -->
          <div class="summary-row summary-row-divider">
            <span class="summary-label">Subtotal</span>
            <span class="summary-value font-mono">
              {{ formatCurrency(receiptSubtotal) }}
            </span>
          </div>

          <!-- Tax (editable) -->
          <div class="summary-row summary-row-divider">
            <span class="summary-label">Tax</span>
            <div class="w-32">
              <input
                :value="receipt?.tax || 0"
                type="number"
                min="0"
                step="0.01"
                placeholder="Tax"
                class="input-editorial input-editorial-mono text-right"
                @input="
                  updateTax(Number(($event.target as HTMLInputElement).value))
                "
              >
            </div>
          </div>

          <!-- Total (auto-calculated) -->
          <div class="summary-row summary-row-total">
            <span class="font-medium text-[var(--color-text-primary)]"
              >Total</span
            >
            <span
              class="font-mono font-bold text-2xl text-[var(--color-accent)]"
            >
              {{ formatCurrency(receipt?.total || 0) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="error" class="alert-editorial alert-editorial-error mt-6">
        {{ error }}
      </div>

      <!-- Action Buttons -->
      <div class="flex justify-center mt-8">
        <button class="btn-editorial" @click="proceedToAssignFromReview">
          <span>Continue to Assignment</span>
          <IconArrowRight class="w-5 h-5" />
        </button>
      </div>
    </div>
  </div>
</template>
