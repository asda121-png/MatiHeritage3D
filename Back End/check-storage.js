/**
 * Check Supabase Storage buckets contents
 * Run: node check-storage.js
 * 
 * This script lists all files in the Supabase Storage buckets
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadSupabaseConfig() {
  const configPath = path.join(__dirname, 'supabase-config.js');
  let supabaseUrl, supabaseKey;

  try {
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const urlMatch = configContent.match(/url:\s*['"`]([^'"`]+)['"`]/);
    const keyMatch = configContent.match(/anonKey:\s*['"`]([^'"`]+)['"`]/);
    
    if (urlMatch && keyMatch) {
      supabaseUrl = urlMatch[1];
      supabaseKey = keyMatch[1];
    } else {
      throw new Error('Could not extract Supabase config from file');
    }
  } catch (error) {
    console.error('Error loading Supabase config:', error.message);
    process.exit(1);
  }

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL and key are required in supabase-config.js');
    process.exit(1);
  }

  return createClient(supabaseUrl, supabaseKey);
}

async function listBucketContents(supabase, bucketName) {
  try {
    console.log(`\n=== ${bucketName} ===`);
    const { data, error } = await supabase.storage.from(bucketName).list('', {
      limit: 100,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' }
    });

    if (error) {
      console.error(`Error listing ${bucketName}:`, error.message);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('Bucket is empty');
      return [];
    }

    console.log(`Total files: ${data.length}`);
    data.forEach((file, index) => {
      console.log(`${index + 1}. ${file.name} (${file.metadata?.size || 'unknown'} bytes)`);
    });

    return data;
  } catch (error) {
    console.error(`Error accessing ${bucketName}:`, error.message);
    return [];
  }
}

async function checkStorage() {
  console.log('Checking Supabase Storage buckets...\n');

  const supabase = await loadSupabaseConfig();

  const buckets = [
    'heritage-photos',
    'heritage-maps',
    'heritage-models',
    'heritage-videos',
    'heritage-audio'
  ];

  let totalFiles = 0;

  for (const bucket of buckets) {
    const files = await listBucketContents(supabase, bucket);
    totalFiles += files.length;
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total files across all buckets: ${totalFiles}`);
}

checkStorage().then(() => {
  console.log('\nStorage check completed!');
  process.exit(0);
}).catch((error) => {
  console.error('Storage check error:', error);
  process.exit(1);
});
