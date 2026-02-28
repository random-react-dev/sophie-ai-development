/**
 * Jest setup: mock all native modules that Jest can't load.
 * This file runs after the test framework is installed but before tests.
 */

// ============================================
// react-native-audio-api
// ============================================
const mockGainNode = {
  gain: {
    value: 1.0,
    cancelScheduledValues: jest.fn(),
    linearRampToValueAtTime: jest.fn(),
    setValueAtTime: jest.fn(),
  },
  connect: jest.fn(),
  disconnect: jest.fn(),
};

const mockAudioBuffer = {
  getChannelData: jest.fn(() => new Float32Array(0)),
  duration: 0,
  length: 0,
  numberOfChannels: 1,
  sampleRate: 24000,
};

const mockBufferSource = {
  buffer: null as typeof mockAudioBuffer | null,
  connect: jest.fn(),
  disconnect: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  _onEnded: null as (() => void) | null,
  get onEnded() {
    return this._onEnded;
  },
  set onEnded(cb: (() => void) | null) {
    this._onEnded = cb;
  },
};

const mockQueueSource = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  pause: jest.fn(),
  clearBuffers: jest.fn(),
  enqueueBuffer: jest.fn(),
  onEnded: null as ((event: { bufferId: string | undefined; isLast: boolean | undefined }) => void) | null,
};

const mockAudioContext = {
  state: 'running' as string,
  _currentTime: 0,
  get currentTime() {
    return this._currentTime;
  },
  /** Advance mock currentTime (call in tests to simulate real-time progression) */
  _advanceTime(seconds: number) {
    this._currentTime += seconds;
  },
  sampleRate: 24000,
  destination: {},
  createGain: jest.fn(() => ({ ...mockGainNode })),
  createBuffer: jest.fn((_channels: number, length: number, sampleRate: number) => ({
    ...mockAudioBuffer,
    length,
    sampleRate,
    getChannelData: jest.fn(() => ({
      set: jest.fn(),
    })),
  })),
  createBufferSource: jest.fn(() => {
    let _onEnded: (() => void) | null = null;
    return {
      buffer: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      get onEnded() { return _onEnded; },
      set onEnded(cb: (() => void) | null) { _onEnded = cb; },
    };
  }),
  createBufferQueueSource: jest.fn(() => ({ ...mockQueueSource })),
  suspend: jest.fn(() => Promise.resolve(true)),
  resume: jest.fn(() => Promise.resolve(true)),
  close: jest.fn(),
};

jest.mock('react-native-audio-api', () => ({
  AudioContext: jest.fn(() => ({ ...mockAudioContext })),
  GainNode: jest.fn(),
  AudioBufferSourceNode: jest.fn(),
  AudioManager: {
    setAudioSessionOptions: jest.fn(),
    setAudioSessionActivity: jest.fn(() => Promise.resolve()),
  },
}));

// ============================================
// expo-stream-audio
// ============================================
jest.mock('expo-stream-audio', () => ({
  start: jest.fn(() => Promise.resolve()),
  stop: jest.fn(() => Promise.resolve()),
  addFrameListener: jest.fn(() => ({ remove: jest.fn() })),
  addErrorListener: jest.fn(() => ({ remove: jest.fn() })),
  requestPermission: jest.fn(() => Promise.resolve('granted')),
}));

// ============================================
// expo-audio
// ============================================
jest.mock('expo-audio', () => ({
  requestRecordingPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
}));

// ============================================
// expo-speech
// ============================================
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(() => Promise.resolve()),
  isSpeakingAsync: jest.fn(() => Promise.resolve(false)),
}));

// ============================================
// expo-haptics
// ============================================
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// ============================================
// expo-av
// ============================================
jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: jest.fn(() => Promise.resolve()),
  },
}));

// ============================================
// expo-file-system
// ============================================
jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation(() => ({
    bytes: jest.fn(() => Promise.resolve(new Uint8Array(0))),
  })),
}));

// ============================================
// @react-native-async-storage/async-storage
// ============================================
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
    multiGet: jest.fn(() => Promise.resolve([])),
    multiSet: jest.fn(() => Promise.resolve()),
  },
}));

// ============================================
// Logger - silence logs in tests
// ============================================
jest.mock('@/services/common/Logger', () => ({
  Logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    enableRemoteLogging: jest.fn(),
  },
}));

// ============================================
// base64-arraybuffer — use real implementation
// ============================================
// No mock needed - pure JS module that works in Jest

// ============================================
// Global test helpers
// ============================================

// Suppress console noise in tests
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  console.warn = (...args: unknown[]) => {
    // Filter out known noisy warnings
    const msg = String(args[0]);
    if (msg.includes('Please update the following components')) return;
    if (msg.includes('componentWillReceiveProps')) return;
    originalWarn.apply(console, args);
  };
  console.error = (...args: unknown[]) => {
    const msg = String(args[0]);
    if (msg.includes('act(...)')) return;
    originalError.apply(console, args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});
