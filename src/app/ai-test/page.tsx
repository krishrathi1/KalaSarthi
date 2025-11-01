"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AITestRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.push('/simple-ai-test');
    }, [router]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Redirecting to AI test page...</p>
            </div>
        </div>
    );
}