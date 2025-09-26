import { useCallback } from 'react';
import { useSaveCoordination } from './useSaveCoordination';
import { useSaveVerification } from './useSaveVerification';
import { useFallbackStorage } from './useFallbackStorage';
import { useAuthAwareRetry } from './useAuthAwareRetry';

interface BulletproofSaveOptions {
  rundownId?: string;
  saveType?: 'auto' | 'manual' | 'offline';
  enableVerification?: boolean;
  enableFallbackStorage?: boolean;
  enableAuthRetry?: boolean;
  fallbackKey?: string;
  timeout?: number;
  maxRetries?: number;
}

interface BulletproofSaveResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata: {
    verified: boolean;
    fallbackUsed: boolean;
    authRefreshed: boolean;
    attemptsUsed: number;
    duration: number;
  };
}

export const useBulletproofSave = () => {
  const { coordinatedSave } = useSaveCoordination();
  const { verifyRundownSave, verifyWithRetry } = useSaveVerification();
  const { setItem: setFallback, getStorageHealth } = useFallbackStorage();
  const { executeWithAuthRetry } = useAuthAwareRetry();

  const bulletproofSave = useCallback(async (
    saveFunction: () => Promise<any>,
    options: BulletproofSaveOptions = {}
  ): Promise<BulletproofSaveResult> => {
    const {
      rundownId,
      saveType = 'auto',
      enableVerification = true,
      enableFallbackStorage = true,
      enableAuthRetry = true,
      fallbackKey,
      timeout = 15000,
      maxRetries = 3
    } = options;

    const startTime = Date.now();
    let verified = false;
    let fallbackUsed = false;
    let authRefreshed = false;
    let attemptsUsed = 0;

    try {
      console.log('🛡️ Bulletproof save: Starting save operation', { saveType, rundownId });

      // Create the coordinated save operation
      const coordinatedOperation = async () => {
        if (enableAuthRetry) {
          return executeWithAuthRetry(saveFunction, {
            maxAttempts: maxRetries,
            onAuthRefresh: () => { authRefreshed = true; }
          });
        } else {
          return saveFunction();
        }
      };

      // Execute with coordination
      const result = await coordinatedSave(coordinatedOperation, {
        type: saveType,
        timeout
      });

      attemptsUsed = 1; // If we got here, at least one attempt was made

      // Store fallback if enabled and key provided
      if (enableFallbackStorage && fallbackKey && result) {
        try {
          const fallbackResult = await setFallback(fallbackKey, result);
          if (fallbackResult.success) {
            fallbackUsed = true;
            console.log('💾 Bulletproof save: Fallback storage successful');
          }
        } catch (error) {
          console.warn('⚠️ Bulletproof save: Fallback storage failed', error);
        }
      }

      // Verify save if enabled and rundownId provided
      if (enableVerification && rundownId) {
        try {
          const verificationResult = await verifyRundownSave(rundownId, result);
          verified = verificationResult.verified;
          
          if (!verified && verificationResult.retryRecommended) {
            console.warn('⚠️ Bulletproof save: Verification failed, data may not have persisted');
          }
        } catch (error) {
          console.warn('⚠️ Bulletproof save: Verification check failed', error);
        }
      } else {
        // If verification is disabled, assume success
        verified = true;
      }

      const duration = Date.now() - startTime;
      console.log('✅ Bulletproof save: Operation completed', { verified, fallbackUsed, authRefreshed, duration });

      return {
        success: true,
        data: result,
        metadata: {
          verified,
          fallbackUsed,
          authRefreshed,
          attemptsUsed,
          duration
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('❌ Bulletproof save: Operation failed', error);

      // Try to store in fallback even on failure
      if (enableFallbackStorage && fallbackKey) {
        try {
          // Store the failed operation for later retry
          const failedOperation = {
            saveFunction: saveFunction.toString(),
            timestamp: Date.now(),
            error: error instanceof Error ? error.message : 'Unknown error',
            rundownId,
            saveType
          };
          
          const fallbackResult = await setFallback(`${fallbackKey}_failed`, failedOperation);
          if (fallbackResult.success) {
            fallbackUsed = true;
            console.log('💾 Bulletproof save: Failed operation stored for retry');
          }
        } catch (fallbackError) {
          console.warn('⚠️ Bulletproof save: Failed to store failed operation', fallbackError);
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown save error',
        metadata: {
          verified: false,
          fallbackUsed,
          authRefreshed,
          attemptsUsed,
          duration
        }
      };
    }
  }, [coordinatedSave, verifyRundownSave, setFallback, executeWithAuthRetry]);

  const bulletproofSaveWithVerification = useCallback(async (
    saveFunction: () => Promise<any>,
    verifyFunction: () => Promise<any>,
    options: Omit<BulletproofSaveOptions, 'enableVerification'> = {}
  ): Promise<BulletproofSaveResult> => {
    const startTime = Date.now();
    let fallbackUsed = false;
    let authRefreshed = false;
    let attemptsUsed = 0;

    try {
      console.log('🛡️ Bulletproof save with verification: Starting operation');

      const coordinatedOperation = async () => {
        if (options.enableAuthRetry !== false) {
          return executeWithAuthRetry(() => verifyWithRetry(saveFunction, verifyFunction), {
            maxAttempts: options.maxRetries || 3,
            onAuthRefresh: () => { authRefreshed = true; }
          });
        } else {
          return verifyWithRetry(saveFunction, verifyFunction);
        }
      };

      const result = await coordinatedSave(coordinatedOperation, {
        type: options.saveType || 'auto',
        timeout: options.timeout || 15000
      });

      attemptsUsed = 1; // Single coordinated save attempt

      // Store fallback if enabled
      if (options.enableFallbackStorage !== false && options.fallbackKey && result.success) {
        try {
          const fallbackResult = await setFallback(options.fallbackKey, result.data);
          fallbackUsed = fallbackResult.success;
        } catch (error) {
          console.warn('⚠️ Bulletproof save with verification: Fallback storage failed', error);
        }
      }

      const duration = Date.now() - startTime;
      console.log('✅ Bulletproof save with verification: Operation completed', result.success);

      return {
        success: result.success,
        data: result.data,
        error: result.error,
        metadata: {
          verified: result.success,
          fallbackUsed,
          authRefreshed,
          attemptsUsed,
          duration
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('❌ Bulletproof save with verification: Operation failed', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          verified: false,
          fallbackUsed,
          authRefreshed,
          attemptsUsed,
          duration
        }
      };
    }
  }, [coordinatedSave, verifyWithRetry, setFallback, executeWithAuthRetry]);

  return {
    bulletproofSave,
    bulletproofSaveWithVerification,
    getStorageHealth
  };
};