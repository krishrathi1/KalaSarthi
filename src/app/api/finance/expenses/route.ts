import { NextRequest, NextResponse } from 'next/server';
import { FirestoreService, COLLECTIONS, where, orderBy, query } from '@/lib/firestore';
import RealtimeFirestoreSyncService from '@/lib/services/RealtimeFirestoreSyncService';
import { Timestamp } from 'firebase/firestore';

// Expense record interface
interface ExpenseRecord {
  id?: string;
  artisanId: string;
  category: 'materials' | 'tools' | 'marketing' | 'shipping' | 'utilities' | 'rent' | 'other';
  description: string;
  amount: number;
  currency: string;
  date: Date;
  receiptUrl?: string;
  vendor?: string;
  isRecurring: boolean;
  recurringPeriod?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  tags: string[];
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'upi' | 'other';
  businessPurpose: string;
  taxDeductible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ExpenseQueryParams {
  artisanId?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  tags?: string;
  vendor?: string;
  paymentMethod?: string;
  taxDeductible?: 'true' | 'false';
  isRecurring?: 'true' | 'false';
  limit?: string;
  offset?: string;
  sortBy?: 'date' | 'amount' | 'category';
  sortOrder?: 'asc' | 'desc';
  realtime?: 'true' | 'false';
}

interface ExpenseResponse {
  success: boolean;
  data: ExpenseRecord[];
  summary: {
    totalExpenses: number;
    totalAmount: number;
    averageExpense: number;
    categoryBreakdown: Record<string, { count: number; amount: number }>;
    monthlyTrend: Array<{
      month: string;
      amount: number;
      count: number;
    }>;
    taxDeductibleAmount: number;
    recurringExpensesAmount: number;
  };
  metadata: {
    totalCount: number;
    page: number;
    limit: number;
    hasMore: boolean;
    lastUpdated: Date;
    dataSource: 'firestore' | 'cache' | 'mock';
    isRealtime: boolean;
  };
  error?: string;
}

interface ProfitCalculationResponse {
  success: boolean;
  data: {
    period: string;
    startDate: Date;
    endDate: Date;
    totalRevenue: number;
    totalExpenses: number;
    grossProfit: number;
    netProfit: number;
    profitMargin: number;
    expenseRatio: number;
    breakdown: {
      revenue: {
        sales: number;
        other: number;
      };
      expenses: {
        materials: number;
        tools: number;
        marketing: number;
        shipping: number;
        utilities: number;
        rent: number;
        other: number;
      };
    };
  };
  metadata: {
    lastUpdated: Date;
    dataSource: 'firestore' | 'cache';
    calculationMethod: 'real-time' | 'aggregated';
  };
  error?: string;
}

/**
 * GET method for retrieving expense records with filtering and real-time capabilities
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params: ExpenseQueryParams = {
      artisanId: searchParams.get('artisanId') || undefined,
      category: searchParams.get('category') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      tags: searchParams.get('tags') || undefined,
      vendor: searchParams.get('vendor') || undefined,
      paymentMethod: searchParams.get('paymentMethod') || undefined,
      taxDeductible: (searchParams.get('taxDeductible') as any) || undefined,
      isRecurring: (searchParams.get('isRecurring') as any) || undefined,
      limit: searchParams.get('limit') || '50',
      offset: searchParams.get('offset') || '0',
      sortBy: (searchParams.get('sortBy') as any) || 'date',
      sortOrder: (searchParams.get('sortOrder') as any) || 'desc',
      realtime: (searchParams.get('realtime') as any) || 'false',
    };

    console.log('💰 Enhanced Finance Expenses API called with params:', params);

    // Special endpoint for profit calculation
    if (searchParams.get('action') === 'calculate_profit') {
      return await handleProfitCalculation(params);
    }

    let expenses: ExpenseRecord[] = [];
    let dataSource: 'firestore' | 'cache' | 'mock' = 'mock';

    // Initialize real-time service if needed
    const syncService = RealtimeFirestoreSyncService.getInstance();

    if (params.realtime === 'true' && params.artisanId) {
      console.log('🔄 Using real-time Firestore expense data');
      
      try {
        // Get cached expenses from real-time service
        const cachedExpenses = syncService.getCachedExpenses(params.artisanId);
        if (cachedExpenses.length > 0) {
          expenses = cachedExpenses;
          dataSource = 'cache';
        }
      } catch (realtimeError) {
        console.warn('⚠️ Real-time expense data fetch failed:', realtimeError);
      }
    }

    // Fallback to regular Firestore query
    if (expenses.length === 0) {
      console.log('📊 Fetching expenses from Firestore');
      
      try {
        // Build Firestore query constraints
        const constraints = [];

        if (params.artisanId) {
          constraints.push(where('artisanId', '==', params.artisanId));
        }

        if (params.category) {
          constraints.push(where('category', '==', params.category));
        }

        if (params.vendor) {
          constraints.push(where('vendor', '==', params.vendor));
        }

        if (params.paymentMethod) {
          constraints.push(where('paymentMethod', '==', params.paymentMethod));
        }

        if (params.taxDeductible === 'true') {
          constraints.push(where('taxDeductible', '==', true));
        } else if (params.taxDeductible === 'false') {
          constraints.push(where('taxDeductible', '==', false));
        }

        if (params.isRecurring === 'true') {
          constraints.push(where('isRecurring', '==', true));
        } else if (params.isRecurring === 'false') {
          constraints.push(where('isRecurring', '==', false));
        }

        // Add sorting
        const sortField = params.sortBy === 'date' ? 'date' : 
                         params.sortBy === 'amount' ? 'amount' : 'date';
        const sortDirection = params.sortOrder === 'asc' ? 'asc' : 'desc';
        constraints.push(orderBy(sortField, sortDirection));

        let firestoreExpenses = await FirestoreService.query<ExpenseRecord>(
          COLLECTIONS.EXPENSES,
          constraints
        );

        // Apply client-side filters for complex queries
        if (params.startDate || params.endDate) {
          const startDate = params.startDate ? new Date(params.startDate) : new Date(0);
          const endDate = params.endDate ? new Date(params.endDate) : new Date();
          
          firestoreExpenses = firestoreExpenses.filter(expense => {
            const expenseDate = expense.date instanceof Date ? expense.date : new Date(expense.date);
            return expenseDate >= startDate && expenseDate <= endDate;
          });
        }

        if (params.tags) {
          const searchTags = params.tags.split(',').map(tag => tag.trim().toLowerCase());
          firestoreExpenses = firestoreExpenses.filter(expense =>
            expense.tags.some(tag => 
              searchTags.some(searchTag => tag.toLowerCase().includes(searchTag))
            )
          );
        }

        // Apply pagination
        const limit = parseInt(params.limit || '50');
        const offset = parseInt(params.offset || '0');
        expenses = firestoreExpenses.slice(offset, offset + limit);

        if (expenses.length > 0) {
          dataSource = 'firestore';
        }

      } catch (firestoreError) {
        console.warn('⚠️ Firestore expense query failed, using mock data:', firestoreError);
      }
    }

    // Final fallback to mock data
    if (expenses.length === 0) {
      console.log('📊 No expenses found, generating mock data');
      expenses = generateMockExpenseData(params.artisanId || 'mock_artisan');
      dataSource = 'mock';
    }

    // Calculate summary statistics
    const summary = calculateExpenseSummary(expenses);

    // Prepare metadata
    const limit = parseInt(params.limit || '50');
    const offset = parseInt(params.offset || '0');
    const totalCount = expenses.length + offset; // Approximation for pagination

    const response: ExpenseResponse = {
      success: true,
      data: expenses,
      summary,
      metadata: {
        totalCount,
        page: Math.floor(offset / limit) + 1,
        limit,
        hasMore: expenses.length === limit,
        lastUpdated: new Date(),
        dataSource,
        isRealtime: params.realtime === 'true',
      },
    };

    console.log(`✅ Enhanced Finance Expenses API: Retrieved ${expenses.length} expenses from ${dataSource}`);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Enhanced Finance Expenses API error:', error);
    return NextResponse.json(
      {
        success: false,
        data: [],
        summary: {
          totalExpenses: 0,
          totalAmount: 0,
          averageExpense: 0,
          categoryBreakdown: {},
          monthlyTrend: [],
          taxDeductibleAmount: 0,
          recurringExpensesAmount: 0,
        },
        metadata: {
          totalCount: 0,
          page: 1,
          limit: 50,
          hasMore: false,
          lastUpdated: new Date(),
          dataSource: 'mock',
          isRealtime: false,
        },
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      } as ExpenseResponse,
      { status: 500 }
    );
  }
}

/**
 * POST method for creating and updating expense records with real-time sync
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📝 Enhanced Finance Expenses API POST called with:', body);

    const { action, data } = body;
    const syncService = RealtimeFirestoreSyncService.getInstance();

    switch (action) {
      case 'create_expense':
        // Create a new expense record
        if (!data.artisanId || !data.amount || !data.category || !data.description) {
          return NextResponse.json({
            success: false,
            error: 'Missing required fields: artisanId, amount, category, description',
          }, { status: 400 });
        }

        const expenseRecord: ExpenseRecord = {
          artisanId: data.artisanId,
          category: data.category,
          description: data.description,
          amount: parseFloat(data.amount),
          currency: data.currency || 'INR',
          date: data.date ? new Date(data.date) : new Date(),
          receiptUrl: data.receiptUrl,
          vendor: data.vendor,
          isRecurring: data.isRecurring || false,
          recurringPeriod: data.recurringPeriod,
          tags: Array.isArray(data.tags) ? data.tags : (data.tags ? [data.tags] : []),
          paymentMethod: data.paymentMethod || 'cash',
          businessPurpose: data.businessPurpose || data.description,
          taxDeductible: data.taxDeductible || false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Store in Firestore
        const expenseId = await FirestoreService.create(COLLECTIONS.EXPENSES, expenseRecord);
        expenseRecord.id = expenseId;

        // Sync to real-time service
        await syncService.syncExpense(expenseRecord);

        return NextResponse.json({
          success: true,
          message: 'Expense record created successfully',
          expenseId,
          data: expenseRecord,
          timestamp: new Date(),
        });

      case 'update_expense':
        // Update an existing expense record
        if (!data.id || !data.artisanId) {
          return NextResponse.json({
            success: false,
            error: 'Missing required fields: id, artisanId',
          }, { status: 400 });
        }

        const updateData = {
          ...data,
          updatedAt: new Date(),
        };

        // Remove id from update data
        delete updateData.id;

        await FirestoreService.update(COLLECTIONS.EXPENSES, data.id, updateData);

        // Get updated record for sync
        const updatedExpense = await FirestoreService.get<ExpenseRecord>(COLLECTIONS.EXPENSES, data.id);
        if (updatedExpense) {
          await syncService.syncExpense(updatedExpense);
        }

        return NextResponse.json({
          success: true,
          message: 'Expense record updated successfully',
          expenseId: data.id,
          timestamp: new Date(),
        });

      case 'delete_expense':
        // Delete an expense record
        if (!data.id || !data.artisanId) {
          return NextResponse.json({
            success: false,
            error: 'Missing required fields: id, artisanId',
          }, { status: 400 });
        }

        await FirestoreService.delete(COLLECTIONS.EXPENSES, data.id);

        // Remove from real-time cache
        await syncService.removeExpenseFromCache(data.artisanId, data.id);

        return NextResponse.json({
          success: true,
          message: 'Expense record deleted successfully',
          expenseId: data.id,
          timestamp: new Date(),
        });

      case 'bulk_create':
        // Create multiple expense records
        if (!Array.isArray(data) || data.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'Data must be an array of expense records',
          }, { status: 400 });
        }

        const results = [];
        for (const expenseData of data) {
          try {
            const expense: ExpenseRecord = {
              artisanId: expenseData.artisanId,
              category: expenseData.category,
              description: expenseData.description,
              amount: parseFloat(expenseData.amount),
              currency: expenseData.currency || 'INR',
              date: expenseData.date ? new Date(expenseData.date) : new Date(),
              receiptUrl: expenseData.receiptUrl,
              vendor: expenseData.vendor,
              isRecurring: expenseData.isRecurring || false,
              recurringPeriod: expenseData.recurringPeriod,
              tags: Array.isArray(expenseData.tags) ? expenseData.tags : (expenseData.tags ? [expenseData.tags] : []),
              paymentMethod: expenseData.paymentMethod || 'cash',
              businessPurpose: expenseData.businessPurpose || expenseData.description,
              taxDeductible: expenseData.taxDeductible || false,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            const id = await FirestoreService.create(COLLECTIONS.EXPENSES, expense);
            expense.id = id;
            await syncService.syncExpense(expense);
            
            results.push({ success: true, expenseId: id });
          } catch (error) {
            results.push({ 
              success: false, 
              error: error instanceof Error ? error.message : 'Unknown error',
              data: expenseData 
            });
          }
        }

        return NextResponse.json({
          success: true,
          message: `Processed ${results.length} expense records`,
          results,
          timestamp: new Date(),
        });

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}. Supported actions: create_expense, update_expense, delete_expense, bulk_create`,
        }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Enhanced Finance Expenses API POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * Handle profit calculation with real-time data integration
 */
async function handleProfitCalculation(params: ExpenseQueryParams): Promise<NextResponse> {
  try {
    console.log('💹 Calculating profit with real-time data integration');

    if (!params.artisanId) {
      return NextResponse.json({
        success: false,
        error: 'artisanId is required for profit calculation',
      }, { status: 400 });
    }

    // Calculate date range
    const endDate = params.endDate ? new Date(params.endDate) : new Date();
    const startDate = params.startDate ? new Date(params.startDate) : 
      new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days

    // Get sales data from sales API
    const salesResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/finance/sales?artisanId=${params.artisanId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&realtime=true`);
    const salesData = await salesResponse.json();

    // Get expense data
    const expenseConstraints = [
      where('artisanId', '==', params.artisanId),
      orderBy('date', 'desc')
    ];

    let expenses = await FirestoreService.query<ExpenseRecord>(
      COLLECTIONS.EXPENSES,
      expenseConstraints
    );

    // Filter expenses by date range
    expenses = expenses.filter(expense => {
      const expenseDate = expense.date instanceof Date ? expense.date : new Date(expense.date);
      return expenseDate >= startDate && expenseDate <= endDate;
    });

    // Calculate totals
    const totalRevenue = salesData.success ? salesData.summary.totalRevenue : 0;
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const grossProfit = totalRevenue - totalExpenses;
    const netProfit = grossProfit; // Simplified - could include taxes, etc.
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0;

    // Calculate expense breakdown
    const expenseBreakdown = expenses.reduce((breakdown, expense) => {
      breakdown[expense.category] = (breakdown[expense.category] || 0) + expense.amount;
      return breakdown;
    }, {} as Record<string, number>);

    const response: ProfitCalculationResponse = {
      success: true,
      data: {
        period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
        startDate,
        endDate,
        totalRevenue,
        totalExpenses,
        grossProfit,
        netProfit,
        profitMargin,
        expenseRatio,
        breakdown: {
          revenue: {
            sales: totalRevenue,
            other: 0,
          },
          expenses: {
            materials: expenseBreakdown.materials || 0,
            tools: expenseBreakdown.tools || 0,
            marketing: expenseBreakdown.marketing || 0,
            shipping: expenseBreakdown.shipping || 0,
            utilities: expenseBreakdown.utilities || 0,
            rent: expenseBreakdown.rent || 0,
            other: expenseBreakdown.other || 0,
          },
        },
      },
      metadata: {
        lastUpdated: new Date(),
        dataSource: 'firestore',
        calculationMethod: 'real-time',
      },
    };

    console.log(`✅ Profit calculation completed: Revenue: ₹${totalRevenue}, Expenses: ₹${totalExpenses}, Profit: ₹${netProfit}`);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Profit calculation error:', error);
    return NextResponse.json(
      {
        success: false,
        data: {
          period: '',
          startDate: new Date(),
          endDate: new Date(),
          totalRevenue: 0,
          totalExpenses: 0,
          grossProfit: 0,
          netProfit: 0,
          profitMargin: 0,
          expenseRatio: 0,
          breakdown: {
            revenue: { sales: 0, other: 0 },
            expenses: {
              materials: 0, tools: 0, marketing: 0, shipping: 0,
              utilities: 0, rent: 0, other: 0,
            },
          },
        },
        metadata: {
          lastUpdated: new Date(),
          dataSource: 'firestore',
          calculationMethod: 'real-time',
        },
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      } as ProfitCalculationResponse,
      { status: 500 }
    );
  }
}

/**
 * Calculate comprehensive expense summary statistics
 */
function calculateExpenseSummary(expenses: ExpenseRecord[]) {
  const totalExpenses = expenses.length;
  const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const averageExpense = totalExpenses > 0 ? totalAmount / totalExpenses : 0;

  // Category breakdown
  const categoryBreakdown = expenses.reduce((breakdown, expense) => {
    if (!breakdown[expense.category]) {
      breakdown[expense.category] = { count: 0, amount: 0 };
    }
    breakdown[expense.category].count++;
    breakdown[expense.category].amount += expense.amount;
    return breakdown;
  }, {} as Record<string, { count: number; amount: number }>);

  // Monthly trend (last 12 months)
  const monthlyTrend = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    
    const monthExpenses = expenses.filter(expense => {
      const expenseDate = expense.date instanceof Date ? expense.date : new Date(expense.date);
      return expenseDate >= monthStart && expenseDate <= monthEnd;
    });

    monthlyTrend.push({
      month: monthStart.toISOString().substring(0, 7), // YYYY-MM format
      amount: monthExpenses.reduce((sum, expense) => sum + expense.amount, 0),
      count: monthExpenses.length,
    });
  }

  // Tax deductible amount
  const taxDeductibleAmount = expenses
    .filter(expense => expense.taxDeductible)
    .reduce((sum, expense) => sum + expense.amount, 0);

  // Recurring expenses amount
  const recurringExpensesAmount = expenses
    .filter(expense => expense.isRecurring)
    .reduce((sum, expense) => sum + expense.amount, 0);

  return {
    totalExpenses,
    totalAmount,
    averageExpense,
    categoryBreakdown,
    monthlyTrend,
    taxDeductibleAmount,
    recurringExpensesAmount,
  };
}

/**
 * Generate mock expense data for development/demo
 */
function generateMockExpenseData(artisanId: string): ExpenseRecord[] {
  const categories: ExpenseRecord['category'][] = ['materials', 'tools', 'marketing', 'shipping', 'utilities', 'rent', 'other'];
  const vendors = ['Local Supplier', 'Online Store', 'Hardware Shop', 'Utility Company', 'Landlord', 'Marketing Agency'];
  const paymentMethods: ExpenseRecord['paymentMethod'][] = ['cash', 'card', 'bank_transfer', 'upi'];

  const expenses: ExpenseRecord[] = [];
  const now = new Date();

  for (let i = 0; i < 30; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - Math.floor(Math.random() * 90)); // Random date in last 90 days

    const category = categories[Math.floor(Math.random() * categories.length)];
    const amount = Math.round((Math.random() * 5000 + 500) * 100) / 100; // ₹500 - ₹5500

    expenses.push({
      id: `mock_expense_${i}`,
      artisanId,
      category,
      description: `${category.charAt(0).toUpperCase() + category.slice(1)} expense for business`,
      amount,
      currency: 'INR',
      date,
      vendor: vendors[Math.floor(Math.random() * vendors.length)],
      isRecurring: Math.random() > 0.8, // 20% chance of being recurring
      recurringPeriod: Math.random() > 0.5 ? 'monthly' : 'weekly',
      tags: [category, 'business'],
      paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
      businessPurpose: `Business ${category} expense`,
      taxDeductible: Math.random() > 0.3, // 70% chance of being tax deductible
      createdAt: date,
      updatedAt: date,
    });
  }

  return expenses.sort((a, b) => b.date.getTime() - a.date.getTime());
}