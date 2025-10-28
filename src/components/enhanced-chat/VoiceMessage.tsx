"use client";

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Download, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface VoiceMessageProps {
  audioUrl: string;
  duration: number;
  transcription?: string;
  language: string;
  confidence?: number;
  isFromCurrentUser: boolean;
  timestamp: Date;
  onRegenerate?: () => void;
}

export function VoiceMessage({
  audioUrl,
  duration,
  transcription,
  language,
  confidence,
  isFromCurrentUser,
  timestamp,
  onRegenerate
}: VoiceMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [showTranscription, setShowTranscription] = useState(true);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    
    audio.addEventListener('loadeddata', () => {
      setIsLoaded(true);
    });
    
    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });
    
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });
    
    audio.addEventListener('play', () => {
      setIsPlaying(true);
    });
    
    audio.addEventListener('pause', () => {
      setIsPlaying(false);
    });
    
    return () => {
      audio.pause();
      audio.removeEventListener('loadeddata', () => {});
      audio.removeEventListener('timeupdate', () => {});
      audio.removeEventListener('ended', () => {});
      audio.removeEventListener('play', () => {});
      audio.removeEventListener('pause', () => {});
    };
  }, [audioUrl]);
  
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.volume = volume;
    }
  }, [playbackRate, volume]);
  
  const togglePlayback = () => {
    if (!audioRef.current || !isLoaded) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(error => {
        console.error('Playback failed:', error);
      });
    }
  };
  
  const handleProgressClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const width = rect.width;
    const percentage = clickX / width;
    const newTime = percentage * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getPlaybackRateOptions = () => [0.5, 0.75, 1, 1.25, 1.5, 2];
  
  const downloadAudio = () => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `voice-message-${timestamp.getTime()}.webm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const getConfidenceColor = (conf?: number) => {
    if (!conf) return 'secondary';
    if (conf >= 0.8) return 'default';
    if (conf >= 0.6) return 'secondary';
    return 'destructive';
  };
  
  const getConfidenceText = (conf?: number) => {
    if (!conf) return 'Unknown';
    if (conf >= 0.8) return 'High';
    if (conf >= 0.6) return 'Medium';
    return 'Low';
  };
  
  return (
    <TooltipProvider>
      <div className={`flex flex-col space-y-2 max-w-sm ${
        isFromCurrentUser ? 'ml-auto' : 'mr-auto'
      }`}>
        {/* Voice Player */}
        <div className={`rounded-lg p-3 ${
          isFromCurrentUser 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted'
        }`}>
          <div className="flex items-center space-x-3">
            {/* Play/Pause Button */}
            <Button
              variant={isFromCurrentUser ? "secondary" : "default"}
              size="sm"
              onClick={togglePlayback}
              disabled={!isLoaded}
              className="flex-shrink-0"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            
            {/* Progress Bar */}
            <div className="flex-1 space-y-1">
              <div
                ref={progressRef}
                className="h-2 bg-background/20 rounded-full cursor-pointer relative overflow-hidden"
                onClick={handleProgressClick}
              >
                <div
                  className="h-full bg-current rounded-full transition-all duration-100"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
              </div>
              
              <div className="flex justify-between text-xs opacity-70">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
            
            {/* Volume Control */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setVolume(volume > 0 ? 0 : 1)}
                  className="flex-shrink-0"
                >
                  {volume > 0 ? (
                    <Volume2 className="h-4 w-4" />
                  ) : (
                    <VolumeX className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {volume > 0 ? 'Mute' : 'Unmute'}
              </TooltipContent>
            </Tooltip>
          </div>
          
          {/* Playback Controls */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-current/20">
            <div className="flex items-center space-x-2">
              {/* Playback Speed */}
              <select
                value={playbackRate}
                onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                className="text-xs bg-transparent border border-current/20 rounded px-1 py-0.5"
              >
                {getPlaybackRateOptions().map(rate => (
                  <option key={rate} value={rate} className="bg-background text-foreground">
                    {rate}x
                  </option>
                ))}
              </select>
              
              {/* Language Badge */}
              <Badge variant="outline" className="text-xs">
                {language.toUpperCase()}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-1">
              {/* Download Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={downloadAudio}
                    className="h-6 w-6 p-0"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download audio</TooltipContent>
              </Tooltip>
              
              {/* Regenerate Button (for current user) */}
              {isFromCurrentUser && onRegenerate && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onRegenerate}
                      className="h-6 w-6 p-0"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Regenerate transcription</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
        
        {/* Transcription */}
        {transcription && (
          <div className={`text-sm p-2 rounded ${
            isFromCurrentUser 
              ? 'bg-primary/10 text-primary-foreground/80' 
              : 'bg-muted/50 text-muted-foreground'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium">Transcription:</span>
              <div className="flex items-center space-x-2">
                {confidence && (
                  <Badge 
                    variant={getConfidenceColor(confidence)} 
                    className="text-xs"
                  >
                    {getConfidenceText(confidence)} ({Math.round(confidence * 100)}%)
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTranscription(!showTranscription)}
                  className="h-4 w-4 p-0"
                >
                  {showTranscription ? '−' : '+'}
                </Button>
              </div>
            </div>
            
            {showTranscription && (
              <p className="text-sm leading-relaxed">
                {transcription}
              </p>
            )}
          </div>
        )}
        
        {/* Timestamp */}
        <div className={`text-xs opacity-50 ${
          isFromCurrentUser ? 'text-right' : 'text-left'
        }`}>
          {timestamp.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}