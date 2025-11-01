"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useOffline } from '@/hooks/use-offline';
import { SearchResult } from '@/lib/offline-search';
import { useDebounce } from '@/hooks/use-debounce';

interface OfflineSearchProps {
    onResultSelect?: (result: SearchResult) => void;
    placeholder?: string;
    types?: ('product' | 'trend' | 'chat' | 'artisan')[];
    className?: string;
}

export function OfflineSearch({
    onResultSelect,
    placeholder = "Search...",
    types,
    className = ""
}: OfflineSearchProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);

    const { isOnline, searchOffline, getSearchSuggestions } = useOffline();
    const debouncedQuery = useDebounce(query, 300);

    // Search function
    const performSearch = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setResults([]);
            setSuggestions([]);
            return;
        }

        setIsSearching(true);
        try {
            const [searchResults, searchSuggestions] = await Promise.all([
                searchOffline(searchQuery, { types, limit: 10 }),
                getSearchSuggestions(searchQuery, 5)
            ]);

            setResults(searchResults);
            setSuggestions(searchSuggestions);
            setShowResults(true);
        } catch (error) {
            console.error('Search failed:', error);
            setResults([]);
            setSuggestions([]);
        } finally {
            setIsSearching(false);
        }
    }, [searchOffline, getSearchSuggestions, types]);

    // Debounced search
    useEffect(() => {
        performSearch(debouncedQuery);
    }, [debouncedQuery, performSearch]);

    // Handle result selection
    const handleResultSelect = (result: SearchResult) => {
        setShowResults(false);
        setQuery('');
        onResultSelect?.(result);
    };

    // Handle suggestion selection
    const handleSuggestionSelect = (suggestion: string) => {
        setQuery(suggestion);
        setShowResults(true);
    };

    // Get result type color
    const getTypeColor = (type: string) => {
        switch (type) {
            case 'product': return 'bg-blue-100 text-blue-800';
            case 'trend': return 'bg-green-100 text-green-800';
            case 'chat': return 'bg-purple-100 text-purple-800';
            case 'artisan': return 'bg-orange-100 text-orange-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className={`relative ${className}`}>
            {/* Search Input */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setShowResults(true)}
                    className="pl-10 pr-12"
                />

                {/* Status Indicator */}
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                    {isSearching && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isOnline ? (
                        <Wifi className="h-4 w-4 text-green-600" />
                    ) : (
                        <WifiOff className="h-4 w-4 text-red-600" />
                    )}
                </div>
            </div>

            {/* Results Dropdown */}
            {showResults && (query.trim() || suggestions.length > 0) && (
                <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-96 overflow-y-auto">
                    <CardContent className="p-0">
                        {/* Offline Indicator */}
                        {!isOnline && (
                            <div className="p-3 bg-yellow-50 border-b border-yellow-200">
                                <div className="flex items-center gap-2 text-sm text-yellow-800">
                                    <WifiOff className="h-4 w-4" />
                                    Searching cached data (offline)
                                </div>
                            </div>
                        )}

                        {/* Suggestions */}
                        {suggestions.length > 0 && !results.length && (
                            <div className="p-2">
                                <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                                    Suggestions
                                </div>
                                {suggestions.map((suggestion, index) => (
                                    <Button
                                        key={index}
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-start text-left h-8"
                                        onClick={() => handleSuggestionSelect(suggestion)}
                                    >
                                        <Search className="h-3 w-3 mr-2" />
                                        {suggestion}
                                    </Button>
                                ))}
                            </div>
                        )}

                        {/* Search Results */}
                        {results.length > 0 && (
                            <div className="p-2">
                                <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                                    Results ({results.length})
                                </div>
                                {results.map((result, index) => (
                                    <Button
                                        key={index}
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-start text-left h-auto p-3 mb-1"
                                        onClick={() => handleResultSelect(result)}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium truncate">
                                                    {result.title}
                                                </span>
                                                <Badge
                                                    variant="outline"
                                                    className={`text-xs ${getTypeColor(result.type)}`}
                                                >
                                                    {result.type}
                                                </Badge>
                                                <Badge variant="outline" className="text-xs">
                                                    {Math.round(result.score * 100)}%
                                                </Badge>
                                            </div>
                                            {result.description && (
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {result.description}
                                                </p>
                                            )}
                                        </div>
                                    </Button>
                                ))}
                            </div>
                        )}

                        {/* No Results */}
                        {query.trim() && !isSearching && results.length === 0 && suggestions.length === 0 && (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                No results found for "{query}"
                                {!isOnline && (
                                    <div className="mt-1 text-xs">
                                        Try going online for more results
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Click outside to close */}
            {showResults && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowResults(false)}
                />
            )}
        </div>
    );
}