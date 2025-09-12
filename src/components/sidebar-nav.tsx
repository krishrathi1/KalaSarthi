
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

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter(item => {
    // For unauthenticated users, only show public-friendly items
    if (!userProfile) {
      const publicFriendlyRoutes = ['/marketplace', '/auth'];
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
        <div className="flex items-center gap-2">
          <Logo className="size-8 text-primary" />
          <h1 className="font-headline text-xl font-semibold">{translatedAppName}</h1>
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
        <p className="px-2 text-xs text-muted-foreground">
          {translatedTagline}
        </p>
      </SidebarFooter>
    </>
  );
}
