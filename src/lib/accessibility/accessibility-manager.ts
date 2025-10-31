/**
 * Accessibility Manager
 * Implements WCAG 2.1 AA compliance features
 */

export type ColorScheme = 'light' | 'dark' | 'high-contrast';
export type FontSize = 'normal' | 'large' | 'extra-large';
export type MotionPreference = 'normal' | 'reduced';

export interface AccessibilitySettings {
  colorScheme: ColorScheme;
  fontSize: FontSize;
  motionPreference: MotionPreference;
  screenReaderMode: boolean;
  keyboardNavigationMode: boolean;
  focusIndicators: boolean;
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  colorScheme: 'light',
  fontSize: 'normal',
  motionPreference: 'normal',
  screenReaderMode: false,
  keyboardNavigationMode: false,
  focusIndicators: true
};

export class AccessibilityManager {
  private static instance: AccessibilityManager;
  private settings: AccessibilitySettings;
  private listeners: Set<(settings: AccessibilitySettings) => void> = new Set();

  private constructor() {
    this.settings = this.loadSettings();
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  static getInstance(): AccessibilityManager {
    if (!AccessibilityManager.instance) {
      AccessibilityManager.instance = new AccessibilityManager();
    }
    return AccessibilityManager.instance;
  }

  private initialize() {
    // Apply saved settings
    this.applySettings(this.settings);

    // Detect system preferences
    this.detectSystemPreferences();

    // Listen for keyboard navigation
    this.setupKeyboardDetection();

    // Listen for screen reader
    this.detectScreenReader();
  }

  private detectSystemPreferences() {
    // Detect color scheme preference
    if (window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
      const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

      if (highContrastQuery.matches) {
        this.updateSetting('colorScheme', 'high-contrast');
      } else if (darkModeQuery.matches) {
        this.updateSetting('colorScheme', 'dark');
      }

      if (reducedMotionQuery.matches) {
        this.updateSetting('motionPreference', 'reduced');
      }

      // Listen for changes
      darkModeQuery.addEventListener('change', (e) => {
        if (e.matches && !highContrastQuery.matches) {
          this.updateSetting('colorScheme', 'dark');
        } else if (!highContrastQuery.matches) {
          this.updateSetting('colorScheme', 'light');
        }
      });

      highContrastQuery.addEventListener('change', (e) => {
        if (e.matches) {
          this.updateSetting('colorScheme', 'high-contrast');
        }
      });

      reducedMotionQuery.addEventListener('change', (e) => {
        this.updateSetting('motionPreference', e.matches ? 'reduced' : 'normal');
      });
    }
  }

  private setupKeyboardDetection() {
    let keyboardUsed = false;

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        keyboardUsed = true;
        this.updateSetting('keyboardNavigationMode', true);
      }
    });

    window.addEventListener('mousedown', () => {
      if (keyboardUsed) {
        keyboardUsed = false;
      }
    });
  }

  private detectScreenReader() {
    // Check for common screen reader indicators
    const hasAriaLive = document.querySelector('[aria-live]');
    const hasAriaAtomic = document.querySelector('[aria-atomic]');
    
    if (hasAriaLive || hasAriaAtomic) {
      this.updateSetting('screenReaderMode', true);
    }
  }

  private loadSettings(): AccessibilitySettings {
    if (typeof window === 'undefined') {
      return DEFAULT_SETTINGS;
    }

    try {
      const saved = localStorage.getItem('accessibility-settings');
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Failed to load accessibility settings:', error);
    }

    return DEFAULT_SETTINGS;
  }

  private saveSettings() {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('accessibility-settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save accessibility settings:', error);
    }
  }

  private applySettings(settings: AccessibilitySettings) {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // Apply color scheme
    root.setAttribute('data-color-scheme', settings.colorScheme);
    if (settings.colorScheme === 'high-contrast') {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Apply font size
    root.setAttribute('data-font-size', settings.fontSize);
    const fontSizeMap = {
      normal: '16px',
      large: '18px',
      'extra-large': '20px'
    };
    root.style.fontSize = fontSizeMap[settings.fontSize];

    // Apply motion preference
    root.setAttribute('data-motion', settings.motionPreference);
    if (settings.motionPreference === 'reduced') {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    // Apply focus indicators
    if (settings.focusIndicators) {
      root.classList.add('show-focus');
    } else {
      root.classList.remove('show-focus');
    }

    // Apply keyboard navigation mode
    if (settings.keyboardNavigationMode) {
      root.classList.add('keyboard-nav');
    } else {
      root.classList.remove('keyboard-nav');
    }
  }

  updateSetting<K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) {
    this.settings[key] = value;
    this.applySettings(this.settings);
    this.saveSettings();
    this.notifyListeners();
  }

  getSettings(): AccessibilitySettings {
    return { ...this.settings };
  }

  resetSettings() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.applySettings(this.settings);
    this.saveSettings();
    this.notifyListeners();
  }

  subscribe(listener: (settings: AccessibilitySettings) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.settings));
  }

  // Utility methods for ARIA announcements
  announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    if (typeof document === 'undefined') return;

    const announcer = document.getElementById('aria-announcer') || this.createAnnouncer();
    announcer.setAttribute('aria-live', priority);
    announcer.textContent = message;

    // Clear after announcement
    setTimeout(() => {
      announcer.textContent = '';
    }, 1000);
  }

  private createAnnouncer(): HTMLElement {
    const announcer = document.createElement('div');
    announcer.id = 'aria-announcer';
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    document.body.appendChild(announcer);
    return announcer;
  }

  // Skip to content functionality
  addSkipLink(targetId: string, label: string = 'Skip to main content') {
    if (typeof document === 'undefined') return;

    const skipLink = document.createElement('a');
    skipLink.href = `#${targetId}`;
    skipLink.textContent = label;
    skipLink.className = 'skip-link';
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 0;
      background: #000;
      color: #fff;
      padding: 8px;
      text-decoration: none;
      z-index: 100;
    `;

    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '0';
    });

    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px';
    });

    document.body.insertBefore(skipLink, document.body.firstChild);
  }
}

export const accessibilityManager = AccessibilityManager.getInstance();
