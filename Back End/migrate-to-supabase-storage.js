/**
 * Migration script: Upload local media files to Supabase Storage
 * Run: node migrate-to-supabase-storage.js
 * 
 * This script:
 * 1. Reads all media records from the database
 * 2. Uploads local files to Supabase Storage
 * 3. Updates database records with new Supabase URLs
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
    // Read the config file and extract URL and key
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

function bucketForMediaType(type) {
  if (type === 'photo') return 'heritage-photos';
  if (type === 'map') return 'heritage-maps';
  if (type === 'model3d') return 'heritage-models';
  if (type === 'video') return 'heritage-videos';
  if (type === 'audio') return 'heritage-audio';
  return 'heritage-photos';
}

async function uploadFileToSupabase(supabase, bucket, storagePath, localPath) {
  try {
    // Check if file exists locally
    if (!fs.existsSync(localPath)) {
      console.warn(`  File not found locally: ${localPath}`);
      return null;
    }

    const fileBuffer = fs.readFileSync(localPath);
    const fileName = path.basename(localPath);
    
    console.log(`  Uploading ${fileName} to ${bucket}/${storagePath}`);
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, fileBuffer, {
        upsert: true,
        contentType: getContentType(fileName)
      });

    if (error) {
      console.error(`  Upload error: ${error.message}`);
      return null;
    }

    // Get public URL
    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    console.log(`  ✓ Uploaded: ${publicData.publicUrl}`);
    return publicData.publicUrl;
  } catch (error) {
    console.error(`  Upload failed: ${error.message}`);
    return null;
  }
}

function getContentType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const types = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json'
  };
  return types[ext] || 'application/octet-stream';
}

function isLocalPath(src) {
  if (!src) return false;
  // Check if it's a local path (starts with 'data/' or is relative)
  return src.startsWith('data/') || !src.startsWith('http');
}

async function migrateMedia() {
  console.log('Starting migration to Supabase Storage...\n');

  const supabase = await loadSupabaseConfig();

  try {
    // Fetch all media records
    const { data: mediaRecords, error: fetchError } = await supabase
      .from('heritage_media')
      .select('*')
      .eq('is_deleted', false);

    if (fetchError) {
      console.error('Error fetching media records:', fetchError.message);
      process.exit(1);
    }

    console.log(`Found ${mediaRecords.length} media records\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const media of mediaRecords) {
      const { id, site_id, type, src } = media;

      // Skip if already using HTTP URL
      if (!isLocalPath(src)) {
        console.log(`[${id}] Skipping (already HTTP): ${src}`);
        skipCount++;
        continue;
      }

      // Construct local file path
      const localPath = path.join(__dirname, '..', 'Front End', src);
      const bucket = bucketForMediaType(type);
      const storagePath = `${site_id}/${id}-${path.basename(src)}`;

      console.log(`[${id}] Processing ${type}: ${src}`);

      // Upload to Supabase Storage
      const publicUrl = await uploadFileToSupabase(supabase, bucket, storagePath, localPath);

      if (publicUrl) {
        // Update database record
        const { error: updateError } = await supabase
          .from('heritage_media')
          .update({ src: publicUrl })
          .eq('id', id);

        if (updateError) {
          console.error(`  Database update error: ${updateError.message}`);
          errorCount++;
        } else {
          console.log(`  ✓ Database updated`);
          successCount++;
        }
      } else {
        errorCount++;
      }

      console.log('');
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total records: ${mediaRecords.length}`);
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Skipped (already HTTP): ${skipCount}`);
    console.log(`Errors: ${errorCount}`);

  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migration
migrateMedia().then(() => {
  console.log('\nMigration completed!');
  process.exit(0);
}).catch((error) => {
  console.error('Migration error:', error);
  process.exit(1);
});
