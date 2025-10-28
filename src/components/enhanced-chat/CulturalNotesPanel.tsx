"use client";

import { useState } from 'react';
import { Info, BookOpen, Globe, Lightbulb, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export interface CulturalNote {
  id: string;
  type: 'terminology' | 'cultural_context' | 'regional_variation' | 'business_etiquette' | 'translation_note';
  title: string;
  description: string;
  originalTerm?: string;
  translatedTerm?: string;
  culturalSignificance?: string;
  examples?: string[];
  relatedTerms?: string[];
  confidence?: number;
}

export interface CulturalNotesPanelProps {
  notes: CulturalNote[];
  isOpen: boolean;
  onClose: () => void;
  sourceLanguage: string;
  targetLanguage: string;
  conversationContext?: string;
}

export function CulturalNotesPanel({
  notes,
  isOpen,
  onClose,
  sourceLanguage,
  targetLanguage,
  conversationContext = 'general'
}: CulturalNotesPanelProps) {
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const toggleNoteExpansion = (noteId: string) => {
    const newExpanded = new Set(expandedNotes);
    if (newExpanded.has(noteId)) {
      newExpanded.delete(noteId);
    } else {
      newExpanded.add(noteId);
    }
    setExpandedNotes(newExpanded);
  };

  const getNoteIcon = (type: string) => {
    switch (type) {
      case 'terminology':
        return <BookOpen className="h-4 w-4" />;
      case 'cultural_context':
        return <Globe className="h-4 w-4" />;
      case 'regional_variation':
        return <Info className="h-4 w-4" />;
      case 'business_etiquette':
        return <Lightbulb className="h-4 w-4" />;
      case 'translation_note':
        return <Info className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getNoteColor = (type: string) => {
    switch (type) {
      case 'terminology':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'cultural_context':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'regional_variation':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'business_etiquette':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'translation_note':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const groupedNotes = notes.reduce((groups, note) => {
    if (!groups[note.type]) {
      groups[note.type] = [];
    }
    groups[note.type].push(note);
    return groups;
  }, {} as Record<string, CulturalNote[]>);

  const getTypeTitle = (type: string) => {
    switch (type) {
      case 'terminology':
        return 'Craft Terminology';
      case 'cultural_context':
        return 'Cultural Context';
      case 'regional_variation':
        return 'Regional Variations';
      case 'business_etiquette':
        return 'Business Etiquette';
      case 'translation_note':
        return 'Translation Notes';
      default:
        return 'Other Notes';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] m-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">Cultural Context & Translation Notes</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Understanding the cultural nuances in your conversation
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Language Context */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {sourceLanguage.toUpperCase()} → {targetLanguage.toUpperCase()}
              </span>
            </div>
            <Badge variant="outline" className="text-xs">
              {conversationContext.replace('_', ' ')}
            </Badge>
          </div>

          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {Object.entries(groupedNotes).map(([type, typeNotes]) => (
                <div key={type} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    {getNoteIcon(type)}
                    <h3 className="font-medium text-sm">{getTypeTitle(type)}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {typeNotes.length}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {typeNotes.map((note) => (
                      <Collapsible key={note.id}>
                        <CollapsibleTrigger
                          className="w-full"
                          onClick={() => toggleNoteExpansion(note.id)}
                        >
                          <div className={`p-3 rounded-lg border ${getNoteColor(note.type)} hover:opacity-80 transition-opacity`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                {getNoteIcon(note.type)}
                                <span className="font-medium text-sm">{note.title}</span>
                                {note.confidence && (
                                  <Badge variant="outline" className="text-xs">
                                    {Math.round(note.confidence * 100)}%
                                  </Badge>
                                )}
                              </div>
                              {expandedNotes.has(note.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </div>
                            
                            {!expandedNotes.has(note.id) && (
                              <p className="text-sm text-left mt-2 line-clamp-2">
                                {note.description}
                              </p>
                            )}
                          </div>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="mt-2 p-4 bg-background border rounded-lg space-y-3">
                            <p className="text-sm">{note.description}</p>

                            {note.originalTerm && note.translatedTerm && (
                              <div className="space-y-2">
                                <Separator />
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="font-medium text-muted-foreground">Original:</span>
                                    <p className="mt-1 p-2 bg-muted rounded">{note.originalTerm}</p>
                                  </div>
                                  <div>
                                    <span className="font-medium text-muted-foreground">Translation:</span>
                                    <p className="mt-1 p-2 bg-muted rounded">{note.translatedTerm}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {note.culturalSignificance && (
                              <div className="space-y-2">
                                <Separator />
                                <div>
                                  <span className="font-medium text-muted-foreground text-sm">Cultural Significance:</span>
                                  <p className="text-sm mt-1 text-muted-foreground italic">
                                    {note.culturalSignificance}
                                  </p>
                                </div>
                              </div>
                            )}

                            {note.examples && note.examples.length > 0 && (
                              <div className="space-y-2">
                                <Separator />
                                <div>
                                  <span className="font-medium text-muted-foreground text-sm">Examples:</span>
                                  <ul className="text-sm mt-1 space-y-1">
                                    {note.examples.map((example, index) => (
                                      <li key={index} className="flex items-start space-x-2">
                                        <span className="text-muted-foreground">•</span>
                                        <span>{example}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )}

                            {note.relatedTerms && note.relatedTerms.length > 0 && (
                              <div className="space-y-2">
                                <Separator />
                                <div>
                                  <span className="font-medium text-muted-foreground text-sm">Related Terms:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {note.relatedTerms.map((term, index) => (
                                      <Badge key={index} variant="outline" className="text-xs">
                                        {term}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                </div>
              ))}

              {notes.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No cultural notes available for this conversation.</p>
                  <p className="text-xs mt-1">Cultural context will appear as you exchange messages.</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Summary */}
          {notes.length > 0 && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {notes.length} cultural note{notes.length !== 1 ? 's' : ''} identified
                </span>
                <span>
                  Avg. confidence: {Math.round(
                    notes.reduce((sum, note) => sum + (note.confidence || 0), 0) / notes.length * 100
                  )}%
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}