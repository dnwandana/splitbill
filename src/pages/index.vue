<script lang="ts" setup>
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
  total: number
}

interface ParticipantResult {
  name: string
  total: number
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
}

// Application state
const currentStep = ref<
  'landing' | 'upload' | 'participants' | 'assign' | 'results'
>('landing')
const file = ref<File | null>(null)
const isParsingInBackground = ref(false)
const parseProgress = ref<
  'idle' | 'uploading' | 'parsing' | 'complete' | 'error'
>('idle')
const receipt = ref<Receipt | null>(null)
const participants = ref<string[]>([''])
const itemAssignments = ref<Record<number, number[]>>({})
const splitResults = ref<SplitResults | null>(null)
const error = ref<string | null>(null)
const selectedParticipantIndex = ref<number | null>(null)

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
  return participants.value.map((name, pIndex) => {
    let total = 0
    receipt.value!.items.forEach((item: ReceiptItem, itemIndex: number) => {
      const assignments = itemAssignments.value[itemIndex] || []
      if (assignments.includes(pIndex)) {
        const itemCost = (item.price * item.quantity) / assignments.length
        total += itemCost
      }
    })
    return {
      name: name.trim(),
      total
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
      itemAssignments.value[index] = []
    })
    parseProgress.value = 'complete'
  } catch (err: unknown) {
    const errorObj = err as { data?: { message?: string } }
    parseProgress.value = 'error'
    error.value = errorObj.data?.message || 'Failed to parse receipt'
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
    // Remove this participant from all assignments
    Object.keys(itemAssignments.value).forEach((itemIndexStr) => {
      const itemIndex = parseInt(itemIndexStr)
      if (itemAssignments.value[itemIndex]) {
        itemAssignments.value[itemIndex] = itemAssignments.value[itemIndex]
          .filter((pIndex) => pIndex !== index)
          .map((pIndex) => (pIndex > index ? pIndex - 1 : pIndex))
      }
    })
  }
}

// Assign item to currently selected participant
const assignItemToSelected = (itemIndex: number) => {
  if (selectedParticipantIndex.value === null) return

  if (!itemAssignments.value[itemIndex]) {
    itemAssignments.value[itemIndex] = []
  }

  const assignments = itemAssignments.value[itemIndex]
  const participantIndex = selectedParticipantIndex.value
  const index = assignments.indexOf(participantIndex)

  // Toggle assignment
  if (index === -1) {
    assignments.push(participantIndex)
  } else {
    assignments.splice(index, 1)
  }
}

// Select participant for assignment
const selectParticipant = (participantIndex: number) => {
  selectedParticipantIndex.value = participantIndex
}

// Navigate to assign step (with validation)
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
  selectedParticipantIndex.value = null // Reset selection when entering assign step
  goToStep('assign')
}

// Calculate split
const calculateSplit = () => {
  if (!receipt.value) return

  const validParticipants = participants.value.filter((p) => p.trim())
  if (validParticipants.length === 0) {
    error.value = 'Please add at least one participant'
    return
  }

  const results = validParticipants.map((name, pIndex) => {
    let total = 0
    const items: { name: string; cost: number; sharedWith: number }[] = []

    receipt.value!.items.forEach((item: ReceiptItem, itemIndex: number) => {
      const assignments = itemAssignments.value[itemIndex] || []
      if (assignments.includes(pIndex)) {
        const itemCost = (item.price * item.quantity) / assignments.length
        total += itemCost
        items.push({
          name: item.name,
          cost: itemCost,
          sharedWith: assignments.length
        })
      }
    })

    return {
      name: name.trim(),
      total: Math.round(total * 100) / 100,
      items
    }
  })

  splitResults.value = {
    participants: results,
    originalTotal: receipt.value!.total,
    splitTotal: results.reduce((sum, p) => sum + p.total, 0)
  }

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
  <!-- Landing Page -->
  <div v-if="currentStep === 'landing'" class="bg-gray-900 text-white">
    <!-- Header -->
    <header class="py-4">
      <UContainer>
        <div class="flex justify-between items-center">
          <div class="flex items-center space-x-2">
            <Icon
              name="i-heroicons-receipt-percent"
              class="w-8 h-8 text-blue-400"
            />
            <span class="text-2xl font-bold">SplitBill</span>
          </div>
          <UButton
            color="primary"
            variant="solid"
            class="cursor-pointer"
            @click="goToStep('upload')"
          >
            Split Your Bill
          </UButton>
        </div>
      </UContainer>
    </header>

    <!-- Hero Section -->
    <main>
      <UContainer class="py-20 sm:py-32 text-center">
        <h1 class="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6">
          The <span class="text-blue-400">Easiest Way</span> to Split a Bill
        </h1>
        <p class="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10">
          From receipt chaos to perfect splits in one snap. Our AI does the
          thinking so you don't have to.
        </p>
        <UButton
          size="xl"
          color="primary"
          class="px-8 py-3 text-lg font-semibold cursor-pointer"
          @click="goToStep('upload')"
        >
          <Icon name="i-heroicons-camera" class="w-6 h-6 mr-2" />
          Scan Your Receipt
        </UButton>
      </UContainer>
    </main>

    <!-- How It Works Section -->
    <section class="py-20 sm:py-24 bg-gray-800/50">
      <UContainer>
        <div class="text-center mb-16">
          <h2 class="text-3xl sm:text-4xl font-bold mb-4">How It Works</h2>
          <p class="text-gray-400 max-w-xl mx-auto">
            Three steps. Perfect split. Every time.
          </p>
        </div>
        <div class="grid md:grid-cols-3 gap-8 text-center">
          <!-- Step 1 -->
          <div class="flex flex-col items-center">
            <div
              class="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-sm flex items-center justify-center text-2xl font-bold mb-6"
            >
              1
            </div>
            <h3 class="text-xl font-semibold mb-2">Capture the Bill</h3>
            <p class="text-gray-400">
              Snap or upload your receipt, let our AI work its magic.
            </p>
          </div>
          <!-- Step 2 -->
          <div class="flex flex-col items-center">
            <div
              class="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-sm flex items-center justify-center text-2xl font-bold mb-6"
            >
              2
            </div>
            <h3 class="text-xl font-semibold mb-2">Point & Assign</h3>
            <p class="text-gray-400">
              Simply tap to assign each item to the right person.
            </p>
          </div>
          <!-- Step 3 -->
          <div class="flex flex-col items-center">
            <div
              class="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-sm flex items-center justify-center text-2xl font-bold mb-6"
            >
              3
            </div>
            <h3 class="text-xl font-semibold mb-2">Perfect Split</h3>
            <p class="text-gray-400">Get your flawless breakdown in seconds.</p>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- Features Section -->
    <section class="py-20 sm:py-24">
      <UContainer>
        <div class="text-center mb-16">
          <h2 class="text-3xl sm:text-4xl font-bold mb-4">
            Everything You Need for Seamless Splits
          </h2>
          <p class="text-gray-400 max-w-2xl mx-auto">
            From receipt chaos to perfect splits: we've thought of everything so
            you don't have to.
          </p>
        </div>
        <div class="grid md:grid-cols-3 gap-8">
          <UCard class="bg-gray-800/50">
            <template #header>
              <div class="flex items-center space-x-3">
                <div class="p-2 bg-blue-500/20 rounded-lg">
                  <Icon
                    name="i-heroicons-sparkles"
                    class="w-6 h-6 text-blue-400"
                  />
                </div>
                <h3 class="text-lg font-semibold text-white">Smart OCR</h3>
              </div>
            </template>
            <p class="text-gray-400">
              Receipt photo goes in, perfect data comes out. No typing, no
              crying!
            </p>
          </UCard>
          <UCard class="bg-gray-800/50">
            <template #header>
              <div class="flex items-center space-x-3">
                <div class="p-2 bg-green-500/20 rounded-lg">
                  <Icon
                    name="i-heroicons-users"
                    class="w-6 h-6 text-green-400"
                  />
                </div>
                <h3 class="text-lg font-semibold text-white">
                  Flexible Sharing
                </h3>
              </div>
            </template>
            <p class="text-gray-400">
              Solo items or group shares? You decide, we calculate. Easy peasy!
            </p>
          </UCard>
          <UCard class="bg-gray-800/50">
            <template #header>
              <div class="flex items-center space-x-3">
                <div class="p-2 bg-purple-500/20 rounded-lg">
                  <Icon
                    name="i-heroicons-calculator"
                    class="w-6 h-6 text-purple-400"
                  />
                </div>
                <h3 class="text-lg font-semibold text-white">
                  Instant Calculations
                </h3>
              </div>
            </template>
            <p class="text-gray-400">
              Who owes what? See it now, settle it fast.
            </p>
          </UCard>
        </div>
      </UContainer>
    </section>

    <!-- CTA Section -->
    <section class="py-20">
      <UContainer class="text-center">
        <h2 class="text-3xl sm:text-4xl font-bold mb-4">
          Ready to Simplify Your Bills?
        </h2>
        <p class="text-lg text-gray-400 mb-8">
          Give it a try. Free, fast, and surprisingly addictive.
        </p>
        <UButton
          size="xl"
          color="primary"
          class="px-8 py-3 text-lg font-semibold cursor-pointer"
          @click="goToStep('upload')"
        >
          <Icon name="i-heroicons-receipt-percent" class="w-6 h-6 mr-2" />
          Split Your Bill
        </UButton>
      </UContainer>
    </section>

    <!-- Footer -->
    <footer class="py-8 border-t border-gray-800">
      <UContainer class="text-center text-gray-500">
        Hosted on
        <a href="https://vercel.com" target="_blank" class="text-blue-400"
          >Vercel</a
        >
        • AI inference by
        <a href="https://openrouter.ai" target="_blank" class="text-blue-400"
          >OpenRouter</a
        >.
      </UContainer>
    </footer>
  </div>

  <!-- Upload Receipt Step -->
  <div
    v-else-if="currentStep === 'upload'"
    class="min-h-screen bg-[#020420] flex flex-col items-center justify-center p-4"
  >
    <div class="w-full max-w-2xl">
      <!-- Header -->
      <div class="text-center mb-8">
        <UButton
          variant="link"
          class="mb-4 text-green-400 hover:text-green-300 cursor-pointer"
          @click="goToStep('landing')"
        >
          ← Back to Home
        </UButton>
        <h1 class="text-4xl font-bold text-white mb-2">Receipt Ready?</h1>
        <p class="text-gray-400">
          Sharp photo in, fair split out. Simple as that.
        </p>
      </div>

      <!-- File Upload -->
      <div class="mb-6">
        <div
          class="relative border-2 border-dashed border-gray-600 rounded-lg p-8 text-center bg-[#090b29] hover:border-gray-500 transition-colors cursor-pointer"
          :class="{ 'border-green-400 bg-green-900/10': isDragOver }"
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

          <div class="flex flex-col items-center justify-center text-white">
            <Icon
              name="i-heroicons-camera"
              class="w-16 h-16 text-gray-500 mb-4"
            />
            <div v-if="file">
              <p class="text-lg font-medium mb-2">
                {{ file.name }}
              </p>
              <p class="text-sm text-gray-400 mb-4">
                {{ formatFileSize(file.size) }}
              </p>
              <UButton
                color="error"
                variant="outline"
                size="sm"
                class="cursor-pointer"
                @click.stop="clearFile"
              >
                Remove File
              </UButton>
            </div>
            <div v-else>
              <p class="text-lg font-medium mb-2">
                Upload your receipt and let the magic happen
              </p>
              <p class="text-sm text-gray-500">
                Supports JPEG, PNG, and WebP files up to 10MB
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Error Display -->
      <UAlert
        v-if="error"
        color="error"
        variant="soft"
        :title="error"
        class="mb-6"
      />

      <!-- Action Buttons -->
      <div class="flex justify-center">
        <UButton
          :disabled="!file"
          size="lg"
          color="primary"
          class="px-8 py-3 text-lg cursor-pointer"
          @click="startParsing"
        >
          Add Participants
        </UButton>
      </div>
    </div>
  </div>

  <!-- Participants Step -->
  <div
    v-else-if="currentStep === 'participants'"
    class="min-h-screen bg-[#020420] text-white"
  >
    <UContainer class="py-8">
      <div class="max-w-2xl mx-auto">
        <!-- Header -->
        <div class="text-center mb-8">
          <UButton
            variant="link"
            class="mb-4 text-green-400 hover:text-green-300 cursor-pointer"
            @click="goToStep('upload')"
          >
            ← Back to Upload
          </UButton>
          <h1 class="text-4xl font-bold text-white mb-2">
            Who's In The Squad?
          </h1>
          <p class="text-gray-400">
            Add your friends while we parse your receipt in the background.
          </p>
        </div>

        <!-- Parsing Progress -->
        <UCard
          v-if="isParsingInBackground || parseProgress !== 'idle'"
          class="mb-8 bg-[#090b29] text-white"
        >
          <template #header>
            <div class="flex items-center space-x-2">
              <Icon
                name="i-heroicons-document-text"
                class="w-5 h-5"
                :class="{
                  'text-blue-400':
                    parseProgress === 'uploading' ||
                    parseProgress === 'parsing',
                  'text-green-400': parseProgress === 'complete',
                  'text-red-400': parseProgress === 'error'
                }"
              />
              <span class="font-medium">Receipt Processing</span>
            </div>
          </template>

          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm">
                {{
                  parseProgress === 'uploading'
                    ? 'Uploading receipt...'
                    : parseProgress === 'parsing'
                    ? 'Analyzing receipt...'
                    : parseProgress === 'complete'
                    ? 'Receipt parsed!'
                    : parseProgress === 'error'
                    ? 'Failed to parse receipt'
                    : 'Ready to parse'
                }}
              </span>
              <Icon
                v-if="parseProgress === 'parsing'"
                name="i-heroicons-arrow-path"
                class="w-5 h-5 text-blue-400 animate-spin"
              />
              <Icon
                v-if="parseProgress === 'complete'"
                name="i-heroicons-check-circle"
                class="w-5 h-5 text-green-400"
              />
              <Icon
                v-else-if="parseProgress === 'error'"
                name="i-heroicons-x-circle"
                class="w-5 h-5 text-red-400"
              />
            </div>

            <!-- Progress bar -->
            <div class="w-full bg-gray-700 rounded-full h-2">
              <div
                class="h-2 rounded-full transition-all duration-300"
                :class="{
                  'bg-blue-400':
                    parseProgress === 'uploading' ||
                    parseProgress === 'parsing',
                  'bg-green-400': parseProgress === 'complete',
                  'bg-red-400': parseProgress === 'error'
                }"
                :style="{
                  width:
                    parseProgress === 'uploading'
                      ? '30%'
                      : parseProgress === 'parsing'
                      ? '70%'
                      : parseProgress === 'complete'
                      ? '100%'
                      : parseProgress === 'error'
                      ? '100%'
                      : '0%'
                }"
              />
            </div>
          </div>
        </UCard>

        <!-- Participants -->
        <UCard class="bg-[#090b29] text-white">
          <template #header>
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-semibold">The Squad</h3>
              <UButton
                size="sm"
                color="primary"
                class="cursor-pointer"
                @click="addParticipant"
              >
                <Icon name="i-heroicons-plus" class="w-4 h-4 mr-1" />
                Add Friend
              </UButton>
            </div>
          </template>

          <div class="space-y-4">
            <div
              v-for="(participant, index) in participants"
              :key="index"
              class="flex items-center space-x-3"
            >
              <span
                class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold"
                :style="{ backgroundColor: participantColor(index) }"
              >
                {{ (participant?.trim() || `P${index + 1}`)[0]?.toUpperCase() }}
              </span>
              <UInput
                v-model="participants[index]"
                :placeholder="`Person ${index + 1}`"
                class="flex-1"
                :ui="{ base: 'bg-gray-800 text-white' }"
              />
              <UButton
                v-if="participants.length > 1"
                color="neutral"
                variant="ghost"
                icon="i-heroicons-x-mark-20-solid"
                class="cursor-pointer hover:text-red-400"
                @click="removeParticipant(index)"
              />
            </div>
          </div>
        </UCard>

        <!-- Error Display -->
        <UAlert
          v-if="error"
          color="error"
          variant="soft"
          :title="error"
          class="mt-6"
        />

        <!-- Action Buttons -->
        <div class="flex justify-center">
          <UButton
            size="lg"
            color="primary"
            class="mt-6 px-8 py-3 text-lg cursor-pointer"
            :disabled="
              parseProgress === 'error' ||
              parseProgress === 'uploading' ||
              parseProgress === 'parsing'
            "
            @click="proceedToAssign"
          >
            Continue
          </UButton>
        </div>
      </div>
    </UContainer>
  </div>

  <!-- Assign Items Step -->
  <div
    v-else-if="currentStep === 'assign'"
    class="min-h-screen bg-[#020420] text-white"
  >
    <UContainer class="py-8">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="text-center mb-8">
          <UButton
            variant="link"
            class="mb-4 text-green-400 hover:text-green-300 cursor-pointer"
            @click="goToStep('participants')"
          >
            ← Back to Participants
          </UButton>
          <h1 class="text-4xl font-bold text-white mb-2">Who Gets What?</h1>
          <p class="text-gray-400">
            Assign items to your squad and we'll handle the math.
          </p>
        </div>

        <div class="space-y-8">
          <!-- Squad Selection -->
          <UCard class="bg-[#090b29] text-white">
            <template #header>
              <h3 class="text-lg font-semibold">Select Squad Member</h3>
              <p class="text-sm text-gray-400 mt-1">
                Click a member, then click items to assign them
              </p>
            </template>

            <div class="grid gap-3">
              <div
                v-for="(participant, index) in participants.filter((p) =>
                  p.trim()
                )"
                :key="index"
                class="cursor-pointer transition-all duration-200 border-2 rounded-lg p-3 hover:border-blue-400"
                :class="[
                  selectedParticipantIndex === index
                    ? 'border-blue-400 bg-blue-500/20'
                    : 'border-gray-600 bg-gray-800/50'
                ]"
                @click="selectParticipant(index)"
              >
                <div class="flex flex-col items-center space-y-2">
                  <span
                    class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    :style="{ backgroundColor: participantColor(index) }"
                  >
                    {{ participant?.trim()?.[0]?.toUpperCase() || 'P' }}
                  </span>
                  <span class="text-sm font-medium text-center">{{
                    participant.trim()
                  }}</span>
                  <span class="text-xs font-semibold text-blue-400">
                    ${{ (participantTotals[index]?.total || 0).toFixed(2) }}
                  </span>
                </div>
              </div>
            </div>

            <div
              v-if="selectedParticipantIndex === null"
              class="mt-4 text-center"
            >
              <p class="text-sm text-gray-400">
                👆 Select a squad member to start assigning items
              </p>
            </div>
            <div v-else class="mt-4 text-center">
              <p class="text-sm text-green-400">
                ✨ {{ participants[selectedParticipantIndex]?.trim() }} is
                selected. Click items below to assign them!
              </p>
            </div>
          </UCard>

          <!-- Receipt Items -->
          <UCard class="bg-[#090b29] text-white">
            <template #header>
              <h3 class="text-lg font-semibold">The Goods</h3>
            </template>

            <div class="space-y-4">
              <div
                v-for="(item, itemIndex) in receipt?.items || []"
                :key="itemIndex"
                class="border-2 rounded-lg p-3 sm:p-4 transition-all duration-200 cursor-pointer hover:border-blue-400"
                :class="[
                  selectedParticipantIndex !== null
                    ? 'border-gray-600 hover:bg-blue-500/10'
                    : 'border-gray-700 cursor-not-allowed opacity-60'
                ]"
                @click="
                  selectedParticipantIndex !== null
                    ? assignItemToSelected(itemIndex)
                    : null
                "
              >
                <div
                  class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  <div class="flex-1">
                    <h4 class="font-medium">{{ item.name }}</h4>
                    <p class="text-sm text-gray-400">
                      Qty: {{ item.quantity }} &times; ${{
                        item.price.toFixed(2)
                      }}
                    </p>
                    <div class="font-semibold text-lg mt-1">
                      ${{ (item.quantity * item.price).toFixed(2) }}
                    </div>
                  </div>

                  <div class="flex items-center gap-3">
                    <!-- Assigned participants avatars -->
                    <div class="flex -space-x-2 flex-shrink-0 min-w-0">
                      <template
                        v-for="(p, pIndex) in participants"
                        :key="pIndex"
                      >
                        <span
                          v-if="
                            (itemAssignments[itemIndex] || []).includes(
                              pIndex
                            ) && p.trim()
                          "
                          class="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold border-2 border-[#090b29] text-xs"
                          :style="{ backgroundColor: participantColor(pIndex) }"
                          :title="p.trim()"
                        >
                          {{ p?.trim()?.[0]?.toUpperCase() || 'P' }}
                        </span>
                      </template>
                      <span
                        v-if="!(itemAssignments[itemIndex] || []).length"
                        class="w-8 h-8 rounded-full border-2 border-dashed border-gray-500 flex items-center justify-center text-gray-500 text-xs"
                        title="Not assigned"
                      >
                        ?
                      </span>
                    </div>

                    <!-- Assignment status indicator -->
                    <div class="text-right">
                      <div
                        v-if="selectedParticipantIndex !== null"
                        class="text-xs text-gray-400"
                      >
                        {{
                          (itemAssignments[itemIndex] || []).includes(
                            selectedParticipantIndex
                          )
                            ? 'Click to unassign'
                            : 'Click to assign'
                        }}
                      </div>
                      <div v-else class="text-xs text-gray-500">
                        Select a member first
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Total and Actions -->
        <div class="mt-8 text-center">
          <div class="mb-6">
            <p class="text-lg text-gray-300">
              Total:
              <span class="font-bold text-2xl text-white"
                >${{ receipt?.total?.toFixed(2) }}</span
              >
            </p>
          </div>

          <UAlert
            v-if="error"
            color="error"
            variant="soft"
            :title="error"
            class="mb-6"
          />

          <UButton
            size="lg"
            color="primary"
            class="px-8 py-3 text-lg cursor-pointer"
            @click="calculateSplit"
          >
            Split It Up!
          </UButton>
        </div>
      </div>
    </UContainer>
  </div>

  <!-- Results Step -->
  <div
    v-else-if="currentStep === 'results'"
    class="min-h-screen bg-[#020420] text-white"
  >
    <UContainer class="py-8">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-4xl font-bold text-white mb-2">Bill Settled!</h1>
          <p class="text-gray-400">The moment of truth: who pays what</p>
        </div>

        <!-- Summary -->
        <UCard class="mb-8 bg-[#090b29] text-white">
          <div class="text-center">
            <div class="grid md:grid-cols-3 gap-4">
              <div>
                <p class="text-sm text-gray-400">Original Total</p>
                <p class="text-2xl font-bold">
                  ${{ splitResults?.originalTotal?.toFixed(2) }}
                </p>
              </div>
              <div>
                <p class="text-sm text-gray-400">Split Total</p>
                <p class="text-2xl font-bold">
                  ${{ splitResults?.splitTotal?.toFixed(2) }}
                </p>
              </div>
              <div>
                <p class="text-sm text-gray-400">Difference</p>
                <p
                  class="text-2xl font-bold"
                  :class="
                    Math.abs(
                      (splitResults?.originalTotal || 0) -
                        (splitResults?.splitTotal || 0)
                    ) < 0.01
                      ? 'text-green-400'
                      : 'text-red-400'
                  "
                >
                  ${{
                    Math.abs(
                      (splitResults?.originalTotal || 0) -
                        (splitResults?.splitTotal || 0)
                    ).toFixed(2)
                  }}
                </p>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Individual Results -->
        <div class="grid gap-6 mb-8">
          <UCard
            v-for="participant in splitResults?.participants || []"
            :key="participant.name"
            class="bg-[#090b29] text-white"
          >
            <template #header>
              <div class="flex justify-between items-center">
                <h3 class="text-lg font-semibold">{{ participant.name }}</h3>
                <span class="text-2xl font-bold text-blue-400">
                  ${{ participant.total.toFixed(2) }}
                </span>
              </div>
            </template>

            <div class="space-y-2">
              <div
                v-for="item in participant.items"
                :key="item.name"
                class="flex justify-between items-center py-1 border-b border-gray-800"
              >
                <span class="text-sm">
                  {{ item.name }}
                  <span v-if="item.sharedWith > 1" class="text-gray-500">
                    (shared with {{ item.sharedWith - 1 }} other{{
                      item.sharedWith > 2 ? 's' : ''
                    }})
                  </span>
                </span>
                <span class="text-sm font-medium"
                  >${{ item.cost.toFixed(2) }}</span
                >
              </div>
            </div>
          </UCard>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-center space-x-4">
          <UButton
            variant="outline"
            color="primary"
            size="lg"
            class="cursor-pointer"
            @click="goToStep('assign')"
          >
            Make Changes
          </UButton>
          <UButton
            size="lg"
            color="primary"
            class="cursor-pointer"
            @click="resetApp"
          >
            Split Another
          </UButton>
        </div>
      </div>
    </UContainer>
  </div>
</template>
