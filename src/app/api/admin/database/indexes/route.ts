// /**
//  * Database Index Management API
//  * Allows creation, deletion, and monitoring of database indexes for intelligent matching
//  */

// import { NextRequest, NextResponse } from 'next/server';
// import { GoogleCloudLoggingService } from '@/lib/services/GoogleCloudLoggingService';

// interface IndexManagementResponse {
//   success: boolean;
//   data?: any;
//   error?: string;
// }

// // POST - Create all indexes
// export async function POST(request: NextRequest): Promise<NextResponse<IndexManagementResponse>> {
//   const startTime = Date.now();
  
//   try {
//     const loggingService = GoogleCloudLoggingService.getInstance();
    
//     console.log('Starting database index creation...');
    
//     const result = await indexManager.createAllIndexes();
    
//     // Log the operation
//     await loggingService.logPerformance({
//       operation: 'database_index_creation',
//       duration: result.executionTime,
//       success: result.success,
//       errorCode: result.success ? undefined : 'INDEX_CREATION_FAILED',
//       metadata: {
//         indexesCreated: result.indexesCreated.length,
//         errors: result.errors.length,
//         indexList: result.indexesCreated
//       }
//     });

//     if (!result.success) {
//       return NextResponse.json({
//         success: false,
//         error: `Index creation completed with errors: ${result.errors.join(', ')}`
//       }, { status: 207 }); // 207 Multi-Status
//     }

//     return NextResponse.json({
//       success: true,
//       data: {
//         message: 'All indexes created successfully',
//         indexesCreated: result.indexesCreated,
//         executionTime: result.executionTime
//       }
//     });

//   } catch (error) {
//     console.error('Error in index creation API:', error);
    
//     return NextResponse.json({
//       success: false,
//       error: 'Failed to create database indexes'
//     }, { status: 500 });
//   }
// }

// // GET - Get index statistics and validation
// export async function GET(request: NextRequest): Promise<NextResponse<IndexManagementResponse>> {
//   try {
//     const { searchParams } = new URL(request.url);
//     const action = searchParams.get('action') || 'stats';
    
//     const indexManager = DatabaseIndexManager.getInstance();
    
//     switch (action) {
//       case 'stats':
//         const stats = await indexManager.getIndexStats();
//         return NextResponse.json({
//           success: true,
//           data: {
//             indexStats: stats,
//             timestamp: new Date().toISOString()
//           }
//         });
        
//       case 'validate':
//         const validation = await indexManager.validateIndexes();
//         return NextResponse.json({
//           success: true,
//           data: {
//             validation,
//             timestamp: new Date().toISOString()
//           }
//         });
        
//       default:
//         return NextResponse.json({
//           success: false,
//           error: 'Invalid action. Use ?action=stats or ?action=validate'
//         }, { status: 400 });
//     }

//   } catch (error) {
//     console.error('Error in index stats API:', error);
    
//     return NextResponse.json({
//       success: false,
//       error: 'Failed to get index information'
//     }, { status: 500 });
//   }
// }

// // DELETE - Drop all indexes
// export async function DELETE(request: NextRequest): Promise<NextResponse<IndexManagementResponse>> {
//   try {
//     const indexManager = DatabaseIndexManager.getInstance();
//     const loggingService = GoogleCloudLoggingService.getInstance();
    
//     console.log('Starting database index deletion...');
    
//     const result = await indexManager.dropAllIndexes();
    
//     // Log the operation
//     await loggingService.logPerformance({
//       operation: 'database_index_deletion',
//       duration: result.executionTime,
//       success: result.success,
//       errorCode: result.success ? undefined : 'INDEX_DELETION_FAILED',
//       metadata: {
//         indexesDropped: result.indexesCreated.length, // reusing field name
//         errors: result.errors.length,
//         indexList: result.indexesCreated
//       }
//     });

//     if (!result.success) {
//       return NextResponse.json({
//         success: false,
//         error: `Index deletion completed with errors: ${result.errors.join(', ')}`
//       }, { status: 207 }); // 207 Multi-Status
//     }

//     return NextResponse.json({
//       success: true,
//       data: {
//         message: 'All indexes dropped successfully',
//         indexesDropped: result.indexesCreated,
//         executionTime: result.executionTime
//       }
//     });

//   } catch (error) {
//     console.error('Error in index deletion API:', error);
    
//     return NextResponse.json({
//       success: false,
//       error: 'Failed to drop database indexes'
//     }, { status: 500 });
//   }
// }