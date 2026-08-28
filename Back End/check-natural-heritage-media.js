/**
 * Check all natural heritage media entries
 * Run: node check-natural-heritage-media.js
 * 
 * This script checks media entries for all natural heritage sites
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

async function checkNaturalHeritageMedia() {
  console.log('Checking natural heritage media entries in database...\n');

  const supabase = await loadSupabaseConfig();

  // Get all natural heritage sites
  const { data: sites, error: sitesError } = await supabase
    .from('heritage_sites')
    .select('*')
    .eq('category', 'natural');

  if (sitesError) {
    console.error('Error fetching sites:', sitesError.message);
    process.exit(1);
  }

  console.log(`Found ${sites.length} natural heritage sites:\n`);

  for (const site of sites) {
    console.log(`=== ${site.name} (${site.id}) ===`);
    
    // Get media for this site
    const { data: media, error: mediaError } = await supabase
      .from('heritage_media')
      .select('*')
      .eq('site_id', site.id);

    if (mediaError) {
      console.error(`Error fetching media for ${site.id}:`, mediaError.message);
      continue;
    }

    if (media.length === 0) {
      console.log('  No media entries');
    } else {
      console.log(`  ${media.length} media entries:`);
      media.forEach((item, index) => {
        console.log(`    ${index + 1}. ${item.type}: ${item.title} (${item.id})`);
      });
    }
    console.log('');
  }
}

checkNaturalHeritageMedia().then(() => {
  console.log('\nCheck completed!');
  process.exit(0);
}).catch((error) => {
  console.error('Check error:', error);
  process.exit(1);
});
