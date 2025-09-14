#!/usr/bin/env node
/**
 * Multilingual Text-to-Speech TypeScript Implementation
 * Supports multiple languages with automatic voice selection
 */

import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Types and Interfaces
interface Voice {
  name: string;
  gender: string;
  sampleRate: number;
}

interface LanguageVoices {
  [languageCode: string]: Voice[];
}

interface TTSOptions {
  languageCode: string;
  voiceName?: string;
  outputFile?: string;
  speakingRate?: number;
  pitch?: number;
  volumeGainDb?: number;
}

interface DemoLanguage {
  language: string;
  text: string;
  description: string;
}

class MultilingualTTS {
  private client: TextToSpeechClient;

  constructor() {
    try {
      this.client = new TextToSpeechClient();
      console.log('✅ TTS client initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing TTS client:', error);
      process.exit(1);
    }
  }

  /**
   * Get all available languages and their voices
   */
  async getAvailableLanguages(): Promise<LanguageVoices> {
    console.log('🔍 Discovering available languages...');
    
    try {
      const [voices] = await this.client.listVoices({});
      
      // Group voices by language
      const languages: LanguageVoices = {};
      
      voices.voices?.forEach(voice => {
        voice.languageCodes?.forEach(langCode => {
          if (!languages[langCode]) {
            languages[langCode] = [];
          }
          
          languages[langCode].push({
            name: voice.name || '',
            gender: String(voice.ssmlGender) || 'NEUTRAL',
            sampleRate: voice.naturalSampleRateHertz || 0
          });
        });
      });
      
      return languages;
    } catch (error) {
      console.error('❌ Error getting available languages:', error);
      return {};
    }
  }

  /**
   * Get information about a specific language
   */
  async getLanguageInfo(languageCode: string): Promise<Voice[] | null> {
    const languages = await this.getAvailableLanguages();
    
    if (languages[languageCode]) {
      const voices = languages[languageCode];
      console.log(`\n🌍 Language: ${languageCode}`);
      console.log(`📊 Available voices: ${voices.length}`);
      
      // Show voice options
      voices.slice(0, 5).forEach((voice, index) => {
        console.log(`  ${index + 1}. ${voice.name} (${voice.gender}) - ${voice.sampleRate} Hz`);
      });
      
      if (voices.length > 5) {
        console.log(`  ... and ${voices.length - 5} more voices`);
      }
      
      return voices;
    } else {
      console.log(`❌ Language '${languageCode}' not found`);
      return null;
    }
  }

  /**
   * Convert text to speech in specified language
   */
  async textToSpeech(text: string, options: TTSOptions): Promise<string | null> {
    try {
      console.log('\n🎤 Converting text to speech...');
      console.log(`Text: ${text}`);
      console.log(`Language: ${options.languageCode}`);
      
      // Get available voices for the language
      const languages = await this.getAvailableLanguages();
      const voices = languages[options.languageCode] || [];
      
      if (voices.length === 0) {
        console.log(`❌ No voices available for language: ${options.languageCode}`);
        return null;
      }
      
      // Select voice
      let voiceName = options.voiceName;
      if (!voiceName) {
        voiceName = voices[0].name;
        console.log(`Using default voice: ${voiceName}`);
      } else {
        console.log(`Using specified voice: ${voiceName}`);
      }
      
      // Set the text input
      const synthesisInput = {
        text: text
      };
      
      // Build the voice request
      const voice = {
        languageCode: options.languageCode,
        name: voiceName,
        ssmlGender: 'NEUTRAL' as const
      };
      
      // Select the type of audio file to return
      const audioConfig = {
        audioEncoding: 'MP3' as const,
        speakingRate: options.speakingRate || 1.0,
        pitch: options.pitch || 0.0,
        volumeGainDb: options.volumeGainDb || 0.0
      };
      
      // Perform the text-to-speech request
      const [response] = await this.client.synthesizeSpeech({
        input: synthesisInput,
        voice: voice,
        audioConfig: audioConfig
      });
      
      // Generate output filename if not provided
      let outputFile = options.outputFile;
      if (!outputFile) {
        const safeLang = options.languageCode.replace('-', '_').toLowerCase();
        outputFile = `output_${safeLang}.mp3`;
      }
      
      // Write the response to the output file
      if (response.audioContent) {
        fs.writeFileSync(outputFile, response.audioContent);
        
        console.log(`✅ Audio saved to: ${outputFile}`);
        console.log(`📊 Audio size: ${response.audioContent.length} bytes`);
        
        return outputFile;
      } else {
        console.log('❌ No audio content received');
        return null;
      }
      
    } catch (error) {
      console.error('❌ Error in text-to-speech conversion:', error);
      return null;
    }
  }

  /**
   * Play the generated audio file
   */
  playAudio(filePath: string): void {
    try {
      console.log(`\n🔊 Playing audio: ${filePath}`);
      
      const system = os.platform();
      if (system === 'win32') {
        // Windows
        require('child_process').exec(`start ${filePath}`);
      } else if (system === 'darwin') {
        // macOS
        require('child_process').exec(`open ${filePath}`);
      } else if (system === 'linux') {
        // Linux
        require('child_process').exec(`xdg-open ${filePath}`);
      } else {
        console.log(`⚠️  Auto-play not supported on ${system}`);
        console.log(`Please manually open: ${filePath}`);
      }
      
    } catch (error) {
      console.error('❌ Error playing audio:', error);
      console.log(`Please manually open: ${filePath}`);
    }
  }

  /**
   * Interactive mode for language and text selection
   */
  async interactiveMode(): Promise<void> {
    console.log('\n🌍 Multilingual Text-to-Speech Interactive Mode');
    console.log('='.repeat(60));
    
    // Get available languages
    const languages = await this.getAvailableLanguages();
    
    if (Object.keys(languages).length === 0) {
      console.log('❌ No languages available');
      return;
    }
    
    // Show popular languages
    const popularLanguages: { [key: string]: string } = {
      'en-US': 'English (US)',
      'es-ES': 'Spanish (Spain)',
      'fr-FR': 'French (France)',
      'de-DE': 'German (Germany)',
      'it-IT': 'Italian (Italy)',
      'pt-BR': 'Portuguese (Brazil)',
      'ja-JP': 'Japanese (Japan)',
      'ko-KR': 'Korean (South Korea)',
      'zh-CN': 'Chinese (Simplified)',
      'hi-IN': 'Hindi (India)',
      'bn-IN': 'Bengali (India)',
      'ta-IN': 'Tamil (India)',
      'te-IN': 'Telugu (India)',
      'ar-SA': 'Arabic (Saudi Arabia)',
      'ru-RU': 'Russian (Russia)'
    };
    
    console.log('\n📋 Popular Languages:');
    const availablePopular: string[] = [];
    
    for (const [code, name] of Object.entries(popularLanguages)) {
      if (languages[code]) {
        const index = availablePopular.length + 1;
        console.log(`  ${index.toString().padStart(2)}. ${name} (${code})`);
        availablePopular.push(code);
      }
    }
    
    console.log(`\n  ${(availablePopular.length + 1).toString().padStart(2)}. Show all ${Object.keys(languages).length} available languages`);
    console.log(`  ${(availablePopular.length + 2).toString().padStart(2)}. Enter custom language code`);
    
    // Note: In a real implementation, you'd use a proper input library
    // For now, this is a placeholder for the interactive logic
    console.log('\n💡 Interactive mode requires proper input handling');
    console.log('Use command line mode instead:');
    console.log('npm run tts <language_code> "<text>"');
  }

  /**
   * Get Indian languages specifically
   */
  async getIndianLanguages(): Promise<{ [key: string]: number }> {
    const languages = await this.getAvailableLanguages();
    const indianLanguages: { [key: string]: number } = {};
    
    for (const [code, voices] of Object.entries(languages)) {
      if (code.endsWith('-IN')) {
        indianLanguages[code] = voices.length;
      }
    }
    
    return indianLanguages;
  }

  /**
   * Demo function showing different languages
   */
  async runDemo(): Promise<void> {
    console.log('🌍 Multilingual TTS Demo');
    console.log('='.repeat(40));
    
    const demos: DemoLanguage[] = [
      {
        language: 'en-US',
        text: 'Hello! Welcome to the multilingual text-to-speech demo.',
        description: 'English (US)'
      },
      {
        language: 'hi-IN',
        text: 'नमस्ते! बहुभाषी पाठ-से-भाषण डेमो में आपका स्वागत है।',
        description: 'Hindi (India)'
      },
      {
        language: 'bn-IN',
        text: 'নমস্কার! বহুভাষী পাঠ-থেকে-বক্তৃতা ডেমোতে স্বাগতম।',
        description: 'Bengali (India)'
      },
      {
        language: 'ta-IN',
        text: 'வணக்கம்! பல மொழி உரை-முதல்-பேச்சு டெமோவிற்கு வரவேற்கிறோம்.',
        description: 'Tamil (India)'
      },
      {
        language: 'es-ES',
        text: '¡Hola! Bienvenido a la demostración de texto a voz multilingüe.',
        description: 'Spanish (Spain)'
      }
    ];
    
    console.log(`🎤 Generating audio for ${demos.length} languages...`);
    
    const generatedFiles: string[] = [];
    
    for (let i = 0; i < demos.length; i++) {
      const demo = demos[i];
      console.log(`\n${(i + 1).toString().padStart(2)}. ${demo.description} (${demo.language})`);
      console.log(`    Text: ${demo.text}`);
      
      // Generate audio
      const outputFile = await this.textToSpeech(demo.text, {
        languageCode: demo.language,
        outputFile: `demo_${demo.language.replace('-', '_').toLowerCase()}.mp3`
      });
      
      if (outputFile) {
        generatedFiles.push(outputFile);
        console.log(`    ✅ Generated: ${outputFile}`);
      } else {
        console.log(`    ❌ Failed to generate audio`);
      }
    }
    
    console.log(`\n🎉 Demo completed!`);
    console.log(`📁 Generated ${generatedFiles.length} audio files:`);
    
    generatedFiles.forEach(file => {
      console.log(`  - ${file}`);
    });
  }
}

// Main function
async function main(): Promise<void> {
  console.log('🌍 Multilingual Text-to-Speech API (TypeScript)');
  console.log('='.repeat(50));
  
  // Check if credentials are set
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log('❌ GOOGLE_APPLICATION_CREDENTIALS not set');
    console.log('Please set up your Google Cloud credentials first');
    return;
  }
  
  // Initialize TTS
  const tts = new MultilingualTTS();
  
  // Check command line arguments
  if (process.argv.length > 2) {
    // Command line mode
    if (process.argv.length < 4) {
      console.log('Usage: npm run tts <language_code> "<text>"');
      console.log('Example: npm run tts es-ES "¡Hola, mundo!"');
      return;
    }
    
    const languageCode = process.argv[2];
    const text = process.argv.slice(3).join(' ');
    
    console.log(`🎤 Converting text to ${languageCode}`);
    const outputFile = await tts.textToSpeech(text, { languageCode });
    
    if (outputFile) {
      tts.playAudio(outputFile);
    }
  } else {
    // Interactive mode
    await tts.interactiveMode();
  }
}

// Export for use in other modules
export { MultilingualTTS };
export type { TTSOptions, Voice, LanguageVoices };

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
