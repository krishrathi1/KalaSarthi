"use client";

import { EnhancedArtisanChat } from "@/components/enhanced-artisan-chat";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";

export default function EnhancedArtisanBuddyPage() {
    const { user } = useAuth();
    const { language } = useLanguage();

    return (
        <div className="container mx-auto p-4 h-[calc(100vh-4rem)]">
            <div className="h-full max-w-4xl mx-auto">
                <EnhancedArtisanChat />
            </div>
        </div>
    );
}