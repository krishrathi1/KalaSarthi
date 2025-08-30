'use client';

import { useState } from 'react';

export default function DebugSchemesPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAPI = async () => {
    setLoading(true);
    try {
      const mockArtisanProfile = {
        id: "artisan_123",
        name: "Rajesh Kumar",
        skills: ["pottery", "ceramics"],
        location: "Jaipur, Rajasthan",
        income: "₹50,000-1,00,000",
        businessType: "Handicraft manufacturing",
        experience: "5 years",
        contactInfo: {
          phone: "+91-9876543210",
          email: "rajesh@example.com",
          address: "123 Artisan Street, Jaipur"
        },
        documents: {
          aadhaar: "XXXX-XXXX-1234",
          pan: "ABCDE1234F"
        }
      };

      const response = await fetch('/api/govt-schemes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          artisanProfile: mockArtisanProfile,
          targetLanguage: 'hi',
          notificationMethods: ['push'],
          autoRegister: true,
          selectedSchemes: ['mudra'],
          lastChecked: new Date().toISOString()
        }),
      });

      const data = await response.json();
      setResult(data);
      console.log('API Response:', data);
    } catch (error) {
      console.error('API Error:', error);
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Government Schemes API</h1>

      <button
        onClick={testAPI}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test API'}
      </button>

      {result && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">API Response:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Console Logs:</h2>
        <p className="text-sm text-gray-600">
          Check the browser console and server terminal for detailed logs from the API workflow.
        </p>
      </div>
    </div>
  );
}