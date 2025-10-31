'use client';

import { WorkingVoiceChat } from '@/components/WorkingVoiceChat';

export default function HackathonVoicePage() {
    return (
        <div className="h-screen bg-gradient-to-br from-orange-50 to-red-50">
            <div className="container mx-auto h-full p-4">
                <div className="h-full max-w-4xl mx-auto">
                    <div className="mb-4 text-center">
                        <h1 className="text-3xl font-bold text-orange-800 mb-2">
                            🚀 HACKATHON READY - WORKING VOICE CHAT
                        </h1>
                        <p className="text-gray-600 text-lg">
                            ✅ REAL microphone button that WORKS! Click it and speak!
                        </p>
                    </div>
                    <div className="h-[calc(100%-120px)]">
                        <WorkingVoiceChat />
                    </div>
                </div>
            </div>
        </div>
    );
}