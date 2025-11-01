'use client';

import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Eye, Type, Zap, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  accessibilityManager,
  AccessibilitySettings as Settings,
  ColorScheme,
  FontSize,
  MotionPreference
} from '@/lib/accessibility/accessibility-manager';

export function AccessibilitySettings() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(accessibilityManager.getSettings());

  useEffect(() => {
    const unsubscribe = accessibilityManager.subscribe(setSettings);
    return () => {
      // call unsubscribe and ignore its return value to satisfy EffectCallback's void return
      unsubscribe();
    };
  }, []);

  const handleColorSchemeChange = (value: ColorScheme) => {
    accessibilityManager.updateSetting('colorScheme', value);
  };

  const handleFontSizeChange = (value: FontSize) => {
    accessibilityManager.updateSetting('fontSize', value);
  };

  const handleMotionChange = (value: MotionPreference) => {
    accessibilityManager.updateSetting('motionPreference', value);
  };

  const handleFocusIndicatorsChange = (checked: boolean) => {
    accessibilityManager.updateSetting('focusIndicators', checked);
  };

  const handleReset = () => {
    accessibilityManager.resetSettings();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="min-h-[3rem] min-w-[3rem]"
          aria-label="Accessibility settings"
        >
          <SettingsIcon className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Accessibility Settings</DialogTitle>
          <DialogDescription>
            Customize your experience for better accessibility
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Color Scheme */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Eye className="w-5 h-5" />
                Color Scheme
              </CardTitle>
              <CardDescription>
                Choose a color scheme that works best for you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={settings.colorScheme}
                onValueChange={handleColorSchemeChange}
              >
                <div className="flex items-center space-x-2 min-h-[3rem]">
                  <RadioGroupItem value="light" id="light" />
                  <Label htmlFor="light" className="cursor-pointer">
                    Light Mode
                  </Label>
                </div>
                <div className="flex items-center space-x-2 min-h-[3rem]">
                  <RadioGroupItem value="dark" id="dark" />
                  <Label htmlFor="dark" className="cursor-pointer">
                    Dark Mode
                  </Label>
                </div>
                <div className="flex items-center space-x-2 min-h-[3rem]">
                  <RadioGroupItem value="high-contrast" id="high-contrast" />
                  <Label htmlFor="high-contrast" className="cursor-pointer">
                    High Contrast Mode
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Font Size */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Type className="w-5 h-5" />
                Text Size
              </CardTitle>
              <CardDescription>
                Adjust text size for better readability
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={settings.fontSize}
                onValueChange={handleFontSizeChange}
              >
                <div className="flex items-center space-x-2 min-h-[3rem]">
                  <RadioGroupItem value="normal" id="normal" />
                  <Label htmlFor="normal" className="cursor-pointer">
                    Normal (16px)
                  </Label>
                </div>
                <div className="flex items-center space-x-2 min-h-[3rem]">
                  <RadioGroupItem value="large" id="large" />
                  <Label htmlFor="large" className="cursor-pointer">
                    Large (18px)
                  </Label>
                </div>
                <div className="flex items-center space-x-2 min-h-[3rem]">
                  <RadioGroupItem value="extra-large" id="extra-large" />
                  <Label htmlFor="extra-large" className="cursor-pointer">
                    Extra Large (20px)
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Motion */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="w-5 h-5" />
                Motion & Animations
              </CardTitle>
              <CardDescription>
                Control animations and transitions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={settings.motionPreference}
                onValueChange={handleMotionChange}
              >
                <div className="flex items-center space-x-2 min-h-[3rem]">
                  <RadioGroupItem value="normal" id="motion-normal" />
                  <Label htmlFor="motion-normal" className="cursor-pointer">
                    Normal Animations
                  </Label>
                </div>
                <div className="flex items-center space-x-2 min-h-[3rem]">
                  <RadioGroupItem value="reduced" id="motion-reduced" />
                  <Label htmlFor="motion-reduced" className="cursor-pointer">
                    Reduced Motion
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Keyboard Navigation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Keyboard className="w-5 h-5" />
                Keyboard Navigation
              </CardTitle>
              <CardDescription>
                Enhanced keyboard navigation features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between min-h-[3rem]">
                <Label htmlFor="focus-indicators" className="cursor-pointer">
                  Show Focus Indicators
                </Label>
                <Switch
                  id="focus-indicators"
                  checked={settings.focusIndicators}
                  onCheckedChange={handleFocusIndicatorsChange}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Displays visible outlines around focused elements for easier keyboard navigation
              </p>
            </CardContent>
          </Card>

          {/* Reset Button */}
          <div className="flex justify-end">
            <Button onClick={handleReset} variant="outline">
              Reset to Defaults
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
