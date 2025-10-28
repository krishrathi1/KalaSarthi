"use client";

import { useState, useEffect } from 'react';
import { Globe, Eye, EyeOff, Settings, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

interface TranslationControlsProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  showOriginal: boolean;
  onShowOriginalToggle: (show: boolean) => void;
  currentUserLanguage: string;
  otherUserLanguage: string;
  onLanguageChange: (language: string) => void;
  translationQuality?: 'high' | 'medium' | 'low';
  isProcessing?: boolean;
  onRetranslate?: () => void;
}

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', flag: '🇮🇳' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', flag: '🇮🇳' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰' }
];

export function TranslationControls({
  isEnabled,
  onToggle,
  showOriginal,
  onShowOriginalToggle,
  currentUserLanguage,
  otherUserLanguage,
  onLanguageChange,
  translationQuality = 'high',
  isProcessing = false,
  onRetranslate
}: TranslationControlsProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [autoDetectLanguage, setAutoDetectLanguage] = useState(true);
  
  const getCurrentLanguage = () => {
    return SUPPORTED_LANGUAGES.find(lang => lang.code === currentUserLanguage) || SUPPORTED_LANGUAGES[0];
  };
  
  const getOtherLanguage = () => {
    return SUPPORTED_LANGUAGES.find(lang => lang.code === otherUserLanguage) || SUPPORTED_LANGUAGES[1];
  };
  
  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'high': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };
  
  const getQualityIcon = (quality: string) => {
    switch (quality) {
      case 'high': return '✓';
      case 'medium': return '⚠';
      case 'low': return '⚠';
      default: return '?';
    }
  };
  
  return (
    <TooltipProvider>
      <div className="flex items-center space-x-2 p-2 bg-muted/30 rounded-lg border">
        {/* Translation Toggle */}
        <div className="flex items-center space-x-2">
          <Globe className={`h-4 w-4 ${isEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
          <Switch
            id="translation-enabled"
            checked={isEnabled}
            onCheckedChange={onToggle}
          />
          <Label htmlFor="translation-enabled" className="text-sm font-medium">
            Translation
          </Label>
        </div>
        
        <Separator orientation="vertical" className="h-6" />
        
        {/* Language Display */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 text-sm">
            <span className="text-lg">{getCurrentLanguage().flag}</span>
            <span className="font-medium">{getCurrentLanguage().code.toUpperCase()}</span>
          </div>
          
          <div className="text-muted-foreground">↔</div>
          
          <div className="flex items-center space-x-1 text-sm">
            <span className="text-lg">{getOtherLanguage().flag}</span>
            <span className="font-medium">{getOtherLanguage().code.toUpperCase()}</span>
          </div>
        </div>
        
        {/* Translation Quality Indicator */}
        {isEnabled && (
          <>
            <Separator orientation="vertical" className="h-6" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getQualityColor(translationQuality)}`}
                >
                  {getQualityIcon(translationQuality)} {translationQuality}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                Translation quality: {translationQuality}
              </TooltipContent>
            </Tooltip>
          </>
        )}
        
        {/* Show Original Toggle */}
        {isEnabled && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onShowOriginalToggle(!showOriginal)}
                className="h-8 w-8 p-0"
              >
                {showOriginal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {showOriginal ? 'Hide original text' : 'Show original text'}
            </TooltipContent>
          </Tooltip>
        )}
        
        {/* Retranslate Button */}
        {isEnabled && onRetranslate && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRetranslate}
                disabled={isProcessing}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Retranslate messages
            </TooltipContent>
          </Tooltip>
        )}
        
        {/* Settings Popover */}
        <Popover open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Translation Settings</h4>
                <p className="text-sm text-muted-foreground">
                  Configure how messages are translated
                </p>
              </div>
              
              <Separator />
              
              {/* Language Selection */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Your Language</Label>
                  <Select value={currentUserLanguage} onValueChange={onLanguageChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          <div className="flex items-center space-x-2">
                            <span>{lang.flag}</span>
                            <span>{lang.name}</span>
                            <span className="text-muted-foreground">({lang.nativeName})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Other Person's Language</Label>
                  <div className="flex items-center space-x-2 p-2 bg-muted rounded">
                    <span className="text-lg">{getOtherLanguage().flag}</span>
                    <span className="text-sm">{getOtherLanguage().name}</span>
                    <span className="text-sm text-muted-foreground">
                      ({getOtherLanguage().nativeName})
                    </span>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* Auto-detect Language */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Auto-detect Language</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically detect the language of incoming messages
                  </p>
                </div>
                <Switch
                  checked={autoDetectLanguage}
                  onCheckedChange={setAutoDetectLanguage}
                />
              </div>
              
              {/* Show Original Text */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Show Original Text</Label>
                  <p className="text-xs text-muted-foreground">
                    Display original text alongside translations
                  </p>
                </div>
                <Switch
                  checked={showOriginal}
                  onCheckedChange={onShowOriginalToggle}
                />
              </div>
              
              <Separator />
              
              {/* Translation Quality Info */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Translation Quality</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Current Quality:</span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getQualityColor(translationQuality)}`}
                    >
                      {getQualityIcon(translationQuality)} {translationQuality}
                    </Badge>
                  </div>
                  
                  {translationQuality === 'low' && (
                    <div className="flex items-start space-x-2 p-2 bg-yellow-50 rounded text-xs">
                      <AlertTriangle className="h-3 w-3 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="text-yellow-700">
                        <p className="font-medium">Low translation quality detected</p>
                        <p>Consider using simpler language or check your internet connection.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Cultural Context Info */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Cultural Context</Label>
                <p className="text-xs text-muted-foreground">
                  Translations preserve craft-specific terms and cultural nuances automatically.
                </p>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </TooltipProvider>
  );
}