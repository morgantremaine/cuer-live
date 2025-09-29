/**
 * Test Scenarios for System Stress Testing
 * 
 * This module provides comprehensive test scenarios to validate
 * system behavior under various stress conditions and edge cases.
 */

import { RundownItem } from '@/types/rundown';
import { Column } from '@/types/columns';
import { systemAuditor } from './systemAudit';

// ================ TEST DATA GENERATORS ================

export class TestScenarioGenerator {
  
  /**
   * Generate maximum complexity scenario:
   * - 500+ items
   * - 20+ custom columns
   * - Complex nested data structures
   */
  static generateMaxComplexityScenario(): {
    items: RundownItem[];
    columns: Column[];
    customColumns: Column[];
  } {
    console.log('🧪 Generating maximum complexity test scenario...');
    
    const customColumns: Column[] = [];
    for (let i = 1; i <= 25; i++) {
      customColumns.push({
        id: `custom_${i}`,
        key: `custom_field_${i}`,
        name: `Custom Field ${i}`,
        isVisible: true,
        isEditable: true,
        isCustom: true,
        width: '150px',
        order: 100 + i
      });
    }
    
    const items: RundownItem[] = [];
    
    // Generate 500+ items with complex data
    for (let i = 1; i <= 550; i++) {
      const customFields: Record<string, string> = {};
      customColumns.forEach(col => {
        customFields[col.key] = `Complex data ${i} for ${col.name} with unicode 🎬📺🎪 and special chars <>&"'`;
      });
      
      const item: RundownItem = {
        id: `stress_test_item_${i}`,
        type: i % 20 === 0 ? 'header' : 'regular',
        name: `Stress Test Item ${i} with very long name that might cause issues with rendering and signature generation`,
        duration: `${Math.floor(Math.random() * 10)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
        talent: `Talent ${i % 10} with special chars àáâãäåæçèé`,
        script: `This is a very long script for item ${i} that contains multiple paragraphs.\n\nSecond paragraph with special characters: £€¥§±×÷\n\nThird paragraph with emojis: 🎬📺🎪🎭🎨🎯`,
        gfx: `GFX_${i}_with_underscores_and_numbers_${Math.random()}`,
        video: `video_${i}.mp4`,
        images: `image_${i}.jpg,image_${i}_alt.png`,
        notes: `Complex notes with JSON-like data: {"key": "value", "number": ${i}, "array": [1,2,3]}`,
        color: i % 5 === 0 ? '#ff0000' : '',
        isFloating: i % 7 === 0,
        isFloated: i % 11 === 0,
        customFields,
        segmentName: `Segment ${Math.floor(i / 10)}`,
        rowNumber: String(i)
      };
      
      items.push(item);
    }
    
    console.log(`✅ Generated ${items.length} items with ${customColumns.length} custom columns`);
    
    // Audit the generated scenario
    systemAuditor.auditSignatures({
      items,
      title: 'Maximum Complexity Test Scenario',
      columns: customColumns,
      timezone: 'America/New_York',
      startTime: '09:00:00',
      showDate: new Date(),
      externalNotes: 'Complex test scenario with maximum data complexity'
    }, 'max_complexity_test');
    
    return {
      items,
      columns: customColumns,
      customColumns
    };
  }
  
  /**
   * Generate multi-user stress testing scenario
   */
  static generateMultiUserStressScenario(): {
    users: Array<{
      id: string;
      name: string;
      actions: Array<{
        type: 'edit' | 'add' | 'delete' | 'move';
        itemId: string;
        field?: string;
        value?: string;
        timestamp: number;
      }>;
    }>;
    initialItems: RundownItem[];
  } {
    console.log('🧪 Generating multi-user stress test scenario...');
    
    const initialItems: RundownItem[] = [];
    for (let i = 1; i <= 100; i++) {
      initialItems.push({
        id: `multi_user_item_${i}`,
        type: i % 10 === 0 ? 'header' : 'regular',
        name: `Item ${i}`,
        duration: '01:00',
        talent: `Talent ${i % 5}`,
        script: `Script for item ${i}`,
        gfx: '',
        video: '',
        images: '',
        notes: '',
        customFields: {},
        rowNumber: String(i)
      });
    }
    
    const users = [];
    for (let u = 1; u <= 5; u++) {
      const actions = [];
      const baseTime = Date.now();
      
      // Generate 50 actions per user over 10 seconds
      for (let a = 1; a <= 50; a++) {
        const itemIndex = Math.floor(Math.random() * initialItems.length);
        const item = initialItems[itemIndex];
        
        actions.push({
          type: ['edit', 'edit', 'edit', 'add', 'delete'][Math.floor(Math.random() * 5)] as any,
          itemId: item.id,
          field: ['name', 'talent', 'script', 'notes'][Math.floor(Math.random() * 4)],
          value: `User ${u} edit ${a} at ${new Date().toISOString()}`,
          timestamp: baseTime + (a * 200) // 200ms intervals
        });
      }
      
      users.push({
        id: `stress_user_${u}`,
        name: `Stress User ${u}`,
        actions
      });
    }
    
    console.log(`✅ Generated ${users.length} users with ${users[0].actions.length} actions each`);
    
    return {
      users,
      initialItems
    };
  }
  
  /**
   * Generate state persistence boundary test
   */
  static generateStatePersistenceTest(): {
    layouts: Array<{
      id: string;
      name: string;
      columns: Column[];
    }>;
    testSequence: Array<{
      action: 'switch_layout' | 'edit_item' | 'add_column' | 'save_state';
      layoutId?: string;
      itemChanges?: Array<{ id: string; field: string; value: string }>;
      newColumn?: Column;
      timestamp: number;
    }>;
  } {
    console.log('🧪 Generating state persistence boundary test...');
    
    const layouts = [
      {
        id: 'layout_1',
        name: 'Basic Layout',
        columns: [
          { id: 'name', key: 'name', name: 'Name', isVisible: true, isEditable: true, width: '200px', order: 1 },
          { id: 'duration', key: 'duration', name: 'Duration', isVisible: true, isEditable: true, width: '100px', order: 2 },
          { id: 'talent', key: 'talent', name: 'Talent', isVisible: true, isEditable: true, width: '150px', order: 3 }
        ]
      },
      {
        id: 'layout_2',
        name: 'Extended Layout',
        columns: [
          { id: 'name', key: 'name', name: 'Name', isVisible: true, isEditable: true, width: '200px', order: 1 },
          { id: 'duration', key: 'duration', name: 'Duration', isVisible: true, isEditable: true, width: '100px', order: 2 },
          { id: 'talent', key: 'talent', name: 'Talent', isVisible: true, isEditable: true, width: '150px', order: 3 },
          { id: 'script', key: 'script', name: 'Script', isVisible: true, isEditable: true, width: '300px', order: 4 },
          { id: 'gfx', key: 'gfx', name: 'GFX', isVisible: true, isEditable: true, width: '150px', order: 5 }
        ]
      },
      {
        id: 'layout_3',
        name: 'Custom Heavy Layout',
        columns: [
          { id: 'name', key: 'name', name: 'Name', isVisible: true, isEditable: true, width: '200px', order: 1 },
          { id: 'custom1', key: 'custom1', name: 'Custom 1', isVisible: true, isEditable: true, isCustom: true, width: '150px', order: 2 },
          { id: 'custom2', key: 'custom2', name: 'Custom 2', isVisible: true, isEditable: true, isCustom: true, width: '150px', order: 3 },
          { id: 'custom3', key: 'custom3', name: 'Custom 3', isVisible: true, isEditable: true, isCustom: true, width: '150px', order: 4 }
        ]
      }
    ];
    
    const testSequence = [];
    const baseTime = Date.now();
    
    // Create a complex sequence of layout switches and edits
    for (let i = 0; i < 20; i++) {
      // Switch layout
      testSequence.push({
        action: 'switch_layout' as const,
        layoutId: layouts[i % layouts.length].id,
        timestamp: baseTime + (i * 1000)
      });
      
      // Make some edits
      testSequence.push({
        action: 'edit_item' as const,
        itemChanges: [
          { id: 'test_item_1', field: 'name', value: `Edit ${i} - Name` },
          { id: 'test_item_2', field: 'talent', value: `Edit ${i} - Talent` }
        ],
        timestamp: baseTime + (i * 1000) + 500
      });
      
      // Occasionally add a custom column
      if (i % 5 === 0) {
        testSequence.push({
          action: 'add_column' as const,
          newColumn: {
            id: `dynamic_${i}`,
            key: `dynamic_${i}`,
            name: `Dynamic ${i}`,
            isVisible: true,
            isEditable: true,
            isCustom: true,
            width: '150px',
            order: 100 + i
          },
          timestamp: baseTime + (i * 1000) + 750
        });
      }
    }
    
    console.log(`✅ Generated ${layouts.length} layouts with ${testSequence.length} test actions`);
    
    return {
      layouts,
      testSequence
    };
  }
  
  /**
   * Generate long-running session test
   */
  static generateLongRunningSessionTest(): {
    sessionDuration: number; // 8 hours in milliseconds
    activityPattern: Array<{
      time: number; // minutes from start
      action: 'heavy_edit' | 'light_edit' | 'save' | 'idle' | 'layout_change';
      intensity: 'low' | 'medium' | 'high';
      duration: number; // minutes
    }>;
  } {
    console.log('🧪 Generating long-running session test (8 hours)...');
    
    const sessionDuration = 8 * 60 * 60 * 1000; // 8 hours
    const activityPattern = [];
    
    // Simulate realistic editing patterns over 8 hours
    const patterns = [
      // Morning burst (heavy editing)
      { time: 0, action: 'heavy_edit' as const, intensity: 'high' as const, duration: 45 },
      { time: 45, action: 'save' as const, intensity: 'medium' as const, duration: 2 },
      { time: 47, action: 'light_edit' as const, intensity: 'medium' as const, duration: 30 },
      
      // Mid-morning break
      { time: 77, action: 'idle' as const, intensity: 'low' as const, duration: 15 },
      
      // Pre-lunch editing
      { time: 92, action: 'heavy_edit' as const, intensity: 'high' as const, duration: 60 },
      { time: 152, action: 'layout_change' as const, intensity: 'medium' as const, duration: 5 },
      { time: 157, action: 'light_edit' as const, intensity: 'medium' as const, duration: 20 },
      
      // Lunch break
      { time: 177, action: 'idle' as const, intensity: 'low' as const, duration: 60 },
      
      // Afternoon session
      { time: 237, action: 'heavy_edit' as const, intensity: 'high' as const, duration: 90 },
      { time: 327, action: 'save' as const, intensity: 'medium' as const, duration: 2 },
      { time: 329, action: 'light_edit' as const, intensity: 'medium' as const, duration: 45 },
      
      // Late afternoon
      { time: 374, action: 'layout_change' as const, intensity: 'medium' as const, duration: 10 },
      { time: 384, action: 'heavy_edit' as const, intensity: 'high' as const, duration: 60 },
      
      // Evening wrap-up
      { time: 444, action: 'light_edit' as const, intensity: 'low' as const, duration: 30 },
      { time: 474, action: 'save' as const, intensity: 'medium' as const, duration: 5 },
      { time: 479, action: 'idle' as const, intensity: 'low' as const, duration: 1 }
    ];
    
    activityPattern.push(...patterns);
    
    console.log(`✅ Generated ${activityPattern.length} activity periods for 8-hour session`);
    
    return {
      sessionDuration,
      activityPattern
    };
  }
  
  /**
   * Run all test scenarios and generate report
   */
  static async runAllTestScenarios(): Promise<{
    maxComplexity: any;
    multiUser: any;
    statePersistence: any;
    longRunning: any;
    auditReport: any;
  }> {
    console.log('🚀 Running all test scenarios...');
    
    const startTime = Date.now();
    
    try {
      const maxComplexity = this.generateMaxComplexityScenario();
      const multiUser = this.generateMultiUserStressScenario();
      const statePersistence = this.generateStatePersistenceTest();
      const longRunning = this.generateLongRunningSessionTest();
      
      // Generate audit report
      const auditReport = systemAuditor.getAuditReport();
      
      const endTime = Date.now();
      
      console.log(`✅ All test scenarios completed in ${endTime - startTime}ms`);
      console.log('📊 Test Summary:', {
        maxComplexityItems: maxComplexity.items.length,
        multiUserActions: multiUser.users.reduce((sum, user) => sum + user.actions.length, 0),
        statePersistenceActions: statePersistence.testSequence.length,
        longRunningPeriods: longRunning.activityPattern.length,
        auditInconsistencies: auditReport.summary.totalInconsistencies,
        criticalAnomalies: auditReport.summary.criticalAnomalies
      });
      
      return {
        maxComplexity,
        multiUser,
        statePersistence,
        longRunning,
        auditReport
      };
      
    } catch (error) {
      console.error('❌ Test scenario execution failed:', error);
      throw error;
    }
  }
}

// Export for global access in development
if (process.env.NODE_ENV === 'development') {
  (window as any).TestScenarioGenerator = TestScenarioGenerator;
}

export default TestScenarioGenerator;