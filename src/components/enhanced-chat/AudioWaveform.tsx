"use client";

import { useEffect, useRef, useState } from 'react';

interface AudioWaveformProps {
  audioUrl?: string;
  isRecording?: boolean;
  audioLevel?: number;
  width?: number;
  height?: number;
  color?: string;
  backgroundColor?: string;
  className?: string;
}

export function AudioWaveform({
  audioUrl,
  isRecording = false,
  audioLevel = 0,
  width = 200,
  height = 40,
  color = '#3b82f6',
  backgroundColor = '#f1f5f9',
  className = ''
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  
  useEffect(() => {
    if (audioUrl && !isRecording) {
      loadAudioWaveform();
    } else if (isRecording) {
      startRecordingVisualization();
    } else {
      stopVisualization();
    }
    
    return () => {
      stopVisualization();
    };
  }, [audioUrl, isRecording]);
  
  useEffect(() => {
    if (isRecording) {
      updateRecordingWaveform();
    }
  }, [audioLevel, isRecording]);
  
  const loadAudioWaveform = async () => {
    if (!audioUrl || !canvasRef.current) return;
    
    try {
      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Fetch and decode audio
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Extract waveform data
      const channelData = audioBuffer.getChannelData(0);
      const samples = Math.floor(width / 2); // One sample per 2 pixels
      const blockSize = Math.floor(channelData.length / samples);
      const waveform: number[] = [];
      
      for (let i = 0; i < samples; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(channelData[i * blockSize + j]);
        }
        waveform.push(sum / blockSize);
      }
      
      setWaveformData(waveform);
      drawStaticWaveform(waveform);
      
      audioContext.close();
    } catch (error) {
      console.error('Failed to load audio waveform:', error);
      drawPlaceholderWaveform();
    }
  };
  
  const startRecordingVisualization = () => {
    if (!canvasRef.current) return;
    
    // Initialize with empty waveform
    const initialData = new Array(Math.floor(width / 2)).fill(0);
    setWaveformData(initialData);
    
    // Start animation
    animateRecordingWaveform();
  };
  
  const updateRecordingWaveform = () => {
    if (!isRecording) return;
    
    setWaveformData(prev => {
      const newData = [...prev];
      // Shift data left and add new sample
      newData.shift();
      newData.push(audioLevel / 100);
      return newData;
    });
  };
  
  const animateRecordingWaveform = () => {
    if (!isRecording || !canvasRef.current) return;
    
    drawRecordingWaveform();
    animationRef.current = requestAnimationFrame(animateRecordingWaveform);
  };
  
  const stopVisualization = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
  };
  
  const drawStaticWaveform = (data: number[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    // Draw waveform
    ctx.fillStyle = color;
    const barWidth = width / data.length;
    const centerY = height / 2;
    
    data.forEach((amplitude, index) => {
      const barHeight = amplitude * centerY;
      const x = index * barWidth;
      
      // Draw bar from center up and down
      ctx.fillRect(x, centerY - barHeight, barWidth - 1, barHeight * 2);
    });
  };
  
  const drawRecordingWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    // Draw waveform with gradient effect
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, color + '40'); // 25% opacity
    gradient.addColorStop(0.7, color);
    gradient.addColorStop(1, color + '80'); // 50% opacity
    
    ctx.fillStyle = gradient;
    
    const barWidth = width / waveformData.length;
    const centerY = height / 2;
    
    waveformData.forEach((amplitude, index) => {
      const barHeight = Math.max(2, amplitude * centerY);
      const x = index * barWidth;
      
      // Draw bar with rounded corners effect
      ctx.beginPath();
      ctx.roundRect(x, centerY - barHeight, barWidth - 1, barHeight * 2, 1);
      ctx.fill();
    });
    
    // Add glow effect for current recording
    if (isRecording && audioLevel > 10) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      // Redraw the last few bars with glow
      const glowBars = Math.min(5, waveformData.length);
      for (let i = waveformData.length - glowBars; i < waveformData.length; i++) {
        const amplitude = waveformData[i];
        const barHeight = Math.max(2, amplitude * centerY);
        const x = i * barWidth;
        
        ctx.fillRect(x, centerY - barHeight, barWidth - 1, barHeight * 2);
      }
      
      // Reset shadow
      ctx.shadowBlur = 0;
    }
  };
  
  const drawPlaceholderWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    // Draw placeholder pattern
    ctx.fillStyle = color + '40'; // 25% opacity
    const centerY = height / 2;
    const numBars = Math.floor(width / 4);
    
    for (let i = 0; i < numBars; i++) {
      const x = i * 4;
      const barHeight = Math.random() * centerY * 0.5 + 2;
      ctx.fillRect(x, centerY - barHeight, 2, barHeight * 2);
    }
  };
  
  // Initialize canvas on mount
  useEffect(() => {
    if (canvasRef.current && !audioUrl && !isRecording) {
      drawPlaceholderWaveform();
    }
  }, []);
  
  return (
    <div className={`inline-block ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded border"
        style={{ 
          width: `${width}px`, 
          height: `${height}px`,
          backgroundColor: backgroundColor
        }}
      />
    </div>
  );
}