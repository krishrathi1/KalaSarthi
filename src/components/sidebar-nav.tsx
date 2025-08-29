
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
import { menuItems, t } from "@/lib/i18n";

export function SidebarNav() {
  const pathname = usePathname();
  const { language } = useLanguage();

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <Logo className="size-8 text-primary" />
          <h1 className="font-headline text-xl font-semibold">KalaMitra</h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
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
          {t('tagline', language)}
        </p>
      </SidebarFooter>
    </>
  );
}
