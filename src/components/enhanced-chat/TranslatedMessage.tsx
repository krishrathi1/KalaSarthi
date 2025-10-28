"use client";

import { useState } from 'react';
import { Eye, EyeOff, Globe, AlertTriangle, RefreshCw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TranslatedMessageProps {
  originalText: string;
  translatedText: string;
  originalLanguage: string;
  targetLanguage: string;
  confidence: number;
  alternatives?: string[];
  culturalContext?: string;
  isFromCurrentUser: boolean;
  showOriginal?: boolean;
  onRetranslate?: () => void;
  onSelectAlternative?: (alternative: string) => void;
}

export function TranslatedMessage({
  originalText,
  translatedText,
  originalLanguage,
  targetLanguage,
  confidence,
  alternatives = [],
  culturalContext,
  isFromCurrentUser,
  showOriginal = false,
  onRetranslate,
  onSelectAlternative
}: TranslatedMessageProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  
  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return 'text-green-600 bg-green-50 border-green-200';
    if (conf >= 0.6) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };
  
  const getConfidenceText = (conf: number) => {
    if (conf >= 0.8) return 'High';
    if (conf >= 0.6) return 'Medium';
    return 'Low';
  };
  
  const getLanguageFlag = (langCode: string) => {
    const flags: { [key: string]: string } = {
      'en': '🇺🇸',
      'hi': '🇮🇳',
      'bn': '🇧🇩',
      'ta': '🇮🇳',
      'te': '🇮🇳',
      'gu': '🇮🇳',
      'kn': '🇮🇳',
      'ml': '🇮🇳',
      'mr': '🇮🇳',
      'pa': '🇮🇳',
      'or': '🇮🇳',
      'as': '🇮🇳',
      'ur': '🇵🇰'
    };
    return flags[langCode] || '🌐';
  };
  
  const getLanguageName = (langCode: string) => {
    const names: { [key: string]: string } = {
      'en': 'English',
      'hi': 'Hindi',
      'bn': 'Bengali',
      'ta': 'Tamil',
      'te': 'Telugu',
      'gu': 'Gujarati',
      'kn': 'Kannada',
      'ml': 'Malayalam',
      'mr': 'Marathi',
      'pa': 'Punjabi',
      'or': 'Odia',
      'as': 'Assamese',
      'ur': 'Urdu'
    };
    return names[langCode] || langCode.toUpperCase();
  };
  
  return (
    <TooltipProvider>
      <div className={`space-y-2 ${isFromCurrentUser ? 'ml-auto' : 'mr-auto'} max-w-md`}>
        {/* Main Message */}
        <div className={`rounded-lg p-3 ${
          isFromCurrentUser 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted'
        }`}>
          {/* Translated Text */}
          <div className="space-y-2">
            <p className="text-sm leading-relaxed">{translatedText}</p>
            
            {/* Translation Indicator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Globe className="h-3 w-3 opacity-70" />
                <span className="text-xs opacity-70">
                  {getLanguageFlag(originalLanguage)} → {getLanguageFlag(targetLanguage)}
                </span>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getConfidenceColor(confidence)}`}
                >
                  {Math.round(confidence * 100)}%
                </Badge>
              </div>
              
              <div className="flex items-center space-x-1">
                {/* Show Original Toggle */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDetails(!showDetails)}
                      className="h-6 w-6 p-0 opacity-70 hover:opacity-100"
                    >
                      {showDetails ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {showDetails ? 'Hide details' : 'Show details'}
                  </TooltipContent>
                </Tooltip>
                
                {/* Retranslate Button */}
                {onRetranslate && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onRetranslate}
                        className="h-6 w-6 p-0 opacity-70 hover:opacity-100"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Retranslate
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Translation Details */}
        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleContent className="space-y-2">
            {/* Original Text */}
            {(showOriginal || showDetails) && (
              <div className={`text-sm p-2 rounded border ${
                isFromCurrentUser 
                  ? 'bg-primary/10 border-primary/20' 
                  : 'bg-muted/50 border-border'
              }`}>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xs font-medium opacity-70">Original:</span>
                  <Badge variant="outline" className="text-xs">
                    {getLanguageFlag(originalLanguage)} {getLanguageName(originalLanguage)}
                  </Badge>
                </div>
                <p className="leading-relaxed opacity-80">{originalText}</p>
              </div>
            )}
            
            {/* Translation Quality Warning */}
            {confidence < 0.6 && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-700 text-xs">
                  <strong>Low confidence translation.</strong> The meaning might not be fully accurate. 
                  Consider using simpler language or asking for clarification.
                </AlertDescription>
              </Alert>
            )}
            
            {/* Cultural Context */}
            {culturalContext && (
              <div className={`text-xs p-2 rounded border ${
                isFromCurrentUser 
                  ? 'bg-blue-50 border-blue-200 text-blue-700' 
                  : 'bg-blue-50 border-blue-200 text-blue-700'
              }`}>
                <div className="flex items-start space-x-2">
                  <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Cultural Context:</p>
                    <p>{culturalContext}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Alternative Translations */}
            {alternatives.length > 0 && (
              <Collapsible open={showAlternatives} onOpenChange={setShowAlternatives}>
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-auto p-2 text-xs w-full justify-start"
                  >
                    <span>Alternative translations ({alternatives.length})</span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 mt-1">
                  {alternatives.map((alternative, index) => (
                    <div
                      key={index}
                      className={`text-xs p-2 rounded border cursor-pointer transition-colors ${
                        isFromCurrentUser 
                          ? 'bg-primary/5 border-primary/20 hover:bg-primary/10' 
                          : 'bg-muted/30 border-border hover:bg-muted/50'
                      }`}
                      onClick={() => onSelectAlternative?.(alternative)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex-1">{alternative}</span>
                        {onSelectAlternative && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 ml-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectAlternative(alternative);
                            }}
                          >
                            ↑
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
            
            {/* Translation Metadata */}
            <div className="flex items-center justify-between text-xs opacity-50">
              <span>
                Translated by Cultural Context AI
              </span>
              <span>
                {getConfidenceText(confidence)} confidence
              </span>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </TooltipProvider>
  );
}