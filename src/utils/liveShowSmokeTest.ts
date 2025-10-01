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

  // Test 3: Structural operation broadcasting
  try {
    const { cellBroadcast } = await import('./cellBroadcast');
    
    let broadcastReceived = false;
    let broadcastData: any = null;
    
    // Subscribe to broadcasts
    const unsubscribe = cellBroadcast.subscribeToCellUpdates(
      'test-rundown-123',
      (update) => {
        broadcastReceived = true;
        broadcastData = update;
      },
      'test-user-1'
    );
    
    // Test structural broadcast
    await cellBroadcast.broadcastCellUpdate(
      'test-rundown-123',
      null,
      'structural:reorder',
      { operationData: { order: ['item1', 'item2'] } },
      'test-user-2'
    );
    
    // Wait for broadcast processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    unsubscribe();
    
    results.push({
      test: 'Structural operation broadcasting',
      passed: broadcastReceived && broadcastData?.field === 'structural:reorder',
      details: broadcastReceived 
        ? `Broadcast received: ${broadcastData?.field}` 
        : 'No structural broadcast received'
    });
    
  } catch (error) {
    results.push({
      test: 'Structural operation broadcasting',
      passed: false,
      details: `Broadcast test failed: ${error}`
    });
  }

  // Test 4: Multi-user simulation
  try {
    const { cellBroadcast } = await import('./cellBroadcast');
    
    let user1Updates: any[] = [];
    let user2Updates: any[] = [];
    
    // Simulate two users subscribing
    const unsub1 = cellBroadcast.subscribeToCellUpdates(
      'test-rundown-456',
      (update) => user1Updates.push(update),
      'user-1'
    );
    
    const unsub2 = cellBroadcast.subscribeToCellUpdates(
      'test-rundown-456', 
      (update) => user2Updates.push(update),
      'user-2'
    );
    
    // User 1 makes a change
    await cellBroadcast.broadcastCellUpdate(
      'test-rundown-456',
      'item-123',
      'title',
      'Updated Title',
      'user-1'
    );
    
    // User 2 makes a structural change
    await cellBroadcast.broadcastCellUpdate(
      'test-rundown-456',
      null,
      'structural:add_row',
      { operationData: { itemId: 'new-item' } },
      'user-2'
    );
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    unsub1();
    unsub2();
    
    // User 1 should receive user 2's updates (not their own)
    const user1ReceivedUser2Updates = user1Updates.some(u => u.userId === 'user-2');
    const user2ReceivedUser1Updates = user2Updates.some(u => u.userId === 'user-1');
    const noSelfEcho = !user1Updates.some(u => u.userId === 'user-1') && 
                       !user2Updates.some(u => u.userId === 'user-2');
    
    results.push({
      test: 'Multi-user cross-communication',
      passed: user1ReceivedUser2Updates && user2ReceivedUser1Updates && noSelfEcho,
      details: `User1→User2: ${user2ReceivedUser1Updates}, User2→User1: ${user1ReceivedUser2Updates}, No self-echo: ${noSelfEcho}`
    });
    
  } catch (error) {
    results.push({
      test: 'Multi-user cross-communication',
      passed: false,
      details: `Multi-user test failed: ${error}`
    });
  }

  // Test 5: Real-time coordination system
  try {
    const { useCellUpdateCoordination } = await import('../hooks/useCellUpdateCoordination');
    
    results.push({
      test: 'Cell update coordination system',
      passed: typeof useCellUpdateCoordination === 'function',
      details: 'Coordination hook available for operation ordering'
    });
  } catch (error) {
    results.push({
      test: 'Cell update coordination system',
      passed: false,
      details: `Coordination system not available: ${error}`
    });
  }

  // Test 6: Cell update coordination (structural save removed)
  try {
    const coordinationModule = await import('../hooks/useCellUpdateCoordination');
    const hasCoordination = 'default' in coordinationModule || 'useCellUpdateCoordination' in coordinationModule;
    
    results.push({
      test: 'Cell update coordination system',
      passed: hasCoordination,
      details: 'Coordination system available for concurrent operations'
    });
  } catch (error) {
    results.push({
      test: 'Cell update coordination system',
      passed: false,
      details: `Coordination system not available: ${error}`
    });
  }

  // Test 7: Realtime connection infrastructure
  try {
    const realtimeModules = await Promise.all([
      import('../hooks/useConsolidatedRealtimeRundown'),
      import('../hooks/useShowcallerRealtime'),
      import('../hooks/blueprint/useBlueprintRealtimeSync')
    ]);
    
    const allHooksAvailable = realtimeModules.every(module => 
      'default' in module || Object.keys(module).length > 0
    );
    
    results.push({
      test: 'Realtime infrastructure completeness',
      passed: allHooksAvailable,
      details: allHooksAvailable 
        ? 'All realtime hooks available (rundown, showcaller, blueprint)'
        : 'Some realtime hooks missing'
    });
  } catch (error) {
    results.push({
      test: 'Realtime infrastructure completeness',
      passed: false,
      details: `Realtime infrastructure check failed: ${error}`
    });
  }

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