/**
 * Example usage of AI Profile Analysis and Feature Extraction components
 * This demonstrates how to use the ProfileAnalyzer, FeatureEngineeringPipeline,
 * and DataPreprocessor together
 */

import { 
  ProfileAnalyzer, 
  FeatureEngineeringPipeline, 
  DataPreprocessor 
} from './index';
import { ArtisanProfile, GovernmentScheme } from '@/lib/types/scheme-sahayak';

/**
 * Example: Process an artisan profile for ML model input
 */
export async function processArtisanProfile(
  profile: ArtisanProfile,
  schemes: GovernmentScheme[],
  targetScheme?: GovernmentScheme
) {
  // Initialize components
  const preprocessor = new DataPreprocessor({
    handleMissingValues: 'median',
    handleOutliers: 'clip',
    validateSchema: true
  });
  
  const analyzer = new ProfileAnalyzer();
  
  const pipeline = new FeatureEngineeringPipeline({
    scalingMethod: 'minmax',
    interactionDepth: 2
  });

  try {
    // Step 1: Assess data quality
    console.log('Assessing data quality...');
    const quality = await preprocessor.assessDataQuality(profile);
    console.log(`Quality Score: ${(quality.overallScore * 100).toFixed(1)}%`);
    
    if (quality.issues.length > 0) {
      console.log(`Found ${quality.issues.length} data quality issues:`);
      quality.issues.forEach(issue => {
        console.log(`  - ${issue.field}: ${issue.description} (${issue.severity})`);
      });
    }

    // Step 2: Clean and preprocess profile
    console.log('\nPreprocessing profile...');
    const cleanedProfile = await preprocessor.preprocessProfile(profile);

    // Step 3: Extract base features
    console.log('Extracting features...');
    const extractedFeatures = await analyzer.extractFeatures(cleanedProfile);
    console.log(`Extracted ${Object.keys(extractedFeatures).length} features`);

    // Step 4: Calculate feature importance
    const importance = analyzer.calculateFeatureImportance(extractedFeatures);
    const topFeatures = Object.entries(importance)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, score]) => ({ name, score }));
    
    console.log('\nTop 5 most important features:');
    topFeatures.forEach(({ name, score }) => {
      console.log(`  - ${name}: ${score.toFixed(3)}`);
    });

    // Step 5: Engineer features for ML model
    console.log('\nEngineering features...');
    const engineeredFeatures = await pipeline.engineerFeatures(
      cleanedProfile,
      schemes,
      targetScheme
    );

    console.log(`Generated feature sets:`);
    console.log(`  - Profile features: ${engineeredFeatures.profileFeatures.length}`);
    console.log(`  - Scheme compatibility: ${engineeredFeatures.schemeCompatibilityFeatures.length}`);
    console.log(`  - Interaction features: ${engineeredFeatures.interactionFeatures.length}`);
    console.log(`  - Temporal features: ${engineeredFeatures.temporalFeatures.length}`);
    console.log(`  - Contextual features: ${engineeredFeatures.contextualFeatures.length}`);
    console.log(`  - Total features: ${engineeredFeatures.featureNames.length}`);

    // Step 6: Prepare for ML model input
    const allFeatures = [
      ...engineeredFeatures.profileFeatures,
      ...engineeredFeatures.schemeCompatibilityFeatures,
      ...engineeredFeatures.interactionFeatures,
      ...engineeredFeatures.temporalFeatures,
      ...engineeredFeatures.contextualFeatures
    ];

    return {
      success: true,
      profile: cleanedProfile,
      quality,
      extractedFeatures,
      engineeredFeatures,
      mlInput: allFeatures,
      featureNames: engineeredFeatures.featureNames,
      featureImportance: engineeredFeatures.featureImportance
    };

  } catch (error) {
    console.error('Error processing artisan profile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Example: Batch process multiple profiles
 */
export async function batchProcessProfiles(
  profiles: ArtisanProfile[],
  schemes: GovernmentScheme[]
) {
  const preprocessor = new DataPreprocessor();
  const analyzer = new ProfileAnalyzer();
  const pipeline = new FeatureEngineeringPipeline();

  console.log(`Processing ${profiles.length} profiles...`);

  // Step 1: Batch preprocess all profiles
  const cleanedProfiles = await preprocessor.batchPreprocessProfiles(profiles);
  console.log(`Cleaned ${cleanedProfiles.length} profiles`);

  // Step 2: Update pipeline statistics from all profiles
  await pipeline.updateStatistics(cleanedProfiles, schemes);
  console.log('Updated feature statistics');

  // Step 3: Process each profile
  const results = [];
  for (let i = 0; i < cleanedProfiles.length; i++) {
    const profile = cleanedProfiles[i];
    
    try {
      const features = await analyzer.extractFeatures(profile);
      const engineered = await pipeline.engineerFeatures(profile, schemes);
      
      results.push({
        profileId: profile.id,
        success: true,
        features,
        engineered
      });
      
      if ((i + 1) % 10 === 0) {
        console.log(`Processed ${i + 1}/${cleanedProfiles.length} profiles`);
      }
    } catch (error) {
      console.error(`Error processing profile ${profile.id}:`, error);
      results.push({
        profileId: profile.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  const successCount = results.filter(r => r.success).length;
  console.log(`\nCompleted: ${successCount}/${profiles.length} profiles processed successfully`);

  return results;
}

/**
 * Example: Monitor data quality across profiles
 */
export async function monitorDataQuality(profiles: ArtisanProfile[]) {
  const preprocessor = new DataPreprocessor();

  console.log(`Assessing data quality for ${profiles.length} profiles...`);

  const qualityResults = [];
  let totalScore = 0;
  const issuesByType: Record<string, number> = {};
  const issuesBySeverity: Record<string, number> = {};

  for (const profile of profiles) {
    const quality = await preprocessor.assessDataQuality(profile);
    qualityResults.push({
      profileId: profile.id,
      quality
    });

    totalScore += quality.overallScore;

    // Aggregate issues
    quality.issues.forEach(issue => {
      issuesByType[issue.issueType] = (issuesByType[issue.issueType] || 0) + 1;
      issuesBySeverity[issue.severity] = (issuesBySeverity[issue.severity] || 0) + 1;
    });
  }

  const averageScore = totalScore / profiles.length;

  console.log('\n=== Data Quality Report ===');
  console.log(`Average Quality Score: ${(averageScore * 100).toFixed(1)}%`);
  console.log(`\nProfiles by quality:`);
  console.log(`  - Excellent (>90%): ${qualityResults.filter(r => r.quality.overallScore > 0.9).length}`);
  console.log(`  - Good (70-90%): ${qualityResults.filter(r => r.quality.overallScore > 0.7 && r.quality.overallScore <= 0.9).length}`);
  console.log(`  - Fair (50-70%): ${qualityResults.filter(r => r.quality.overallScore > 0.5 && r.quality.overallScore <= 0.7).length}`);
  console.log(`  - Poor (<50%): ${qualityResults.filter(r => r.quality.overallScore <= 0.5).length}`);

  console.log(`\nIssues by type:`);
  Object.entries(issuesByType).forEach(([type, count]) => {
    console.log(`  - ${type}: ${count}`);
  });

  console.log(`\nIssues by severity:`);
  Object.entries(issuesBySeverity).forEach(([severity, count]) => {
    console.log(`  - ${severity}: ${count}`);
  });

  return {
    averageScore,
    qualityResults,
    issuesByType,
    issuesBySeverity
  };
}

/**
 * Example: Feature importance analysis
 */
export async function analyzeFeatureImportance(profiles: ArtisanProfile[]) {
  const analyzer = new ProfileAnalyzer();

  console.log(`Analyzing feature importance across ${profiles.length} profiles...`);

  const allImportance: Record<string, number[]> = {};

  for (const profile of profiles) {
    const features = await analyzer.extractFeatures(profile);
    const importance = analyzer.calculateFeatureImportance(features);

    Object.entries(importance).forEach(([feature, score]) => {
      if (!allImportance[feature]) {
        allImportance[feature] = [];
      }
      allImportance[feature].push(score);
    });
  }

  // Calculate average importance for each feature
  const avgImportance = Object.entries(allImportance).map(([feature, scores]) => ({
    feature,
    avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
    minScore: Math.min(...scores),
    maxScore: Math.max(...scores),
    stdDev: Math.sqrt(
      scores.reduce((acc, score) => {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        return acc + Math.pow(score - avg, 2);
      }, 0) / scores.length
    )
  }));

  // Sort by average importance
  avgImportance.sort((a, b) => b.avgScore - a.avgScore);

  console.log('\n=== Top 10 Most Important Features ===');
  avgImportance.slice(0, 10).forEach((item, index) => {
    console.log(`${index + 1}. ${item.feature}`);
    console.log(`   Avg: ${item.avgScore.toFixed(3)}, Range: [${item.minScore.toFixed(3)}, ${item.maxScore.toFixed(3)}], StdDev: ${item.stdDev.toFixed(3)}`);
  });

  return avgImportance;
}
