'use client';



export default function SimpleVoiceTestPage() {
    return (
        <div className="h-screen bg-gradient-to-br from-orange-50 to-red-50">
            <div className="container mx-auto h-full p-4">
                <div className="h-full max-w-4xl mx-auto">
                    <div className="mb-4 text-center">
                        <h1 className="text-2xl font-bold text-orange-800 mb-2">
                            🎤 Simple Voice Chat Test
                        </h1>
                        <p className="text-gray-600">
                            Working voice input and output - Click the mic button at bottom right!
                        </p>
                    </div>
                    <div className="h-[calc(100%-100px)]">
                    </div>
                </div>
            </div>
        </div>
    );
}