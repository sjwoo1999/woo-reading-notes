#!/usr/bin/env node

/**
 * Environment Validation Script
 *
 * Validates that all required environment variables are set and valid.
 *
 * Usage:
 *   npx ts-node scripts/validate-env.ts
 */

import { createClient } from '@supabase/supabase-js';

interface ValidationResult {
  name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
}

const results: ValidationResult[] = [];

function addResult(name: string, status: ValidationResult['status'], message: string) {
  results.push({ name, status, message });
}

async function validateEnvironment() {
  console.log('🔍 Validating environment configuration...\n');

  // Check required environment variables
  const requiredVars = [
    { name: 'NEXT_PUBLIC_SUPABASE_URL', kind: 'string' },
    { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', kind: 'string' },
    { name: 'ALADIN_TTB_KEY', kind: 'string' },
  ];

  for (const variable of requiredVars) {
    const value = process.env[variable.name];

    if (!value) {
      addResult(variable.name, 'error', `Missing required environment variable`);
    } else if (value.includes('placeholder') || value.includes('xxx')) {
      addResult(variable.name, 'warning', `Contains placeholder value - needs configuration`);
    } else {
      addResult(variable.name, 'success', `Configured ✓`);
    }
  }

  // Validate Supabase connectivity
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      // Try a simple query to verify connectivity
      const { data, error } = await supabase.from('profiles').select('count()').limit(1);

      if (error) {
        addResult('Supabase Connectivity', 'error', `Connection failed: ${error.message}`);
      } else {
        addResult('Supabase Connectivity', 'success', `Connected to Supabase ✓`);
      }
    } catch (error) {
      addResult('Supabase Connectivity', 'error', `Connection error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Validate Supabase URL format
  if (supabaseUrl) {
    if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('supabase')) {
      addResult('Supabase URL Format', 'warning', `Invalid Supabase URL format`);
    } else {
      addResult('Supabase URL Format', 'success', `Valid Supabase URL ✓`);
    }
  }

  // Validate Aladin API key
  const aladinKey = process.env.ALADIN_TTB_KEY;
  if (aladinKey && aladinKey.length < 10) {
    addResult('Aladin TTB Key', 'warning', `Key seems too short, verify correctness`);
  } else if (aladinKey) {
    addResult('Aladin TTB Key', 'success', `Key configured ✓`);
  }

  // Check for production environment safety
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost')) {
    addResult('Production Safety', 'error', `Using localhost URL in production!`);
  } else if (isProduction) {
    addResult('Production Safety', 'success', `Production environment safe ✓`);
  }

  // Check for sensitive data in git
  const sensitivePatterns = [
    { name: 'Private keys in .env', pattern: /PRIVATE_KEY|SECRET/ },
  ];

  for (const pattern of sensitivePatterns) {
    const keys = Object.keys(process.env).filter((k) => pattern.pattern.test(k));
    if (keys.length > 0) {
      addResult(pattern.name, 'warning', `Found ${keys.length} variables matching sensitive pattern`);
    }
  }

  // Print results
  console.log('📋 Validation Results:\n');

  const succeededCount = results.filter((r) => r.status === 'success').length;
  const errorsCount = results.filter((r) => r.status === 'error').length;
  const warningsCount = results.filter((r) => r.status === 'warning').length;

  for (const result of results) {
    const icon = {
      success: '✅',
      warning: '⚠️',
      error: '❌',
    }[result.status];

    console.log(`${icon} ${result.name}`);
    console.log(`   ${result.message}\n`);
  }

  // Summary
  console.log('📊 Summary:');
  console.log(`   ✅ Passed: ${succeededCount}`);
  console.log(`   ⚠️  Warnings: ${warningsCount}`);
  console.log(`   ❌ Errors: ${errorsCount}\n`);

  if (errorsCount > 0) {
    console.log('❌ Validation failed. Please fix the errors above.');
    process.exit(1);
  } else if (warningsCount > 0) {
    console.log('⚠️  Validation passed with warnings. Review them above.\n');
  } else {
    console.log('✅ All validation checks passed!\n');
  }
}

validateEnvironment().catch((error) => {
  console.error('Validation script error:', error);
  process.exit(1);
});
