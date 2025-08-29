
"use client";

import Link from "next/link";
import {
  BotMessageSquare,
  Sparkles,
  Palette,
  Users,
  ShieldCheck,
  Package,
  ScrollText,
  IndianRupee,
  ArrowRight,
  Calculator,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "./ui/button";
import { useLanguage } from "@/context/language-context";
import { features, t } from "@/lib/i18n";

export function Dashboard() {
  const { language } = useLanguage();
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-4xl font-headline font-bold">{t('greeting', language)}, Ramu!</h1>
        <p className="text-muted-foreground">{t('welcome', language)}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {features.map((feature) => (
          <Card key={feature.title.en} className="flex flex-col hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-4">
                 <feature.icon className={`size-8 ${feature.color}`} />
                <CardTitle className="font-headline">{t(feature.title, language)}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <CardDescription>{t(feature.description, language)}</CardDescription>
            </CardContent>
            <div className="p-6 pt-0">
               <Button asChild variant="outline" className="w-full">
                <Link href={feature.path}>
                  {t('open', language)} <ArrowRight className="ml-2" />
                </Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
