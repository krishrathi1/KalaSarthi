/**
 * Audio Recording Test Page
 * Simple page to test and debug audio recording functionality
 */

'use client';

import React from 'react';
import { AudioRecordingTest } from '@/components/debug/AudioRecordingTest';

export default function TestAudioPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AudioRecordingTest />
    </div>
  );
}