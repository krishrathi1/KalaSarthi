// Type declarations for Speech Recognition API with webkit prefixes

declare global {
  interface Window {
    webkitSpeechRecognition: typeof SpeechRecognition;
    webkitAudioContext: typeof AudioContext;
  }
}

// Extend SpeechRecognition interface for additional properties
declare type ExtendedSpeechRecognition = SpeechRecognition & {
  maxAlternatives?: number;
};

export {ExtendedSpeechRecognition};
