#!/usr/bin/env node

import createEnhancedAnalyticsTables from './enhanced-analytics-tables';

async function main() {
  try {
    console.log('🚀 Starting enhanced analytics tables migration...');
    await createEnhancedAnalyticsTables();
    console.log('✅ Enhanced analytics tables migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Enhanced analytics tables migration failed:', error);
    process.exit(1);
  }
}

main();
