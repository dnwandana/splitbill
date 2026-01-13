<script lang="ts" setup>
import { detectUserCurrency, formatCurrencyAmount } from '../utils/currency'
import { useAnalytics } from '../composables/useAnalytics'

// Analytics
const analytics = useAnalytics()

// SEO Meta
useSeoMeta({
  title: 'SplitBill AI: Snap, Split, Done. Group Bills Made Easy.',
  description:
    'Tired of awkward bill math? Just snap a photo of your receipt and let our AI handle the rest. Split expenses with your squad in seconds. Fast, free, and accurate.',
  ogTitle: 'SplitBill AI: Snap, Split, Done. Group Bills Made Easy.',
  ogDescription:
    'Tired of awkward bill math? Just snap a photo of your receipt and let our AI handle the rest. Split expenses with your squad in seconds. Fast, free, and accurate.',
  twitterCard: 'summary_large_image'
})

// Types
interface ReceiptItem {
  name: string
  quantity: number
  price: number
}

interface Receipt {
  items: ReceiptItem[]
  tax: number
  total: number
}

interface ParticipantResult {
  name: string
  total: number
  itemsTotal: number
  taxPortion: number
  items: {
    name: string
    cost: number
    sharedWith: number
  }[]
}

interface SplitResults {
  participants: ParticipantResult[]
  originalTotal: number
  splitTotal: number
  subtotal: number
  tax: number
}

// Application state
const currentStep = ref<
  'landing' | 'upload' | 'participants' | 'review' | 'assign' | 'results'
>('landing')
const file = ref<File | null>(null)
const isParsingInBackground = ref(false)
const parseProgress = ref<
  'idle' | 'uploading' | 'parsing' | 'complete' | 'error'
>('idle')
const receipt = ref<Receipt | null>(null)
const participants = ref<string[]>([''])
const itemAssignments = ref<Record<number, Record<number, number>>>({})
const splitResults = ref<SplitResults | null>(null)
const error = ref<string | null>(null)
const selectedParticipantIndex = ref<number | null>(null)

// Currency/Locale detection (client-side)
const userLocale = ref('en-US')
const userCurrency = ref('USD')
const formatCurrency = (amount: number) =>
  formatCurrencyAmount(amount, userLocale.value, userCurrency.value)

interface CurrencyOption {
  label: string
  value: string
}
const currencyItems: CurrencyOption[] = [
  { label: 'US Dollar (USD)', value: 'USD' },
  { label: 'Euro (EUR)', value: 'EUR' },
  { label: 'British Pound (GBP)', value: 'GBP' },
  { label: 'Japanese Yen (JPY)', value: 'JPY' },
  { label: 'Australian Dollar (AUD)', value: 'AUD' },
  { label: 'Canadian Dollar (CAD)', value: 'CAD' },
  { label: 'Singapore Dollar (SGD)', value: 'SGD' },
  { label: 'Indonesian Rupiah (IDR)', value: 'IDR' },
  { label: 'Malaysian Ringgit (MYR)', value: 'MYR' },
  { label: 'Thai Baht (THB)', value: 'THB' },
  { label: 'Philippine Peso (PHP)', value: 'PHP' },
  { label: 'Indian Rupee (INR)', value: 'INR' },
  { label: 'Chinese Yuan (CNY)', value: 'CNY' },
  { label: 'Korean Won (KRW)', value: 'KRW' },
  { label: 'Hong Kong Dollar (HKD)', value: 'HKD' },
  { label: 'New Taiwan Dollar (TWD)', value: 'TWD' },
  { label: 'New Zealand Dollar (NZD)', value: 'NZD' },
  { label: 'Swiss Franc (CHF)', value: 'CHF' },
  { label: 'Swedish Krona (SEK)', value: 'SEK' },
  { label: 'Norwegian Krone (NOK)', value: 'NOK' },
  { label: 'Danish Krone (DKK)', value: 'DKK' },
  { label: 'Polish Zloty (PLN)', value: 'PLN' },
  { label: 'Czech Koruna (CZK)', value: 'CZK' },
  { label: 'Hungarian Forint (HUF)', value: 'HUF' },
  { label: 'Turkish Lira (TRY)', value: 'TRY' },
  { label: 'South African Rand (ZAR)', value: 'ZAR' },
  { label: 'Brazilian Real (BRL)', value: 'BRL' },
  { label: 'Mexican Peso (MXN)', value: 'MXN' },
  { label: 'Israeli Shekel (ILS)', value: 'ILS' },
  { label: 'UAE Dirham (AED)', value: 'AED' },
  { label: 'Saudi Riyal (SAR)', value: 'SAR' },
  { label: 'Vietnamese Dong (VND)', value: 'VND' }
]

// Scroll reveal observer
const setupScrollReveal = () => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed')
          observer.unobserve(entry.target)
        }
      })
    },
    {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    }
  )

  document.querySelectorAll('.reveal').forEach((el) => {
    observer.observe(el)
  })
}

onMounted(() => {
  const { locale, currency } = detectUserCurrency()
  userLocale.value = locale

  // Initialize with detected currency or fallback to USD
  const detectedCurrency = currencyItems.find((c) => c.value === currency)
    ? currency
    : 'USD'
  userCurrency.value = detectedCurrency

  // Track page view
  analytics.trackStep('landing')

  // Setup scroll reveal animations
  nextTick(() => {
    setupScrollReveal()
  })
})

// Track currency changes
watch(userCurrency, (newCurrency) => {
  analytics.trackCurrencyChange(newCurrency)
})

// Participant colors for avatars
const participantColors = [
  '#3b82f6',
  '#10b981',
  '#ef4444',
  '#f97316',
  '#8b5cf6',
  '#d946ef',
  '#ec4899',
  '#64748b'
]
const participantColor = (index: number) => {
  return participantColors[index % participantColors.length]
}

// Real-time totals for each participant
const participantTotals = computed(() => {
  if (!receipt.value) return []

  // Calculate subtotal (items only, excluding tax)
  const subtotal = receipt.value.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )

  return participants.value.map((name, pIndex) => {
    let itemsTotal = 0
    receipt.value!.items.forEach((item: ReceiptItem, itemIndex: number) => {
      const assignments = itemAssignments.value[itemIndex] || {}
      const quantity = assignments[pIndex] || 0
      if (quantity > 0) {
        // Calculate total assigned quantity for this item
        const totalAssignedQty = Object.values(assignments).reduce(
          (sum, qty) => sum + qty,
          0
        )
        // Split the total item cost proportionally
        const totalItemCost = item.price * item.quantity
        const itemCost =
          totalAssignedQty > 0
            ? (quantity / totalAssignedQty) * totalItemCost
            : 0
        itemsTotal += itemCost
      }
    })

    // Calculate proportional tax for this participant
    const taxPortion =
      subtotal > 0 ? (itemsTotal / subtotal) * (receipt.value?.tax || 0) : 0
    const total = itemsTotal + taxPortion

    return {
      name: name.trim(),
      total,
      itemsTotal,
      taxPortion
    }
  })
})

// File upload state
const isDragOver = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

// Navigate between steps
const goToStep = (step: typeof currentStep.value) => {
  currentStep.value = step
  error.value = null

  // Track step view
  analytics.trackStep(step)
}

// Start background parsing and navigate to participants
const startParsing = () => {
  if (!file.value) {
    error.value = 'Please select a receipt image'
    return
  }

  // Start background parsing
  parseReceiptInBackground()
  // Navigate to participants step immediately
  goToStep('participants')
}

// Parse receipt in background
const parseReceiptInBackground = async () => {
  if (!file.value) return

  isParsingInBackground.value = true
  parseProgress.value = 'uploading'
  error.value = null

  try {
    const formData = new FormData()
    formData.append('receipt', file.value as File)

    parseProgress.value = 'parsing'
    const response = (await $fetch('/api/parse', {
      method: 'POST',
      body: formData
    })) as { data: { receipt: Receipt } }

    receipt.value = response.data.receipt
    // Initialize assignments for each item
    itemAssignments.value = {}
    receipt.value.items.forEach((_: ReceiptItem, index: number) => {
      itemAssignments.value[index] = {}
    })
    parseProgress.value = 'complete'
  } catch (err: unknown) {
    const errorObj = err as { data?: { message?: string } }
    parseProgress.value = 'error'
    error.value = errorObj.data?.message || 'Failed to parse receipt'
    analytics.trackError('upload')
  } finally {
    isParsingInBackground.value = false
  }
}

// Add participant
const addParticipant = () => {
  participants.value.push('')
}

// Remove participant
const removeParticipant = (index: number) => {
  if (participants.value.length > 1) {
    participants.value.splice(index, 1)
    // Remove this participant from all assignments and reindex
    Object.keys(itemAssignments.value).forEach((itemIndexStr) => {
      const itemIndex = parseInt(itemIndexStr)
      if (itemAssignments.value[itemIndex]) {
        const assignments = itemAssignments.value[itemIndex]
        const newAssignments: Record<number, number> = {}

        Object.keys(assignments).forEach((pIndexStr) => {
          const pIndex = parseInt(pIndexStr)
          if (pIndex !== index) {
            // Reindex participants after the removed one
            const newPIndex = pIndex > index ? pIndex - 1 : pIndex
            const quantity = assignments[pIndex]
            if (quantity !== undefined) {
              newAssignments[newPIndex] = quantity
            }
          }
        })

        itemAssignments.value[itemIndex] = newAssignments
      }
    })
  }
}

// Assign item to currently selected participant
const assignItemToSelected = (itemIndex: number) => {
  if (selectedParticipantIndex.value === null) return

  if (!itemAssignments.value[itemIndex]) {
    itemAssignments.value[itemIndex] = {}
  }

  const assignments = itemAssignments.value[itemIndex]
  const participantIndex = selectedParticipantIndex.value

  // Assign with default quantity of 1 if not already assigned
  if (!assignments[participantIndex]) {
    assignments[participantIndex] = 1
  }
}

// Increase item quantity for a participant
const increaseItemQuantity = (itemIndex: number, participantIndex: number) => {
  if (!itemAssignments.value[itemIndex]) {
    itemAssignments.value[itemIndex] = {}
  }
  const assignments = itemAssignments.value[itemIndex]
  const currentQty = assignments[participantIndex] || 0
  assignments[participantIndex] = currentQty + 1
}

// Decrease item quantity for a participant
const decreaseItemQuantity = (itemIndex: number, participantIndex: number) => {
  if (!itemAssignments.value[itemIndex]) return

  const assignments = itemAssignments.value[itemIndex]
  const currentQty = assignments[participantIndex] || 0

  if (currentQty > 1) {
    assignments[participantIndex] = currentQty - 1
  } else if (currentQty === 1) {
    // Remove assignment if quantity reaches 0
    const newAssignments = { ...assignments }
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete newAssignments[participantIndex]
    itemAssignments.value[itemIndex] = newAssignments
  }
}

// Remove assignment completely
const removeAssignment = (itemIndex: number, participantIndex: number) => {
  if (!itemAssignments.value[itemIndex]) return
  const assignments = itemAssignments.value[itemIndex]
  const newAssignments = { ...assignments }
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete newAssignments[participantIndex]
  itemAssignments.value[itemIndex] = newAssignments
}

// Select participant for assignment
const selectParticipant = (participantIndex: number) => {
  selectedParticipantIndex.value = participantIndex
}

// Navigate to review step (with validation)
const proceedToAssign = () => {
  const validParticipants = participants.value.filter((p) => p.trim())
  if (validParticipants.length === 0) {
    error.value = 'Please add at least one participant'
    return
  }

  // Check if parsing is complete
  if (parseProgress.value !== 'complete' || !receipt.value) {
    error.value = 'Please wait for receipt parsing to complete'
    return
  }

  error.value = null
  analytics.trackStepComplete('participants')
  goToStep('review')
}

// Navigate to assign step from review (with validation)
const proceedToAssignFromReview = () => {
  if (!receipt.value || receipt.value.items.length === 0) {
    error.value = 'Please add at least one item'
    return
  }

  error.value = null
  selectedParticipantIndex.value = null // Reset selection when entering assign step
  analytics.trackStepComplete('review')
  goToStep('assign')
}

// Item management functions for review step
const updateItemName = (index: number, name: string) => {
  if (receipt.value && receipt.value.items[index]) {
    receipt.value.items[index].name = name
  }
}

const updateItemQuantity = (index: number, quantity: number) => {
  if (receipt.value && receipt.value.items[index]) {
    const parsedQuantity = parseFloat(String(quantity))
    if (!isNaN(parsedQuantity) && parsedQuantity > 0) {
      receipt.value.items[index].quantity = parsedQuantity
      recalculateTotal()
    }
  }
}

const updateItemPrice = (index: number, price: number) => {
  if (receipt.value && receipt.value.items[index]) {
    const parsedPrice = parseFloat(String(price))
    if (!isNaN(parsedPrice) && parsedPrice >= 0) {
      receipt.value.items[index].price = parsedPrice
      recalculateTotal()
    }
  }
}

const removeItem = (index: number) => {
  if (receipt.value && receipt.value.items.length > 1) {
    receipt.value.items.splice(index, 1)

    // Remove and update item assignments
    const newAssignments: Record<number, Record<number, number>> = {}
    Object.keys(itemAssignments.value).forEach((itemIndexStr) => {
      const itemIndex = parseInt(itemIndexStr)
      if (itemIndex < index) {
        // Keep assignments for items before the removed one
        const assignments = itemAssignments.value[itemIndex]
        if (assignments) {
          newAssignments[itemIndex] = assignments
        }
      } else if (itemIndex > index) {
        // Shift down assignments for items after the removed one
        const assignments = itemAssignments.value[itemIndex]
        if (assignments) {
          newAssignments[itemIndex - 1] = assignments
        }
      }
      // Skip the removed item's assignments
    })
    itemAssignments.value = newAssignments
    recalculateTotal()
  }
}

const addNewItem = () => {
  if (receipt.value) {
    receipt.value.items.push({
      name: '',
      quantity: 1,
      price: 0
    })
    // Initialize assignments for the new item
    itemAssignments.value[receipt.value.items.length - 1] = {}
  }
}

const updateTax = (tax: number) => {
  if (receipt.value) {
    const parsedTax = parseFloat(String(tax))
    if (!isNaN(parsedTax) && parsedTax >= 0) {
      receipt.value.tax = parsedTax
      recalculateTotal()
    }
  }
}

const recalculateTotal = () => {
  if (receipt.value) {
    const subtotal = receipt.value.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    )
    receipt.value.total = subtotal + (receipt.value.tax || 0)
  }
}

// Computed property for subtotal
const receiptSubtotal = computed(() => {
  if (!receipt.value) return 0
  return receipt.value.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )
})

// Calculate split
const calculateSplit = () => {
  if (!receipt.value) return

  const validParticipants = participants.value.filter((p) => p.trim())
  if (validParticipants.length === 0) {
    error.value = 'Please add at least one participant'
    return
  }

  // Calculate subtotal (items only, excluding tax)
  const subtotal = receipt.value.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )

  const results = validParticipants.map((name, pIndex) => {
    let itemsTotal = 0
    const items: { name: string; cost: number; sharedWith: number }[] = []

    receipt.value!.items.forEach((item: ReceiptItem, itemIndex: number) => {
      const assignments = itemAssignments.value[itemIndex] || {}
      const quantity = assignments[pIndex] || 0
      if (quantity > 0) {
        // Calculate total assigned quantity for this item
        const totalAssignedQty = Object.values(assignments).reduce(
          (sum, qty) => sum + qty,
          0
        )
        // Calculate how many people are sharing this item
        const sharedWith = Object.keys(assignments).length
        // Split the total item cost proportionally
        const totalItemCost = item.price * item.quantity
        const itemCost =
          totalAssignedQty > 0
            ? (quantity / totalAssignedQty) * totalItemCost
            : 0
        itemsTotal += itemCost
        items.push({
          name: `${item.name} (x${quantity})`,
          cost: itemCost,
          sharedWith
        })
      }
    })

    // Calculate proportional tax for this participant
    const taxPortion =
      subtotal > 0 ? (itemsTotal / subtotal) * (receipt.value?.tax || 0) : 0
    const total = itemsTotal + taxPortion

    return {
      name: name.trim(),
      total: Math.round(total * 100) / 100,
      itemsTotal: Math.round(itemsTotal * 100) / 100,
      taxPortion: Math.round(taxPortion * 100) / 100,
      items
    }
  })

  splitResults.value = {
    participants: results,
    originalTotal: receipt.value!.total,
    splitTotal: results.reduce((sum, p) => sum + p.total, 0),
    subtotal: subtotal,
    tax: receipt.value!.tax || 0
  }

  analytics.trackStepComplete('assign')
  goToStep('results')
}

// File upload utilities
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const validateFile = (selectedFile: File): boolean => {
  const maxSize = 10 * 1024 * 1024 // 10MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

  if (!allowedTypes.includes(selectedFile.type)) {
    error.value = 'Please select a valid image file (JPEG, PNG, or WebP)'
    return false
  }

  if (selectedFile.size > maxSize) {
    error.value = 'File size must be less than 10MB'
    return false
  }

  return true
}

// File upload handlers
const triggerFileInput = () => {
  fileInput.value?.click()
}

const onFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const selectedFile = target.files?.[0]
  if (selectedFile && validateFile(selectedFile)) {
    file.value = selectedFile
    error.value = null
  }
}

const onDragOver = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = true
}

const onDragLeave = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false
}

const onDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false

  const droppedFile = event.dataTransfer?.files[0]
  if (droppedFile && validateFile(droppedFile)) {
    file.value = droppedFile
    error.value = null
  }
}

const clearFile = () => {
  file.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// Reset application
const resetApp = () => {
  currentStep.value = 'landing'
  file.value = null
  receipt.value = null
  participants.value = ['']
  itemAssignments.value = {}
  splitResults.value = null
  error.value = null
  selectedParticipantIndex.value = null
  isParsingInBackground.value = false
  parseProgress.value = 'idle'
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}
</script>

<template>
  <!-- Landing Page - Editorial Design -->
  <div v-if="currentStep === 'landing'" class="editorial-page min-h-screen">
    <!-- Subtle grain overlay -->
    <div class="grain-overlay pointer-events-none" />

    <!-- Header -->
    <header class="py-6 border-b border-[var(--color-border)]">
      <div class="container-editorial">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-3 animate-fade-in">
            <span class="font-serif text-2xl font-medium tracking-tight"
              >SplitBill</span
            >
          </div>
          <div class="flex items-center gap-6">
            <select
              v-model="userCurrency"
              class="select-editorial w-28 md:w-40 animate-fade-in delay-1"
            >
              <option
                v-for="item in currencyItems"
                :key="item.value"
                :value="item.value"
              >
                {{ item.label }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </header>

    <!-- Hero Section -->
    <section class="section-padding overflow-hidden">
      <div class="container-editorial">
        <div
          class="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center min-h-[70vh]"
        >
          <!-- Left: Copy -->
          <div class="order-2 lg:order-1">
            <p class="text-overline mb-6 animate-fade-in-up delay-0">
              AI-Powered Bill Splitting
            </p>
            <h1 class="text-display mb-8 animate-fade-in-up delay-1">
              Split bills.<br />
              <em class="text-[var(--color-accent)]">Effortlessly.</em>
            </h1>
            <p class="text-subhead max-w-lg mb-10 animate-fade-in-up delay-2">
              Snap a photo of your receipt. Our AI extracts every item. Assign
              with a tap. Everyone pays their fair share.
            </p>
            <div class="flex flex-wrap gap-4 mb-12 animate-fade-in-up delay-3">
              <button class="btn-editorial" @click="goToStep('upload')">
                <span>Scan Your Receipt</span>
                <svg
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </button>
            </div>
            <!-- Trust signals -->
            <div
              class="flex flex-wrap items-center gap-6 text-caption animate-fade-in-up delay-4"
            >
              <div class="flex items-center gap-2">
                <svg
                  class="w-4 h-4 text-[var(--color-accent)]"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clip-rule="evenodd"
                  />
                </svg>
                <span>No signup required</span>
              </div>
              <div class="flex items-center gap-2">
                <svg
                  class="w-4 h-4 text-[var(--color-accent)]"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clip-rule="evenodd"
                  />
                </svg>
                <span>Privacy-first</span>
              </div>
              <div class="flex items-center gap-2">
                <svg
                  class="w-4 h-4 text-[var(--color-accent)]"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                    clip-rule="evenodd"
                  />
                </svg>
                <span>Instant results</span>
              </div>
            </div>
          </div>

          <!-- Right: Animated Receipt Demo -->
          <div
            class="order-1 lg:order-2 flex justify-center lg:justify-end animate-slide-right delay-2"
          >
            <div class="relative">
              <!-- Decorative elements -->
              <div
                class="absolute -top-4 -left-4 w-24 h-24 border border-[var(--color-border)] opacity-50"
              />
              <div
                class="absolute -bottom-4 -right-4 w-24 h-24 bg-[var(--color-accent)] opacity-10"
              />

              <!-- Receipt mockup -->
              <div class="receipt-mockup animate-float relative z-10">
                <div
                  class="text-center mb-4 pb-3 border-b border-dashed border-gray-300"
                >
                  <p class="font-bold text-sm">THE HUNGRY FORK</p>
                  <p class="text-xs text-gray-500">123 Main Street</p>
                </div>
                <div class="space-y-2 mb-4 text-xs">
                  <div class="flex justify-between">
                    <span>Margherita Pizza</span>
                    <span class="font-mono">$18.00</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Caesar Salad</span>
                    <span class="font-mono">$12.00</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Pasta Carbonara</span>
                    <span class="font-mono">$16.00</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Tiramisu x2</span>
                    <span class="font-mono">$14.00</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Drinks</span>
                    <span class="font-mono">$24.00</span>
                  </div>
                </div>
                <div
                  class="border-t border-dashed border-gray-300 pt-3 space-y-1 text-xs"
                >
                  <div class="flex justify-between">
                    <span>Subtotal</span>
                    <span class="font-mono">$84.00</span>
                  </div>
                  <div class="flex justify-between text-gray-500">
                    <span>Tax (8%)</span>
                    <span class="font-mono">$6.72</span>
                  </div>
                  <div
                    class="flex justify-between font-bold text-sm pt-2 border-t border-gray-200"
                  >
                    <span>TOTAL</span>
                    <span class="font-mono">$90.72</span>
                  </div>
                </div>
                <div
                  class="mt-4 pt-3 border-t border-dashed border-gray-300 text-center"
                >
                  <p class="text-xs text-gray-400">Thank you!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Narrative Section -->
    <section
      class="py-24 md:py-32 bg-[var(--color-bg-card)] border-y border-[var(--color-border)]"
    >
      <div class="container-editorial">
        <div class="max-w-3xl mx-auto">
          <p class="text-overline mb-8 reveal">The Problem</p>
          <p class="pull-quote mb-12 reveal" style="transition-delay: 100ms">
            "Who had the extra appetizer? Did you split the wine? I only had
            water..."
          </p>
          <p
            class="text-body text-[var(--color-text-secondary)] mb-8 reveal"
            style="transition-delay: 200ms"
          >
            We've all been there. The check arrives, and suddenly everyone's
            doing mental gymnastics trying to figure out who owes what.
            Calculator apps get passed around. Someone inevitably pays too much.
            Someone else pays too little.
          </p>
          <div
            class="divider-editorial mb-8 reveal"
            style="transition-delay: 300ms"
          />
          <p class="text-body reveal" style="transition-delay: 400ms">
            <strong>SplitBill changes everything.</strong> Just photograph your
            receipt. Our AI reads every line item instantly. Tap to assign.
            Done. Fair splits in seconds, not arguments.
          </p>
        </div>
      </div>
    </section>

    <!-- How It Works Section -->
    <section class="section-padding">
      <div class="container-editorial">
        <div class="text-center mb-16 md:mb-24">
          <p class="text-overline mb-4 reveal">The Process</p>
          <h2 class="text-headline reveal" style="transition-delay: 100ms">
            Three steps to fair splits
          </h2>
        </div>

        <div class="grid md:grid-cols-3 gap-8 md:gap-12">
          <!-- Step 1 -->
          <div class="reveal" style="transition-delay: 200ms">
            <span class="editorial-number">01</span>
            <h3 class="font-serif text-2xl mb-4 mt-2">Capture</h3>
            <p class="text-body text-[var(--color-text-secondary)]">
              Snap a photo of your receipt or upload an existing image. Our AI
              processes it instantly, extracting every item, price, and tax.
            </p>
          </div>

          <!-- Step 2 -->
          <div class="reveal" style="transition-delay: 300ms">
            <span class="editorial-number">02</span>
            <h3 class="font-serif text-2xl mb-4 mt-2">Assign</h3>
            <p class="text-body text-[var(--color-text-secondary)]">
              Add your group members. Tap items to assign them. Split shared
              dishes between multiple people with a single gesture.
            </p>
          </div>

          <!-- Step 3 -->
          <div class="reveal" style="transition-delay: 400ms">
            <span class="editorial-number">03</span>
            <h3 class="font-serif text-2xl mb-4 mt-2">Settle</h3>
            <p class="text-body text-[var(--color-text-secondary)]">
              See exactly what everyone owes, tax included. No more guesswork.
              No more "I'll Venmo you later" that never happens.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Grid -->
    <section class="py-24 md:py-32 bg-[var(--color-text-primary)]">
      <div class="container-editorial">
        <div class="text-center mb-16">
          <p class="text-overline text-[var(--color-accent)] mb-4 reveal">
            Features
          </p>
          <h2
            class="text-headline text-white reveal"
            style="transition-delay: 100ms"
          >
            Built for real-world dining
          </h2>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          <div
            class="card-editorial bg-white/5 border-white/10 hover:border-white/20 reveal"
            style="transition-delay: 200ms"
          >
            <div
              class="w-10 h-10 flex items-center justify-center bg-[var(--color-accent)] text-white mb-6"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h3 class="font-serif text-xl text-white mb-3">AI-Powered OCR</h3>
            <p class="text-gray-400 text-sm">
              Advanced vision models read receipts with near-perfect accuracy.
              Handles messy handwriting, faded prints, and complex layouts.
            </p>
          </div>

          <div
            class="card-editorial bg-white/5 border-white/10 hover:border-white/20 reveal"
            style="transition-delay: 250ms"
          >
            <div
              class="w-10 h-10 flex items-center justify-center bg-[var(--color-accent)] text-white mb-6"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 class="font-serif text-xl text-white mb-3">
              Flexible Splitting
            </h3>
            <p class="text-gray-400 text-sm">
              Share appetizers between three people. Split wine by the glass.
              Handle any combination of individual and shared items.
            </p>
          </div>

          <div
            class="card-editorial bg-white/5 border-white/10 hover:border-white/20 reveal"
            style="transition-delay: 300ms"
          >
            <div
              class="w-10 h-10 flex items-center justify-center bg-[var(--color-accent)] text-white mb-6"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 class="font-serif text-xl text-white mb-3">30+ Currencies</h3>
            <p class="text-gray-400 text-sm">
              Traveling abroad? We auto-detect your location and support
              currencies from USD to VND and everything in between.
            </p>
          </div>

          <div
            class="card-editorial bg-white/5 border-white/10 hover:border-white/20 reveal"
            style="transition-delay: 350ms"
          >
            <div
              class="w-10 h-10 flex items-center justify-center bg-[var(--color-accent)] text-white mb-6"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 class="font-serif text-xl text-white mb-3">Proportional Tax</h3>
            <p class="text-gray-400 text-sm">
              Tax is automatically split proportionally based on what each
              person ordered. Penny-perfect calculations every time.
            </p>
          </div>

          <div
            class="card-editorial bg-white/5 border-white/10 hover:border-white/20 reveal"
            style="transition-delay: 400ms"
          >
            <div
              class="w-10 h-10 flex items-center justify-center bg-[var(--color-accent)] text-white mb-6"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 class="font-serif text-xl text-white mb-3">Mobile Optimized</h3>
            <p class="text-gray-400 text-sm">
              Designed for phones first. Snap a photo right at the table, split,
              and settle before dessert arrives.
            </p>
          </div>

          <div
            class="card-editorial bg-white/5 border-white/10 hover:border-white/20 reveal"
            style="transition-delay: 450ms"
          >
            <div
              class="w-10 h-10 flex items-center justify-center bg-[var(--color-accent)] text-white mb-6"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <h3 class="font-serif text-xl text-white mb-3">Privacy First</h3>
            <p class="text-gray-400 text-sm">
              No accounts. No data stored. Cookie-free analytics. Your receipt
              is processed and forgotten instantly.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Social Proof / Stats -->
    <section class="py-24 md:py-32 border-b border-[var(--color-border)]">
      <div class="container-editorial">
        <div class="text-center max-w-2xl mx-auto">
          <p class="text-display mb-8 reveal">
            <span class="text-[var(--color-accent)]">Fair splits</span> for
            every table.
          </p>
          <p class="text-subhead reveal" style="transition-delay: 100ms">
            Whether it's a coffee date or a 20-person celebration, SplitBill
            handles it all with precision and ease.
          </p>
        </div>
      </div>
    </section>

    <!-- Final CTA -->
    <section class="py-24 md:py-32">
      <div class="container-editorial">
        <div class="max-w-2xl mx-auto text-center">
          <p class="text-overline mb-6 reveal">Get Started</p>
          <h2 class="text-headline mb-8 reveal" style="transition-delay: 100ms">
            Ready to split smarter?
          </h2>
          <p class="text-subhead mb-12 reveal" style="transition-delay: 200ms">
            No signup. No fees. Just fair splits in seconds.
          </p>
          <div class="reveal" style="transition-delay: 300ms">
            <button class="btn-editorial" @click="goToStep('upload')">
              <span>Scan Your Receipt</span>
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="py-8 border-t border-[var(--color-border)]">
      <div class="container-editorial">
        <div
          class="flex flex-col md:flex-row justify-between items-center gap-4"
        >
          <p class="font-serif text-lg">SplitBill</p>
          <div
            class="flex flex-wrap items-center justify-center gap-4 text-caption"
          >
            <span>
              Hosted on
              <a
                href="https://vercel.com"
                target="_blank"
                class="link-underline"
                >Vercel</a
              >
            </span>
            <span class="text-[var(--color-border)]">|</span>
            <span>
              AI by
              <a
                href="https://openrouter.ai"
                target="_blank"
                class="link-underline"
                >OpenRouter</a
              >
            </span>
            <span class="text-[var(--color-border)]">|</span>
            <span>
              Analytics by
              <a href="https://umami.is" target="_blank" class="link-underline"
                >Umami</a
              >
            </span>
          </div>
        </div>
      </div>
    </footer>
  </div>

  <!-- Upload Receipt Step -->
  <div
    v-else-if="currentStep === 'upload'"
    class="step-page-editorial flex flex-col items-center justify-center p-4 py-12"
  >
    <div class="w-full max-w-2xl">
      <!-- Header -->
      <div class="step-header-editorial">
        <button class="back-link-editorial mb-6" @click="goToStep('landing')">
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Home
        </button>
        <h1 class="step-title-editorial">Receipt Ready?</h1>
        <p class="step-subtitle-editorial">
          Sharp photo in, fair split out. Simple as that.
        </p>
      </div>

      <!-- File Upload -->
      <div class="mb-8">
        <div
          class="upload-zone-editorial"
          :class="{
            'drag-over': isDragOver,
            'has-file': file
          }"
          @dragover.prevent="onDragOver"
          @dragleave.prevent="onDragLeave"
          @drop.prevent="onDrop"
          @click="triggerFileInput"
        >
          <input
            ref="fileInput"
            type="file"
            accept="image/jpeg,image/png,image/jpg,image/webp"
            class="hidden"
            @change="onFileSelect"
          />

          <div class="flex flex-col items-center justify-center">
            <div class="w-16 h-16 mb-6 flex items-center justify-center">
              <svg
                class="w-full h-full"
                :class="
                  file
                    ? 'text-[var(--color-accent)]'
                    : 'text-[var(--color-border)]'
                "
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div v-if="file" class="text-center">
              <p
                class="font-serif text-xl mb-2 text-[var(--color-text-primary)]"
              >
                {{ file.name }}
              </p>
              <p class="text-caption mb-4">
                {{ formatFileSize(file.size) }}
              </p>
              <button
                class="btn-editorial btn-editorial-sm btn-editorial-danger"
                @click.stop="clearFile"
              >
                <span>Remove File</span>
              </button>
            </div>
            <div v-else class="text-center">
              <p
                class="font-serif text-xl mb-2 text-[var(--color-text-primary)]"
              >
                Drop your receipt here
              </p>
              <p class="text-caption">
                or click to browse · JPEG, PNG, WebP up to 10MB
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="error" class="alert-editorial alert-editorial-error mb-8">
        {{ error }}
      </div>

      <!-- Action Buttons -->
      <div class="flex justify-center">
        <button
          :disabled="!file"
          class="btn-editorial"
          :class="{ 'opacity-50 cursor-not-allowed': !file }"
          @click="startParsing"
        >
          <span>Add Participants</span>
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 8l4 4m0 0l-4 4m4-4H3"
            />
          </svg>
        </button>
      </div>
    </div>
  </div>

  <!-- Participants Step -->
  <div v-else-if="currentStep === 'participants'" class="step-page-editorial">
    <div class="container-editorial py-12">
      <div class="max-w-2xl mx-auto">
        <!-- Header -->
        <div class="step-header-editorial">
          <button class="back-link-editorial mb-6" @click="goToStep('upload')">
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
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
              <svg
                v-if="parseProgress === 'parsing'"
                class="w-5 h-5 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <svg
                v-else-if="parseProgress === 'complete'"
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <svg
                v-else-if="parseProgress === 'error'"
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <svg
                v-else
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
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
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
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
                class="input-editorial flex-1"
              />
              <button
                v-if="participants.length > 1"
                class="btn-editorial-ghost text-[var(--color-text-secondary)] hover:text-red-600"
                @click="removeParticipant(index)"
              >
                <svg
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
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
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Review Receipt Step -->
  <div v-else-if="currentStep === 'review'" class="step-page-editorial">
    <div class="container-editorial py-12">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="step-header-editorial">
          <button
            class="back-link-editorial mb-6"
            @click="goToStep('participants')"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
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
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>Add Item</span>
            </button>
          </div>

          <div class="space-y-4">
            <div
              v-for="(item, index) in receipt?.items || []"
              :key="index"
              class="border border-[var(--color-border)] p-4"
            >
              <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
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
                  />
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
                  />
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
                  />
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
                    @click="removeItem(index)"
                  >
                    <svg
                      class="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
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
                />
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
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Assign Items Step -->
  <div v-else-if="currentStep === 'assign'" class="step-page-editorial">
    <div class="container-editorial py-12">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="step-header-editorial">
          <button class="back-link-editorial mb-6" @click="goToStep('review')">
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
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
                v-for="(participant, index) in participants.filter((p) =>
                  p.trim()
                )"
                :key="index"
                class="card-editorial card-editorial-interactive p-4 text-center"
                :class="[
                  selectedParticipantIndex === index
                    ? 'card-editorial-selected'
                    : ''
                ]"
                @click="selectParticipant(index)"
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
                is selected. Click items below to assign them!
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
                        <span
                          class="text-sm text-[var(--color-text-primary)]"
                          >{{ p.trim() }}</span
                        >
                        <span
                          class="font-mono text-xs text-[var(--color-accent)] font-semibold"
                        >
                          x{{ (itemAssignments[itemIndex] || {})[pIndex] }}
                        </span>
                      </div>
                    </template>
                    <div
                      v-if="
                        !Object.keys(itemAssignments[itemIndex] || {}).length
                      "
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
                            @click.stop="
                              decreaseItemQuantity(
                                itemIndex,
                                selectedParticipantIndex
                              )
                            "
                          >
                            <svg
                              class="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M20 12H4"
                              />
                            </svg>
                          </button>
                          <span>
                            {{
                              (itemAssignments[itemIndex] || {})[
                                selectedParticipantIndex
                              ]
                            }}
                          </span>
                          <button
                            @click.stop="
                              increaseItemQuantity(
                                itemIndex,
                                selectedParticipantIndex
                              )
                            "
                          >
                            <svg
                              class="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M12 4v16m8-8H4"
                              />
                            </svg>
                          </button>
                        </div>
                        <button
                          class="btn-editorial btn-editorial-sm btn-editorial-danger"
                          @click.stop="
                            removeAssignment(
                              itemIndex,
                              selectedParticipantIndex
                            )
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
                <p
                  class="font-mono font-bold text-xl text-[var(--color-accent)]"
                >
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
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Results Step -->
  <div v-else-if="currentStep === 'results'" class="step-page-editorial">
    <div class="container-editorial py-12">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="step-header-editorial">
          <div
            class="w-16 h-16 mx-auto mb-6 flex items-center justify-center bg-green-100 text-green-600 rounded-full"
          >
            <svg
              class="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
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
            v-for="(participant, pIndex) in splitResults?.participants || []"
            :key="participant.name"
            class="card-editorial"
          >
            <div
              class="flex justify-between items-center mb-6 pb-4 border-b border-[var(--color-border)]"
            >
              <div class="flex items-center gap-3">
                <span
                  class="avatar-editorial avatar-editorial-lg"
                  :style="{ backgroundColor: participantColor(pIndex) }"
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
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            <span>Make Changes</span>
          </button>
          <button class="btn-editorial" @click="resetApp">
            <span>Split Another Bill</span>
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
