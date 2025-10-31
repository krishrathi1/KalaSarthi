'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Search,
  Filter,
  Star,
  Clock,
  DollarSign,
  FileText,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Users,
  Calendar,
  Phone,
  ExternalLink,
  Download,
  Eye,
  Heart,
  BookOpen,
  Target,
  Award,
  Zap
} from 'lucide-react';

interface EnhancedSchemeSahayakProps {
  artisanId?: string;
  className?: string;
}

export function EnhancedSchemeSahayak({ artisanId = 'demo_artisan', className = '' }: EnhancedSchemeSahayakProps) {
  const [activeTab, setActiveTab] = useState('discover');
  const [schemes, setSchemes] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filters and search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedState, setSelectedState] = useState('all');
  const [minBenefit, setMinBenefit] = useState('');
  const [maxBenefit, setMaxBenefit] = useState('');

  // Load data on component mount
  useEffect(() => {
    loadInitialData();
  }, []);

  // Initialize with mock data if no schemes are loaded
  useEffect(() => {
    if (schemes.length === 0 && !loading) {
      setSchemes([
        {
          id: 'mudra_shishu',
          title: 'Pradhan Mantri MUDRA Yojana - Shishu',
          description: 'Provides loans up to ₹50,000 for micro enterprises and small businesses',
          category: 'loan',
          benefits: {
            loanAmount: { min: 10000, max: 50000, currency: 'INR' }
          },
          application: {
            processingTime: { max: 15 },
            website: 'https://www.mudra.org.in/'
          },
          metadata: {
            tags: ['loan', 'micro-finance', 'no-collateral']
          }
        },
        {
          id: 'pmegp',
          title: 'Prime Minister Employment Generation Programme',
          description: 'Provides financial assistance for setting up new self-employment ventures',
          category: 'subsidy',
          benefits: {
            loanAmount: { min: 100000, max: 2500000, currency: 'INR' }
          },
          application: {
            processingTime: { max: 45 },
            website: 'https://kviconline.gov.in/'
          },
          metadata: {
            tags: ['subsidy', 'self-employment', 'training']
          }
        }
      ]);
    }
  }, [schemes.length, loading]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadSchemes(),
        loadRecommendations(),
        loadApplications(),
        loadAnalytics()
      ]);
    } catch (err) {
      setError('Failed to load scheme data');
    } finally {
      setLoading(false);
    }
  };

  const loadSchemes = async () => {
    try {
      const params = new URLSearchParams({
        action: 'list',
        limit: '20',
        offset: '0'
      });

      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedState !== 'all') params.append('state', selectedState);
      if (searchQuery) params.append('search', searchQuery);
      if (minBenefit) params.append('minBenefit', minBenefit);
      if (maxBenefit) params.append('maxBenefit', maxBenefit);

      const response = await fetch(`/api/enhanced-schemes?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setSchemes(result.data);
      }
    } catch (err) {
      console.error('Error loading schemes:', err);
    }
  }; 
 const loadRecommendations = async () => {
    try {
      const response = await fetch(`/api/enhanced-schemes?action=recommend&artisanId=${artisanId}&limit=5`);
      const result = await response.json();

      if (result.success) {
        setRecommendations(result.data);
      }
    } catch (err) {
      console.error('Error loading recommendations:', err);
    }
  };

  const loadApplications = async () => {
    try {
      const response = await fetch('/api/enhanced-schemes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_applications', artisanId })
      });
      const result = await response.json();

      if (result.success) {
        setApplications(result.data);
      }
    } catch (err) {
      console.error('Error loading applications:', err);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await fetch('/api/enhanced-schemes?action=analytics');
      const result = await response.json();

      if (result.success) {
        setAnalytics(result.data);
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
    }
  };

  const handleApplyToScheme = async (schemeId: string) => {
    try {
      const formData = {
        applicantName: 'Demo Artisan',
        businessType: 'handicraft',
        requestedAmount: 100000,
        purpose: 'Business expansion'
      };

      const response = await fetch('/api/enhanced-schemes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply',
          artisanId,
          schemeId,
          formData,
          documents: ['aadhaar', 'pan', 'bank_statement']
        })
      });

      const result = await response.json();

      if (result.success) {
        alert(`Application submitted successfully! Application Number: ${result.data.applicationNumber}`);
        loadApplications(); // Refresh applications
      } else {
        alert('Application failed: ' + result.error);
      }
    } catch (err) {
      alert('Error submitting application');
    }
  };

  const handleSearch = () => {
    loadSchemes();
  };

  const handleApplyToScheme = async (schemeId: string) => {
    try {
      const formData = {
        applicantName: 'Demo Artisan',
        businessType: 'handicraft',
        requestedAmount: 100000,
        purpose: 'Business expansion'
      };

      const response = await fetch('/api/enhanced-schemes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply',
          artisanId,
          schemeId,
          formData,
          documents: ['aadhaar', 'pan', 'bank_statement']
        })
      });

      const result = await response.json();

      if (result.success) {
        alert(`Application submitted successfully! Application Number: ${result.data.applicationNumber}`);
        loadApplications(); // Refresh applications
      } else {
        alert('Application failed: ' + result.error);
      }
    } catch (err) {
      alert('Error submitting application');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'under_review': return 'bg-blue-100 text-blue-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'submitted': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && schemes.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading enhanced scheme data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Enhanced Scheme Sahayak</h1>
          <p className="text-muted-foreground">
            Comprehensive government scheme discovery, eligibility assessment, and application management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            AI-Powered
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            Personalized
          </Badge>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {schemes.map((scheme) => (
          <Card key={scheme.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{scheme.title}</CardTitle>
                  <CardDescription className="mt-1">
                    {scheme.description}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="ml-2">
                  {scheme.category}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span>Up to ₹50,000</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span>15 days</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => handleApplyToScheme(scheme.id)}
                  className="flex-1"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Apply Now
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => window.open('https://mudra.org.in', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Learn More
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="discover">Discover</TabsTrigger>
          <TabsTrigger value="recommendations">For You</TabsTrigger>
          <TabsTrigger value="applications">My Applications</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="help">Help</TabsTrigger>
        </TabsList>

        {/* Discover Tab */}
        <TabsContent value="discover" className="space-y-6">
          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Discover Government Schemes
              </CardTitle>
              <CardDescription>
                Search and filter from {analytics?.totalSchemes || 'many'} available schemes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-2">
                  <Input
                    placeholder="Search schemes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="loan">Loans</SelectItem>
                    <SelectItem value="subsidy">Subsidies</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="cluster">Cluster Development</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedState} onValueChange={setSelectedState}>
                  <SelectTrigger>
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    <SelectItem value="Rajasthan">Rajasthan</SelectItem>
                    <SelectItem value="Gujarat">Gujarat</SelectItem>
                    <SelectItem value="Maharashtra">Maharashtra</SelectItem>
                    <SelectItem value="Karnataka">Karnataka</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleSearch} className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Search
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Min Benefit Amount</label>
                  <Input
                    type="number"
                    placeholder="₹ 0"
                    value={minBenefit}
                    onChange={(e) => setMinBenefit(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Max Benefit Amount</label>
                  <Input
                    type="number"
                    placeholder="₹ 10,00,000"
                    value={maxBenefit}
                    onChange={(e) => setMaxBenefit(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schemes List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {schemes.map((scheme) => (
              <Card key={scheme.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{scheme.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {scheme.description}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {scheme.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span>
                        {scheme.benefits.loanAmount 
                          ? `Up to ${formatCurrency(scheme.benefits.loanAmount.max)}`
                          : scheme.benefits.subsidyAmount
                          ? `Up to ${formatCurrency(scheme.benefits.subsidyAmount.max)}`
                          : 'Various benefits'
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span>{scheme.application.processingTime.max} days</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-600" />
                      <span>{scheme.metrics.totalBeneficiaries?.toLocaleString() || 'N/A'} beneficiaries</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-600" />
                      <span>{scheme.metrics.userRating || 'N/A'} rating</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {scheme.metadata.tags.slice(0, 3).map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleApplyToScheme(scheme.id)}
                      className="flex-1"
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Apply Now
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open(scheme.application.website, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Learn More
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>   
     {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Personalized Recommendations
              </CardTitle>
              <CardDescription>
                AI-powered scheme recommendations based on your profile and business needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recommendations.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading personalized recommendations...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recommendations.map((rec) => (
                    <Card key={rec.scheme.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{rec.scheme.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {rec.scheme.description}
                            </p>
                          </div>
                          <Badge className={getPriorityColor(rec.priority)}>
                            {rec.priority} priority
                          </Badge>
             