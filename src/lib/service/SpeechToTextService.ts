import { SpeechClient } from '@google-cloud/speech';
import { google } from '@google-cloud/speech/build/protos/protos';

export interface SpeechToTextResult {
  text: string;
  confidence: number;
  language: string;
}

export class SpeechToTextService {
  private static instance: SpeechToTextService;
  private speechClient: SpeechClient;

  private constructor() {
    this.speechClient = new SpeechClient({
      keyFilename: 'google-credentials.json',
      projectId: 'gen-lang-client-0314311341'
    });
  }

  public static getInstance(): SpeechToTextService {
    if (!SpeechToTextService.instance) {
      SpeechToTextService.instance = new SpeechToTextService();
    }
    return SpeechToTextService.instance;
  }

  public async speechToText(
    audioBuffer: ArrayBuffer,
    language: string = 'en-US'
  ): Promise<SpeechToTextResult> {
    try {
      const audioBytes = Buffer.from(audioBuffer);
      
      const request: google.cloud.speech.v1.IRecognizeRequest = {
        audio: {
          content: audioBytes.toString('base64'),
        },
        config: {
          encoding: 'WEBM_OPUS',
          sampleRateHertz: 16000,
          languageCode: language,
          enableAutomaticPunctuation: true,
          enableWordTimeOffsets: true,
          model: 'latest_long',
        },
      };

      const [response] = await this.speechClient.recognize(request);
      
      if (!response.results || response.results.length === 0) {
        throw new Error('No transcription results found');
      }

      const result = response.results[0];
      const alternative = result.alternatives?.[0];

      if (!alternative) {
        throw new Error('No transcription alternative found');
      }

      return {
        text: alternative.transcript || '',
        confidence: alternative.confidence || 0,
        language: language
      };

    } catch (error) {
      console.error('Speech-to-text error:', error);
      throw new Error('Failed to transcribe speech');
    }
  }

  public async streamSpeechToText(
    audioStream: NodeJS.ReadableStream,
    language: string = 'en-US'
  ): Promise<AsyncGenerator<SpeechToTextResult, void, unknown>> {
    const recognizeStream = this.speechClient
      .streamingRecognize({
        config: {
          encoding: 'WEBM_OPUS',
          sampleRateHertz: 16000,
          languageCode: language,
          enableAutomaticPunctuation: true,
          model: 'latest_long',
        },
        interimResults: true,
      })
      .on('error', (error) => {
        console.error('Streaming recognition error:', error);
      });

    // Pipe audio stream to recognition stream
    audioStream.pipe(recognizeStream);

    return this.processStreamingResults(recognizeStream);
  }

  private async *processStreamingResults(
    stream: any
  ): AsyncGenerator<SpeechToTextResult, void, unknown> {
    for await (const chunk of stream) {
      if (chunk.results && chunk.results.length > 0) {
        const result = chunk.results[0];
        const alternative = result.alternatives?.[0];

        if (alternative) {
          yield {
            text: alternative.transcript || '',
            confidence: alternative.confidence || 0,
            language: 'en-US' // This would need to be passed from the calling context
          };
        }
      }
    }
  }
}
