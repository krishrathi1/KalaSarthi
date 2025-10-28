/**
 * Enhanced Chat API - Audio Upload Endpoint
 * Handles audio file uploads with quality validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const sessionId = formData.get('sessionId') as string;
    const userId = formData.get('userId') as string;
    
    if (!audioFile || !sessionId || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Missing audio file, sessionId, or userId'
      }, { status: 400 });
    }
    
    // Validate audio file
    const validationResult = validateAudioFile(audioFile);
    if (!validationResult.valid) {
      return NextResponse.json({
        success: false,
        error: validationResult.error
      }, { status: 400 });
    }
    
    // Create upload directory
    const uploadDir = join(process.cwd(), 'uploads', 'audio', sessionId);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${userId}_${timestamp}.${getFileExtension(audioFile.name)}`;
    const filepath = join(uploadDir, filename);
    
    // Save file
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);
    
    // Generate public URL
    const publicUrl = `/uploads/audio/${sessionId}/${filename}`;
    
    // Analyze audio quality
    const qualityMetrics = await analyzeAudioQuality(buffer, audioFile.type);
    
    return NextResponse.json({
      success: true,
      result: {
        url: publicUrl,
        filename: filename,
        size: audioFile.size,
        duration: qualityMetrics.duration,
        quality: qualityMetrics.quality,
        sampleRate: qualityMetrics.sampleRate,
        channels: qualityMetrics.channels,
        format: audioFile.type
      }
    });
    
  } catch (error) {
    console.error('Audio upload error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to upload audio file'
    }, { status: 500 });
  }
}

function validateAudioFile(file: File): { valid: boolean; error?: string } {
  // Check file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: 'Audio file too large (max 10MB)' };
  }
  
  // Check file type
  const allowedTypes = [
    'audio/wav',
    'audio/mp3',
    'audio/mpeg',
    'audio/webm',
    'audio/ogg',
    'audio/m4a'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Unsupported audio format' };
  }
  
  return { valid: true };
}

function getFileExtension(filename: string): string {
  return filename.split('.').pop() || 'wav';
}

async function analyzeAudioQuality(buffer: Buffer, mimeType: string) {
  // Basic audio analysis - in production, use proper audio analysis library
  return {
    duration: estimateDuration(buffer.length, mimeType),
    quality: buffer.length > 100000 ? 'high' : buffer.length > 50000 ? 'medium' : 'low',
    sampleRate: 44100, // Default assumption
    channels: 1, // Mono assumption for voice
    bitrate: Math.round((buffer.length * 8) / estimateDuration(buffer.length, mimeType) / 1000)
  };
}

function estimateDuration(bufferSize: number, mimeType: string): number {
  // Rough estimation based on typical bitrates
  const avgBitrate = mimeType.includes('mp3') ? 128000 : 
                    mimeType.includes('wav') ? 1411200 : 
                    64000; // Default for compressed formats
  
  return Math.max(1, Math.round((bufferSize * 8) / avgBitrate));
}