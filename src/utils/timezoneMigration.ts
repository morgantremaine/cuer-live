/**
 * Utility to migrate deprecated timezones to supported ones
 */

/**
 * Migrates Las Vegas timezone to Los Angeles since they're in the same timezone
 * and Las Vegas causes issues with date-fns-tz formatting
 */
export const migrateTimezone = (timezone: string): string => {
  if (timezone === 'America/Las_Vegas') {
    console.log('🕐 Migrating deprecated timezone America/Las_Vegas to America/Los_Angeles');
    return 'America/Los_Angeles';
  }
  return timezone;
};

/**
 * Check if a timezone is deprecated and should be migrated
 */
export const isDeprecatedTimezone = (timezone: string): boolean => {
  return timezone === 'America/Las_Vegas';
};