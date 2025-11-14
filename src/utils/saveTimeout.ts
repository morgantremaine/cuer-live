/**
 * Save Timeout Utility
 * 
 * Wraps save operations with a timeout to prevent hung saves.
 * If a save operation exceeds the timeout, it's rejected with a SaveTimeoutError
 * which can then be caught and retried by existing error handling.
 */

export class SaveTimeoutError extends Error {
  constructor(operation: string, timeout: number) {
    super(`Save operation '${operation}' timed out after ${timeout}ms`);
    this.name = 'SaveTimeoutError';
  }
}

/**
 * Wraps an async operation with a timeout
 * @param operation The async operation to execute
 * @param operationName A descriptive name for logging
 * @param timeoutMs Timeout in milliseconds (default: 10000)
 * @returns The result of the operation
 * @throws SaveTimeoutError if the operation times out
 */
export async function saveWithTimeout<T>(
  operation: () => Promise<T>,
  operationName: string,
  timeoutMs: number = 25000
): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      console.error(`⏱️ TIMEOUT: Save operation '${operationName}' exceeded ${timeoutMs}ms`);
      reject(new SaveTimeoutError(operationName, timeoutMs));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([
      operation(),
      timeoutPromise
    ]);
    
    // Clear the timeout if operation completes first
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    // Clear timeout on error as well
    clearTimeout(timeoutId);
    throw error;
  }
}
