/**
 * Custom Translation Overrides Component
 * Allows users to create and manage custom translation overrides
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Search } from 'lucide-react';
import { LanguageCode, languages } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { unifiedTranslationService, CustomTranslationOverride } from '@/lib/services/UnifiedTranslationService';

interface CustomOverridesProps {
  className?: string;
  onOverrideAdded?: (override: CustomTranslationOverride) => void;
  onOverrideRemoved?: (override: CustomTranslationOverride) => void;
}

interface OverrideFormData {
  originalText: string;
  translatedText: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
}

export function CustomOverrides({
  className,
  onOverrideAdded,
  onOverrideRemoved
}: CustomOverridesProps) {
  const [overrides, setOverrides] = useState<CustomTranslationOverride[]>([]);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [formData, setFormData] = useState<OverrideFormData>({
    originalText: '',
    translatedText: '',
    sourceLanguage: 'en',
    targetLanguage: 'hi'
  });

  // Load overrides on mount
  useEffect(() => {
    loadOverrides();
  }, []);

  const loadOverrides = () => {
    const currentOverrides = unifiedTranslationService.getCustomOverrides();
    setOverrides(currentOverrides);
  };

  const handleAddOverride = () => {
    if (!formData.originalText.trim() || !formData.translatedText.trim()) {
      return;
    }

    const newOverride: Omit<CustomTranslationOverride, 'createdAt'> = {
      originalText: formData.originalText.trim(),
      translatedText: formData.translatedText.trim(),
      sourceLanguage: formData.sourceLanguage,
      targetLanguage: formData.targetLanguage,
      createdBy: 'user' // Could be enhanced with actual user identification
    };

    unifiedTranslationService.addCustomOverride(newOverride);
    loadOverrides();
    resetForm();

    if (onOverrideAdded) {
      onOverrideAdded({ ...newOverride, createdAt: Date.now() });
    }
  };

  const handleRemoveOverride = (override: CustomTranslationOverride) => {
    unifiedTranslationService.removeCustomOverride(
      override.originalText,
      override.sourceLanguage,
      override.targetLanguage
    );
    loadOverrides();

    if (onOverrideRemoved) {
      onOverrideRemoved(override);
    }
  };

  const resetForm = () => {
    setFormData({
      originalText: '',
      translatedText: '',
      sourceLanguage: 'en',
      targetLanguage: 'hi'
    });
    setIsAddingNew(false);
    setEditingId(null);
  };

  const startEditing = (override: CustomTranslationOverride) => {
    setFormData({
      originalText: override.originalText,
      translatedText: override.translatedText,
      sourceLanguage: override.sourceLanguage,
      targetLanguage: override.targetLanguage
    });
    setEditingId(`${override.originalText}_${override.sourceLanguage}_${override.targetLanguage}`);
    setIsAddingNew(false);
  };

  const handleUpdateOverride = () => {
    if (editingId) {
      // Remove old override and add new one
      const [originalText, sourceLanguage, targetLanguage] = editingId.split('_');
      unifiedTranslationService.removeCustomOverride(
        originalText,
        sourceLanguage as LanguageCode,
        targetLanguage as LanguageCode
      );
      handleAddOverride();
    }
  };

  // Filter overrides based on search query
  const filteredOverrides = overrides.filter(override => {
    const sourceLang = override.sourceLanguage as LanguageCode;
    const targetLang = override.targetLanguage as LanguageCode;
    return (
      override.originalText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      override.translatedText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      languages[sourceLang]?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      languages[targetLang]?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Custom Translation Overrides
        </h3>
        <button
          onClick={() => setIsAddingNew(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Override
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search overrides..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Add/Edit Form */}
      {(isAddingNew || editingId) && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            {editingId ? 'Edit Override' : 'Add New Override'}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Language Selection */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  From Language
                </label>
                <select
                  value={formData.sourceLanguage}
                  onChange={(e) => setFormData(prev => ({ ...prev, sourceLanguage: e.target.value as LanguageCode }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(languages).map(([code, lang]) => (
                    <option key={code} value={code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  To Language
                </label>
                <select
                  value={formData.targetLanguage}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetLanguage: e.target.value as LanguageCode }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(languages).map(([code, lang]) => (
                    <option key={code} value={code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Text Inputs */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Original Text ({languages[formData.sourceLanguage as LanguageCode]?.name})
                </label>
                <textarea
                  value={formData.originalText}
                  onChange={(e) => setFormData(prev => ({ ...prev, originalText: e.target.value }))}
                  placeholder="Enter the original text..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Custom Translation ({languages[formData.targetLanguage as LanguageCode]?.name})
                </label>
                <textarea
                  value={formData.translatedText}
                  onChange={(e) => setFormData(prev => ({ ...prev, translatedText: e.target.value }))}
                  placeholder="Enter your custom translation..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={editingId ? handleUpdateOverride : handleAddOverride}
              disabled={!formData.originalText.trim() || !formData.translatedText.trim()}
              className={cn(
                'flex items-center gap-1 px-3 py-2 text-sm rounded-md transition-colors',
                formData.originalText.trim() && formData.translatedText.trim()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              )}
            >
              <Save className="w-4 h-4" />
              {editingId ? 'Update' : 'Save'}
            </button>
            <button
              onClick={resetForm}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Overrides List */}
      <div className="space-y-2">
        {filteredOverrides.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchQuery ? 'No overrides match your search.' : 'No custom overrides yet.'}
          </div>
        ) : (
          filteredOverrides.map((override) => {
            const overrideId = `${override.originalText}_${override.sourceLanguage}_${override.targetLanguage}`;
            return (
              <div
                key={overrideId}
                className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    {/* Language pair */}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        {languages[override.sourceLanguage as LanguageCode]?.name}
                      </span>
                      <span>→</span>
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                        {languages[override.targetLanguage as LanguageCode]?.name}
                      </span>
                    </div>

                    {/* Text content */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs font-medium text-gray-700 mb-1">Original:</div>
                        <div className="text-sm text-gray-900 p-2 bg-gray-50 rounded border">
                          {override.originalText}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-700 mb-1">Custom Translation:</div>
                        <div className="text-sm text-gray-900 p-2 bg-gray-50 rounded border">
                          {override.translatedText}
                        </div>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="text-xs text-gray-500">
                      Created: {new Date(override.createdAt).toLocaleDateString()}
                      {override.createdBy && ` by ${override.createdBy}`}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 ml-4">
                    <button
                      onClick={() => startEditing(override)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit override"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveOverride(override)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete override"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default CustomOverrides;