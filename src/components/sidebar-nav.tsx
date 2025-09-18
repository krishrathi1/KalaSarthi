
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BotMessageSquare,
  Sparkles,
  Palette,
  Users,
  ShieldCheck,
  Package,
  ScrollText,
  IndianRupee,
  Calculator,
  Archive,
  FileText,
  User,
  Globe,
  Mic,
  UserPlus,
  DollarSign,
} from "lucide-react";
import { Logo } from "@/components/icons";
import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useLanguage } from "@/context/language-context";
import { useAuth } from "@/context/auth-context";
import { useRoleBasedAccess } from "@/hooks/useRoleBasedAccess";
import { menuItems, t, translateAsync } from "@/lib/i18n";
import { useState, useEffect } from "react";

export function SidebarNav() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const { userProfile } = useAuth();
  const { shouldShowMenuItem } = useRoleBasedAccess();
  const [translatedAppName, setTranslatedAppName] = useState('KalaSarthi');
  const [translatedTagline, setTranslatedTagline] = useState('From Kanchipuram to California...');

  // Filter menu items based on user role and hidden status
  const filteredMenuItems = menuItems.filter(item => {
    // Hide items marked as hidden
    if (item.hidden) {
      return false;
    }

    // For unauthenticated users, show more public-friendly items
    if (!userProfile) {
      const publicFriendlyRoutes = [
        '/marketplace',
        '/auth',
        '/smart-product-creator',
        '/trend-spotter',
        '/trend-mapper',
        '/ai-image-generator',
        '/arth-saarthi',
        '/artisan-buddy',
        '/yojana-mitra',
        '/voice-enrollment',
        '/trust-layer',
        '/matchmaking',
        '/multi-marketplace'
      ];
      return publicFriendlyRoutes.some(route => item.path.startsWith(route));
    }
    return shouldShowMenuItem(item.path);
  });

  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const appName = await translateAsync('appName', language);
        const tagline = await translateAsync('tagline', language);
        setTranslatedAppName(appName);
        setTranslatedTagline(tagline);
      } catch (error) {
        console.error('Sidebar translation loading failed:', error);
        // Fallback to static translations
        setTranslatedAppName(t('appName', language) || 'KalaSarthi');
        setTranslatedTagline(t('tagline', language) || 'From Kanchipuram to California...');
      }
    };

    loadTranslations();
  }, [language]);

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2">
          <Logo className="size-6 sm:size-8 text-primary flex-shrink-0" />
          <h1 className="font-headline text-lg sm:text-xl font-semibold truncate">{translatedAppName}</h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {filteredMenuItems.map((item) => (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.path}
              >
                <Link href={item.path} prefetch={true}>
                  <item.icon />
                  <span>{t(item.label, language)}</span>

                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <p className="px-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {translatedTagline}
        </p>
      </SidebarFooter>
    </>
  );
}
