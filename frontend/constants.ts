/**
 * Frontend Constants
 * Centralized configuration values for UI and behavior
 */

// Session Management
export const SESSION_CONFIG = {
  MAX_SESSION_AGE_MS: 2 * 60 * 60 * 1000, // 2 hours
  QUESTION_DELAY_MS: 1500, // Delay before showing next question
  FINISH_DELAY_MS: 3000, // Delay before showing analysis after finish
} as const;

// UI Constants
export const UI_CONFIG = {
  MAX_MESSAGE_LENGTH: 5000, // Maximum characters per message
  MIN_MESSAGE_LENGTH: 3, // Minimum characters for valid input
  SCROLL_BEHAVIOR: 'smooth' as const,
  ANIMATION_DURATION: 300, // ms
} as const;

// Network & Retry
export const NETWORK_CONFIG = {
  MAX_RETRIES: 2,
  RETRY_DELAY_MS: 1000,
  REQUEST_TIMEOUT_MS: 30000, // 30 seconds
} as const;

// Audio/Video
export const MEDIA_CONFIG = {
  AUDIO_SAMPLE_RATE: 24000,
  AUDIO_CHANNELS: 1,
  CAMERA_CONSTRAINTS: { video: true } as MediaStreamConstraints,
} as const;

// Scoring
export const SCORING_CONFIG = {
  DUPLICATE_WINDOW_MS: 1000, // Window to detect duplicate messages
} as const;
