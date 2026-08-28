/**
 * Check dahican shoreline media entries in database
 * Run: node check-dahican-media.js
 * 
 * This script checks current media entries for dahican shoreline
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

async function checkDahicanMedia() {
  console.log('Checking dahican shoreline media entries in database...\n');

  const supabase = await loadSupabaseConfig();

  // Check current media entries for dahican shoreline
  const { data: media, error } = await supabase
    .from('heritage_media')
    .select('*')
    .eq('site_id', 'dahican-shoreline');

  if (error) {
    console.error('Error fetching media:', error.message);
    process.exit(1);
  }

  console.log(`Found ${media.length} media entries for dahican-shoreline:\n`);

  if (media.length === 0) {
    console.log('No media entries found for dahican-shoreline');
  } else {
    media.forEach((item, index) => {
      console.log(`${index + 1}. ID: ${item.id}`);
      console.log(`   Type: ${item.type}`);
      console.log(`   Title: ${item.title}`);
      console.log(`   Src: ${item.src}`);
      console.log(`   Caption: ${item.caption || 'N/A'}`);
      console.log(`   Credit: ${item.credit || 'N/A'}`);
      console.log(`   Year: ${item.year || 'N/A'}`);
      console.log('');
    });
  }

  // Check dahican shoreline site
  const { data: site, error: siteError } = await supabase
    .from('heritage_sites')
    .select('*')
    .eq('id', 'dahican-shoreline')
    .single();

  if (siteError) {
    console.error('Error fetching site:', siteError.message);
    process.exit(1);
  }

  console.log('\n=== Dahican Shoreline Site ===');
  console.log(`ID: ${site.id}`);
  console.log(`Name: ${site.name}`);
  console.log(`Category: ${site.category}`);
  console.log(`Cover: ${site.cover}`);
  console.log(`Location: ${site.location}`);
}

checkDahicanMedia().then(() => {
  console.log('\nCheck completed!');
  process.exit(0);
}).catch((error) => {
  console.error('Check error:', error);
  process.exit(1);
});
