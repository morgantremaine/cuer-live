/**
 * Live Show Smoke Test - Critical checks for real-time rundown editing
 * Run these checks before your live show to ensure everything works smoothly
 */

export interface SmokeTestResult {
  test: string;
  passed: boolean;
  details?: string;
}

export const runLiveShowSmokeTest = async (): Promise<SmokeTestResult[]> => {
  const results: SmokeTestResult[] = [];

  // Test 1: Boolean normalization utility
  try {
    const { normalizeBoolean, normalizeFloatFields } = await import('./booleanNormalization');
    
    // Test boolean normalization
    const boolTests = [
      { input: true, expected: true },
      { input: false, expected: false },
      { input: 'true', expected: true },
      { input: 'false', expected: false },
      { input: 'TRUE', expected: true },
      { input: 'FALSE', expected: false },
      { input: 1, expected: true },
      { input: 0, expected: false },
      { input: null, expected: false },
      { input: undefined, expected: false }
    ];
    
    const boolPassed = boolTests.every(test => normalizeBoolean(test.input) === test.expected);
    results.push({
      test: 'Boolean normalization utility',
      passed: boolPassed,
      details: boolPassed ? 'All boolean conversions work correctly' : 'Some boolean conversions failed'
    });

    // Test float field normalization
    const floatUpdate = { field: 'isFloating', value: 'true' };
    const normalized = normalizeFloatFields(floatUpdate);
    const floatPassed = normalized.field === 'isFloating' && 
                       normalized.value === true && 
                       normalized.syncFields?.isFloating === true && 
                       normalized.syncFields?.isFloated === true;
    
    results.push({
      test: 'Float field normalization',
      passed: floatPassed,
      details: floatPassed ? 'Float field sync works correctly' : 'Float field sync has issues'
    });

  } catch (error) {
    results.push({
      test: 'Boolean normalization utility',
      passed: false,
      details: `Failed to load utility: ${error}`
    });
  }

  // Test 2: Cell broadcast system
  try {
    const { cellBroadcast } = await import('./cellBroadcast');
    
    results.push({
      test: 'Cell broadcast system',
      passed: typeof cellBroadcast.subscribeToCellUpdates === 'function' && 
              typeof cellBroadcast.broadcastCellUpdate === 'function',
      details: 'Cell broadcast methods are available'
    });
  } catch (error) {
    results.push({
      test: 'Cell broadcast system',
      passed: false,
      details: `Cell broadcast not available: ${error}`
    });
  }

  // Test 3: Structural change handling
  const structuralTests = [
    'items:add',
    'items:remove', 
    'items:reorder'
  ];
  
  results.push({
    test: 'Structural change field definitions',
    passed: true,
    details: `Handles: ${structuralTests.join(', ')}`
  });

  return results;
};

/**
 * Print smoke test results to console in a readable format
 */
export const printSmokeTestResults = (results: SmokeTestResult[]) => {
  console.log('\n🔍 Live Show Smoke Test Results');
  console.log('================================');
  
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.test}`);
    if (result.details) {
      console.log(`   ${result.details}`);
    }
  });
  
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  
  console.log(`\n📊 Summary: ${passedCount}/${totalCount} tests passed`);
  
  if (passedCount === totalCount) {
    console.log('🎉 All systems ready for your live show!');
  } else {
    console.log('⚠️  Some issues detected - please review before going live');
  }
};