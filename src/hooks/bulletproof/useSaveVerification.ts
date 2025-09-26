import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SaveVerificationResult {
  verified: boolean;
  actualData?: any;
  error?: string;
  retryRecommended?: boolean;
}

export const useSaveVerification = () => {
  const verifyRundownSave = useCallback(async (
    rundownId: string,
    expectedData: any,
    maxRetries: number = 3,
    delayMs: number = 500
  ): Promise<SaveVerificationResult> => {
    let attempts = 0;
    
    while (attempts < maxRetries) {
      try {
        await new Promise(resolve => setTimeout(resolve, delayMs * (attempts + 1)));
        
        const { data, error } = await supabase
          .from('rundowns')
          .select('*')
          .eq('id', rundownId)
          .single();

        if (error) {
          console.error('❌ Save verification: Database query failed', error);
          attempts++;
          continue;
        }

        if (!data) {
          console.error('❌ Save verification: Rundown not found', rundownId);
          return {
            verified: false,
            error: 'Rundown not found after save',
            retryRecommended: true
          };
        }

        // Verify key fields match
        const fieldsToVerify = ['title', 'items', 'updated_at'];
        const mismatches = [];

        for (const field of fieldsToVerify) {
          if (field === 'updated_at') {
            // For updated_at, check if it's recent (within last 30 seconds)
            const updatedAt = new Date(data.updated_at).getTime();
            const now = Date.now();
            if (now - updatedAt > 30000) {
              mismatches.push(`${field}: too old (${new Date(data.updated_at).toISOString()})`);
            }
          } else if (field === 'items') {
            // Deep compare items array
            const expectedItems = JSON.stringify(expectedData[field] || []);
            const actualItems = JSON.stringify(data[field] || []);
            if (expectedItems !== actualItems) {
              mismatches.push(`${field}: content mismatch`);
            }
          } else {
            if (expectedData[field] !== undefined && data[field] !== expectedData[field]) {
              mismatches.push(`${field}: expected "${expectedData[field]}", got "${data[field]}"`);
            }
          }
        }

        if (mismatches.length === 0) {
          console.log('✅ Save verification: Save confirmed', rundownId);
          return {
            verified: true,
            actualData: data
          };
        } else {
          console.warn('⚠️ Save verification: Data mismatch', rundownId, mismatches);
          attempts++;
          
          if (attempts >= maxRetries) {
            return {
              verified: false,
              actualData: data,
              error: `Data verification failed: ${mismatches.join(', ')}`,
              retryRecommended: true
            };
          }
        }
      } catch (error) {
        console.error('❌ Save verification: Exception during verification', error);
        attempts++;
        
        if (attempts >= maxRetries) {
          return {
            verified: false,
            error: error instanceof Error ? error.message : 'Unknown verification error',
            retryRecommended: true
          };
        }
      }
    }

    return {
      verified: false,
      error: 'Max verification attempts reached',
      retryRecommended: true
    };
  }, []);

  const verifyWithRetry = useCallback(async (
    saveFunction: () => Promise<any>,
    verifyFunction: () => Promise<SaveVerificationResult>,
    maxSaveAttempts: number = 3
  ): Promise<{ success: boolean; data?: any; error?: string }> => {
    for (let attempt = 1; attempt <= maxSaveAttempts; attempt++) {
      try {
        console.log(`🔄 Save verification: Attempt ${attempt}/${maxSaveAttempts}`);
        
        const saveResult = await saveFunction();
        
        // Wait a moment for database to propagate
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const verification = await verifyFunction();
        
        if (verification.verified) {
          console.log('✅ Save verification: Save and verify successful');
          return { success: true, data: saveResult };
        }

        if (!verification.retryRecommended || attempt === maxSaveAttempts) {
          return {
            success: false,
            error: verification.error || 'Save verification failed'
          };
        }

        console.warn(`⚠️ Save verification: Retry ${attempt} failed, retrying...`);
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500));
        
      } catch (error) {
        console.error(`❌ Save verification: Save attempt ${attempt} failed`, error);
        
        if (attempt === maxSaveAttempts) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Save operation failed'
          };
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500));
      }
    }

    return {
      success: false,
      error: 'All save attempts exhausted'
    };
  }, []);

  return {
    verifyRundownSave,
    verifyWithRetry
  };
};