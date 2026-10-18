/**
 * Product Telemetry & Analytics Privacy Guard
 * 
 * Supports PostHog and Google Analytics tracking while strictly scrubbing
 * student answers, answer keys, passwords, and sensitive assessment details.
 */

export interface TelemetryEvent {
  eventName: string;
  userId?: string;
  properties?: Record<string, any>;
}

export function trackTelemetryEvent(event: TelemetryEvent) {
  // Sanitize properties: strip prohibited sensitive fields
  const sanitizedProps: Record<string, any> = {};
  const prohibitedKeys = [
    'password', 'token', 'secret', 'answerPayload', 'selectedOptionId',
    'selectedOptionIds', 'numericAnswer', 'textAnswer', 'correctAnswerText',
    'options', 'answerKey', 'drawingSvg'
  ];

  if (event.properties) {
    for (const [key, value] of Object.entries(event.properties)) {
      if (!prohibitedKeys.includes(key)) {
        sanitizedProps[key] = value;
      }
    }
  }

  // Client-side analytics dispatch if browser environment
  if (typeof window !== 'undefined') {
    // PostHog
    if ((window as any).posthog) {
      (window as any).posthog.capture(event.eventName, sanitizedProps);
    }
    // Google Analytics (gtag)
    if ((window as any).gtag) {
      (window as any).gtag('event', event.eventName, sanitizedProps);
    }
  }
}
