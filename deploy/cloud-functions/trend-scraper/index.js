const functions = require('firebase-functions');
const { trendAnalysisOrchestrator } = require('./trend-analysis-orchestrator');

// Cloud Function for trend analysis
exports.analyzeTrends = functions
  .runWith({
    memory: '2GB',
    timeoutSeconds: 540,
    maxInstances: 10
  })
  .https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to analyze trends.'
      );
    }

    const { artisanProfession, forceRefresh = false } = data;

    if (!artisanProfession || typeof artisanProfession !== 'string') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing or invalid artisanProfession parameter'
      );
    }

    try {
      console.log(`Analyzing trends for ${artisanProfession} by user ${context.auth.uid}`);

      const result = await trendAnalysisOrchestrator.analyzeTrendsForArtisan({
        uid: context.auth.uid,
        profession: artisanProfession,
        query: artisanProfession,
        timestamp: new Date()
      }, forceRefresh);

      return {
        success: true,
        trends: result.trends,
        insights: result.insights,
        cached: result.cached,
        dataSources: result.dataSources,
        generatedAt: result.generatedAt
      };

    } catch (error) {
      console.error('Trend analysis error:', error);

      throw new functions.https.HttpsError(
        'internal',
        'Failed to analyze trends. Please try again later.',
        error.message
      );
    }
  });

// Scheduled function for data cleanup
exports.cleanupOldData = functions
  .runWith({
    memory: '1GB',
    timeoutSeconds: 300
  })
  .pubsub.schedule('0 2 * * *') // Daily at 2 AM
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    console.log('Starting scheduled cleanup...');

    try {
      await trendAnalysisOrchestrator.cleanup();
      console.log('Cleanup completed successfully');
      return null;
    } catch (error) {
      console.error('Cleanup failed:', error);
      throw error;
    }
  });

// Health check function
exports.healthCheck = functions
  .https.onRequest(async (req, res) => {
    try {
      const health = await trendAnalysisOrchestrator.getSystemHealth();

      const statusCode = (health.bigquery && health.firestore && health.googleTrends) ? 200 : 503;

      res.status(statusCode).json({
        status: statusCode === 200 ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        services: health
      });
    } catch (error) {
      console.error('Health check failed:', error);
      res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  });