/**
 * Simple analytics composable for tracking main user journey steps
 */
export const useAnalytics = () => {
  // Type definition for Umami global
  interface UmamiGlobal {
    track: (
      event: string,
      data?: Record<string, string | number | boolean>
    ) => void
  }

  const trackEvent = (
    eventName: string,
    properties: Record<string, string | number | boolean> = {}
  ) => {
    try {
      // Check if umami is available (client-side only)
      if (
        typeof window !== 'undefined' &&
        (window as unknown as Record<string, unknown>).umami
      ) {
        const umami = (window as unknown as Record<string, unknown>)
          .umami as UmamiGlobal
        umami.track(eventName, properties)
      }
    } catch (error) {
      console.warn('Analytics tracking failed:', error)
    }
  }

  // Simple step tracking
  const trackStep = (step: string) => {
    trackEvent('step_view', { step })
  }

  const trackStepComplete = (step: string) => {
    trackEvent('step_complete', { step })
  }

  const trackError = (step: string) => {
    trackEvent('step_error', { step })
  }

  // Currency tracking
  const trackCurrencyChange = (currency: string) => {
    trackEvent('currency_change', { currency })
  }

  return {
    trackStep,
    trackStepComplete,
    trackError,
    trackCurrencyChange
  }
}
