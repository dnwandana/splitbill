import { computed, inject, onMounted, ref, watch } from 'vue'
import type { ComputedRef, InjectionKey, Ref } from 'vue'
import { detectUserCurrency, formatCurrencyAmount } from '../utils/currency'
import { useAnalytics } from './useAnalytics'
import type { Receipt } from '../types/receipt'
import { computeSplit, allocateRoundedTotals } from '../utils/split'
import {
  reindexAfterParticipantRemoval,
  reindexAfterItemRemoval,
  assignItemToParticipant
} from '../utils/assignments'

// Types
interface ParticipantResult {
  name: string
  index: number
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

interface CurrencyOption {
  label: string
  value: string
}

type Step = 'landing' | 'upload' | 'participants' | 'review' | 'assign' | 'results'

type ParseProgress = 'idle' | 'uploading' | 'parsing' | 'complete' | 'error'

type ItemAssignments = Record<number, Record<number, number>>

interface ParticipantTotal {
  name: string
  total: number
  itemsTotal: number
  taxPortion: number
}

interface NamedParticipant {
  name: string
  index: number
}

export interface SplitBillContext {
  // State
  currentStep: Ref<Step>
  file: Ref<File | null>
  isParsingInBackground: Ref<boolean>
  parseProgress: Ref<ParseProgress>
  receipt: Ref<Receipt | null>
  participants: Ref<string[]>
  itemAssignments: Ref<ItemAssignments>
  splitResults: Ref<SplitResults | null>
  error: Ref<string | null>
  selectedParticipantIndex: Ref<number | null>
  userLocale: Ref<string>
  userCurrency: Ref<string>
  currencyItems: CurrencyOption[]
  isDragOver: Ref<boolean>
  fileInput: Ref<HTMLInputElement | null>
  // Helpers / computeds
  formatCurrency: (amount: number) => string
  participantColor: (index: number) => string
  participantTotals: ComputedRef<ParticipantTotal[]>
  namedParticipants: ComputedRef<NamedParticipant[]>
  receiptSubtotal: ComputedRef<number>
  // Actions
  goToStep: (step: Step) => void
  startParsing: () => void
  addParticipant: () => void
  removeParticipant: (index: number) => void
  assignItemToSelected: (itemIndex: number) => void
  increaseItemQuantity: (itemIndex: number, participantIndex: number) => void
  decreaseItemQuantity: (itemIndex: number, participantIndex: number) => void
  removeAssignment: (itemIndex: number, participantIndex: number) => void
  selectParticipant: (participantIndex: number) => void
  proceedToAssign: () => void
  proceedToAssignFromReview: () => void
  updateItemName: (index: number, name: string) => void
  updateItemQuantity: (index: number, quantity: number) => void
  updateItemPrice: (index: number, price: number) => void
  removeItem: (index: number) => void
  addNewItem: () => void
  updateTax: (tax: number) => void
  recalculateTotal: () => void
  calculateSplit: () => void
  formatFileSize: (bytes: number) => string
  validateFile: (selectedFile: File) => boolean
  triggerFileInput: () => void
  onFileSelect: (event: Event) => void
  onDragOver: (event: DragEvent) => void
  onDragLeave: (event: DragEvent) => void
  onDrop: (event: DragEvent) => void
  clearFile: () => void
  resetApp: () => void
}

export const SplitBillKey: InjectionKey<SplitBillContext> = Symbol('splitbill')

export function createSplitBillState(): SplitBillContext {
  // Analytics
  const analytics = useAnalytics()

  // Application state
  const currentStep = ref<Step>('landing')
  const file = ref<File | null>(null)
  const isParsingInBackground = ref(false)
  const parseProgress = ref<ParseProgress>('idle')
  const receipt = ref<Receipt | null>(null)
  const participants = ref<string[]>([''])
  const itemAssignments = ref<ItemAssignments>({})
  const splitResults = ref<SplitResults | null>(null)
  const error = ref<string | null>(null)
  const selectedParticipantIndex = ref<number | null>(null)

  // Currency/Locale detection (client-side)
  const userLocale = ref('en-US')
  const userCurrency = ref('USD')
  const formatCurrency = (amount: number) =>
    formatCurrencyAmount(amount, userLocale.value, userCurrency.value)

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

  // NOTE: scroll-reveal is owned by Landing.vue (the only component with
  // `.reveal` elements). Its observer lives in that component's onMounted so it
  // re-runs on every (re)mount — e.g. after "Start Over" returns to landing —
  // instead of once here, which left re-created elements stuck at opacity:0.
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
    return participantColors[index % participantColors.length]!
  }

  // Real-time totals for each participant
  const participantTotals = computed<ParticipantTotal[]>(() => {
    if (!receipt.value) return []
    const splits = computeSplit(
      receipt.value,
      participants.value.length,
      itemAssignments.value
    )
    return splits.map((split, pIndex) => ({
      name: (participants.value[pIndex] ?? '').trim(),
      total: split.total,
      itemsTotal: split.itemsTotal,
      taxPortion: split.taxPortion
    }))
  })

  // Non-blank participants paired with their ORIGINAL (full) index, so the assign
  // step's selection/colors/totals stay aligned with how itemAssignments and
  // computeSplit are keyed (by full participant index, not filtered position).
  const namedParticipants = computed<NamedParticipant[]>(() =>
    participants.value
      .map((name, index) => ({ name, index }))
      .filter((p) => p.name.trim())
  )

  // File upload state
  const isDragOver = ref(false)
  const fileInput = ref<HTMLInputElement | null>(null)

  // Navigate between steps
  const goToStep = (step: Step) => {
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
      receipt.value.items.forEach((_, index: number) => {
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
      itemAssignments.value = reindexAfterParticipantRemoval(
        itemAssignments.value,
        index
      )
      // Keep the active assign-step selection aligned with the shifted indices:
      // clear it if the selected participant was removed, shift it down if a
      // participant before it was removed.
      if (selectedParticipantIndex.value !== null) {
        if (selectedParticipantIndex.value === index) {
          selectedParticipantIndex.value = null
        } else if (selectedParticipantIndex.value > index) {
          selectedParticipantIndex.value -= 1
        }
      }
    }
  }

  // Assign item to currently selected participant
  const assignItemToSelected = (itemIndex: number) => {
    if (selectedParticipantIndex.value === null) return
    itemAssignments.value = assignItemToParticipant(
      itemAssignments.value,
      itemIndex,
      selectedParticipantIndex.value
    )
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
      itemAssignments.value = reindexAfterItemRemoval(itemAssignments.value, index)
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

    // Every item must be assigned to someone. Otherwise its cost — and the tax
    // proportional to it — silently drops out of the split, and the per-person
    // totals sum to less than the receipt with no warning.
    const hasUnassignedItem = receipt.value.items.some(
      (_, i) => Object.keys(itemAssignments.value[i] || {}).length === 0
    )
    if (hasUnassignedItem) {
      error.value = 'Please assign every item to at least one person'
      return
    }

    const subtotal = receipt.value.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    )

    const splits = computeSplit(
      receipt.value,
      participants.value.length,
      itemAssignments.value
    )

    const named = splits
      .map((split, pIndex) => ({
        name: (participants.value[pIndex] ?? '').trim(),
        index: pIndex,
        split
      }))
      .filter((r) => r.name)

    const allocatedTotals = allocateRoundedTotals(named.map((r) => r.split.total))

    const results = named.map((r, i) => ({
      name: r.name,
      index: r.index,
      total: allocatedTotals[i]!,
      itemsTotal: Math.round(r.split.itemsTotal * 100) / 100,
      taxPortion: Math.round(r.split.taxPortion * 100) / 100,
      items: r.split.items
    }))

    splitResults.value = {
      participants: results,
      originalTotal: receipt.value.total,
      splitTotal: results.reduce((sum, p) => sum + p.total, 0),
      subtotal,
      tax: receipt.value.tax || 0
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

  return {
    currentStep,
    file,
    isParsingInBackground,
    parseProgress,
    receipt,
    participants,
    itemAssignments,
    splitResults,
    error,
    selectedParticipantIndex,
    userLocale,
    userCurrency,
    currencyItems,
    isDragOver,
    fileInput,
    formatCurrency,
    participantColor,
    participantTotals,
    namedParticipants,
    receiptSubtotal,
    goToStep,
    startParsing,
    addParticipant,
    removeParticipant,
    assignItemToSelected,
    increaseItemQuantity,
    decreaseItemQuantity,
    removeAssignment,
    selectParticipant,
    proceedToAssign,
    proceedToAssignFromReview,
    updateItemName,
    updateItemQuantity,
    updateItemPrice,
    removeItem,
    addNewItem,
    updateTax,
    recalculateTotal,
    calculateSplit,
    formatFileSize,
    validateFile,
    triggerFileInput,
    onFileSelect,
    onDragOver,
    onDragLeave,
    onDrop,
    clearFile,
    resetApp
  }
}

export function useSplitBill(): SplitBillContext {
  const ctx = inject(SplitBillKey)
  if (!ctx) {
    throw new Error('useSplitBill() must be called within a component under index.vue')
  }
  return ctx
}
