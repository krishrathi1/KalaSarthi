"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/context/language-context";
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";

interface TestResult {
    success: boolean;
    error?: string;
    response?: string;
    apiKeyExists: boolean;
    details?: any;
    testType?: string;
    totalRequests?: number;
    successfulRequests?: number;
    failedRequests?: number;
    averageResponseTime?: number;
    errors?: string[];
}

export default function DiagnosticsPage() {
    const { language } = useLanguage();
    const [testResult, setTestResult] = useState<TestResult | null>(null);
    const [loading, setLoading] = useState(false);

    const runSingleTest = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/test-gemini?type=single');
            const result = await response.json();
            setTestResult(result);
        } catch (error) {
            setTestResult({
                success: false,
                error: 'Failed to run test',
                apiKeyExists: false
            });
        } finally {
            setLoading(false);
        }
    };

    const runMultipleTests = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/test-gemini?type=multiple&count=5');
            const result = await response.json();
            setTestResult(result);
        } catch (error) {
            setTestResult({
                success: false,
                error: 'Failed to run tests',
                apiKeyExists: false
            });
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (success: boolean) => {
        if (success) {
            return <CheckCircle className="h-5 w-5 text-green-500" />;
        } else {
            return <XCircle className="h-5 w-5 text-red-500" />;
        }
    };

    const getStatusBadge = (success: boolean) => {
        if (success) {
            return <Badge variant="default" className="bg-green-500">Success</Badge>;
        } else {
            return <Badge variant="destructive">Failed</Badge>;
        }
    };

    return (
        <div className="container mx-auto p-6">
            <div className="mb-6">
                <Link href="/enhanced-artisan-buddy">
                    <Button variant="ghost" className="mb-4">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        {language === 'hi' ? 'चैट पर वापस जाएं' : 'Back to Chat'}
                    </Button>
                </Link>
            </div>

            <div className="max-w-4xl mx-auto space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>
                            {language === 'hi' ? 'Gemini API डायग्नोस्टिक्स' : 'Gemini API Diagnostics'}
                        </CardTitle>
                        <CardDescription>
                            {language === 'hi'
                                ? 'Gemini API की समस्याओं का निदान करें और कनेक्शन टेस्ट करें'
                                : 'Diagnose Gemini API issues and test connectivity'
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-4 mb-6">
                            <Button
                                onClick={runSingleTest}
                                disabled={loading}
                                className="flex items-center gap-2"
                            >
                                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                                {language === 'hi' ? 'सिंगल टेस्ट' : 'Single Test'}
                            </Button>

                            <Button
                                onClick={runMultipleTests}
                                disabled={loading}
                                variant="outline"
                                className="flex items-center gap-2"
                            >
                                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                                {language === 'hi' ? 'मल्टिपल टेस्ट (5x)' : 'Multiple Tests (5x)'}
                            </Button>
                        </div>

                        {testResult && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    {getStatusIcon(testResult.success)}
                                    <h3 className="text-lg font-semibold">
                                        {language === 'hi' ? 'टेस्ट रिजल्ट' : 'Test Results'}
                                    </h3>
                                    {getStatusBadge(testResult.success)}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm">
                                                {language === 'hi' ? 'API की स्थिति' : 'API Status'}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-0">
                                            <div className="space-y-2">
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-muted-foreground">
                                                        {language === 'hi' ? 'API Key मौजूद:' : 'API Key Exists:'}
                                                    </span>
                                                    <span className={testResult.apiKeyExists ? 'text-green-600' : 'text-red-600'}>
                                                        {testResult.apiKeyExists ? '✓' : '✗'}
                                                    </span>
                                                </div>

                                                {testResult.testType === 'multiple' && (
                                                    <>
                                                        <div className="flex justify-between">
                                                            <span className="text-sm text-muted-foreground">
                                                                {language === 'hi' ? 'कुल रिक्वेस्ट्स:' : 'Total Requests:'}
                                                            </span>
                                                            <span>{testResult.totalRequests}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-sm text-muted-foreground">
                                                                {language === 'hi' ? 'सफल:' : 'Successful:'}
                                                            </span>
                                                            <span className="text-green-600">{testResult.successfulRequests}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-sm text-muted-foreground">
                                                                {language === 'hi' ? 'असफल:' : 'Failed:'}
                                                            </span>
                                                            <span className="text-red-600">{testResult.failedRequests}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-sm text-muted-foreground">
                                                                {language === 'hi' ? 'औसत समय:' : 'Avg Response Time:'}
                                                            </span>
                                                            <span>{Math.round(testResult.averageResponseTime || 0)}ms</span>
                                                        </div>
                                                    </>
                                                )}

                                                {testResult.details?.responseTime && (
                                                    <div className="flex justify-between">
                                                        <span className="text-sm text-muted-foreground">
                                                            {language === 'hi' ? 'रिस्पांस टाइम:' : 'Response Time:'}
                                                        </span>
                                                        <span>{testResult.details.responseTime}ms</span>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {testResult.error && (
                                        <Card>
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-sm text-red-600">
                                                    {language === 'hi' ? 'एरर डिटेल्स' : 'Error Details'}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-0">
                                                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                                                    {testResult.error}
                                                </div>
                                                {testResult.details && (
                                                    <div className="mt-2 text-xs text-muted-foreground">
                                                        <pre className="whitespace-pre-wrap">
                                                            {JSON.stringify(testResult.details, null, 2)}
                                                        </pre>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>

                                {testResult.response && (
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm">
                                                {language === 'hi' ? 'API रिस्पांस' : 'API Response'}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-0">
                                            <div className="text-sm bg-green-50 p-3 rounded-md">
                                                {testResult.response}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {testResult.errors && testResult.errors.length > 0 && (
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm text-red-600">
                                                {language === 'hi' ? 'एरर लॉग' : 'Error Log'}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-0">
                                            <div className="space-y-2">
                                                {testResult.errors.map((error, index) => (
                                                    <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded-md">
                                                        {error}
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">
                            {language === 'hi' ? 'सामान्य समस्याएं और समाधान' : 'Common Issues and Solutions'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                                <div>
                                    <h4 className="font-semibold text-sm">
                                        {language === 'hi' ? 'API Key Invalid' : 'API Key Invalid'}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        {language === 'hi'
                                            ? 'API key गलत है या expire हो गई है। नई API key generate करें।'
                                            : 'API key is incorrect or expired. Generate a new API key.'
                                        }
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                                <div>
                                    <h4 className="font-semibold text-sm">
                                        {language === 'hi' ? 'Rate Limit Exceeded' : 'Rate Limit Exceeded'}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        {language === 'hi'
                                            ? 'बहुत सारे requests भेजे गए हैं। कुछ समय बाद try करें।'
                                            : 'Too many requests sent. Wait a moment and try again.'
                                        }
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                                <div>
                                    <h4 className="font-semibold text-sm">
                                        {language === 'hi' ? 'Quota Exceeded' : 'Quota Exceeded'}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        {language === 'hi'
                                            ? 'Monthly quota खत्म हो गया है। Billing check करें या upgrade करें।'
                                            : 'Monthly quota exhausted. Check billing or upgrade your plan.'
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}