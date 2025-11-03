/**
 * Data migration utilities for upgrading to new versions
 * These utilities help with data transformations during migrations
 */

/**
 * Normalize tags: ensure all tags are lowercase and trimmed
 * @param tags Original tags array
 * @returns Normalized tags
 */
export function normalizeTags(tags: string[] | null | undefined): string[] {
  if (!tags || tags.length === 0) return [];
  return tags
    .map((tag) => tag.toLowerCase().trim())
    .filter((tag) => tag.length > 0)
    .filter((tag, idx, arr) => arr.indexOf(tag) === idx); // Remove duplicates
}

/**
 * Migrate note content: add format version if needed
 * @param content Original content
 * @returns Migrated content
 */
export function migrateNoteContent(content: string | null | undefined): string | null {
  if (!content) return null;
  // No transformation needed currently, but this is a hook for future format changes
  return content;
}

/**
 * Validate note data before migration
 * @param note Note object to validate
 * @returns Validation result
 */
export function validateNoteData(note: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  if (!note.id) errors.push('Missing required field: id');
  if (!note.user_id) errors.push('Missing required field: user_id');
  if (!note.title || note.title.trim().length === 0) errors.push('Missing required field: title');
  if (!['book', 'concept', 'quote'].includes(note.type)) {
    errors.push(`Invalid note type: ${note.type}`);
  }

  // Validate content
  if (note.content && typeof note.content !== 'string') {
    errors.push('Invalid content format: must be string or null');
  }

  // Validate tags
  if (note.tags && !Array.isArray(note.tags)) {
    errors.push('Invalid tags format: must be array');
  }

  // Validate metadata
  if (note.metadata && typeof note.metadata !== 'object') {
    errors.push('Invalid metadata format: must be object');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Migrate reminder data to new format
 * @param reminder Reminder object
 * @returns Migrated reminder
 */
export function migrateReminder(reminder: any): any {
  // Ensure interval_level is within valid range (0-3)
  const intervalLevel = Math.max(0, Math.min(3, reminder.interval_level || 0));

  return {
    ...reminder,
    interval_level: intervalLevel,
    // Ensure status is valid
    status:
      ['pending', 'completed', 'dismissed'].includes(reminder.status) ?
        reminder.status
      : 'pending',
  };
}

/**
 * Validate link data before migration
 * @param link Link object to validate
 * @returns Validation result
 */
export function validateLinkData(link: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!link.id) errors.push('Missing required field: id');
  if (!link.user_id) errors.push('Missing required field: user_id');
  if (!link.source_note_id) errors.push('Missing required field: source_note_id');
  if (!link.target_note_id) errors.push('Missing required field: target_note_id');

  const validRelationships = ['relates_to', 'supports', 'contradicts', 'inspired_by'];
  if (!validRelationships.includes(link.relationship_type)) {
    errors.push(`Invalid relationship type: ${link.relationship_type}`);
  }

  if (link.source_note_id === link.target_note_id) {
    errors.push('Cannot create self-referencing link');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate migration report
 * @param totalRecords Total records processed
 * @param successCount Successful migrations
 * @param errorCount Failed migrations
 * @param errors Array of error details
 * @returns Migration report
 */
export function generateMigrationReport(
  totalRecords: number,
  successCount: number,
  errorCount: number,
  errors: Array<{ record: string; error: string[] }>
): string {
  const timestamp = new Date().toISOString();
  const successRate = ((successCount / totalRecords) * 100).toFixed(2);

  let report = `
Migration Report
================
Timestamp: ${timestamp}
Total Records: ${totalRecords}
Successful: ${successCount}
Failed: ${errorCount}
Success Rate: ${successRate}%

`;

  if (errors.length > 0) {
    report += `Errors (${errors.length}):\n`;
    report += errors
      .map((e) => `\n  Record: ${e.record}\n  Issues:\n    ${e.error.join('\n    ')}`)
      .join('\n');
  }

  return report;
}

/**
 * Create backup table SQL
 * @param tableName Table to backup
 * @returns SQL statement
 */
export function createBackupSQL(tableName: string): string {
  const backupName = `${tableName}_backup_${Date.now()}`;
  return `CREATE TABLE ${backupName} AS SELECT * FROM ${tableName};`;
}

/**
 * Restore from backup SQL
 * @param tableName Table to restore
 * @param backupName Backup table name
 * @returns SQL statement
 */
export function restoreFromBackupSQL(tableName: string, backupName: string): string {
  return `
    DROP TABLE IF EXISTS ${tableName};
    ALTER TABLE ${backupName} RENAME TO ${tableName};
  `;
}

/**
 * Check data integrity after migration
 * @param originalCount Original record count
 * @param migratedCount Migrated record count
 * @returns Integrity check result
 */
export function checkDataIntegrity(
  originalCount: number,
  migratedCount: number
): { passed: boolean; message: string } {
  if (originalCount !== migratedCount) {
    return {
      passed: false,
      message: `Data loss detected: ${originalCount} original → ${migratedCount} migrated`,
    };
  }

  return {
    passed: true,
    message: 'All records migrated successfully',
  };
}
