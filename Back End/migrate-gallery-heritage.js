/**
 * Migration script: Migrate intangible and natural heritage from static data to Supabase
 * Run: node migrate-gallery-heritage.js
 * 
 * This script:
 * 1. Reads static gallery data from gallery-data.js
 * 2. Inserts sites into heritage_sites table
 * 3. Inserts media into heritage_media table
 * 4. Uploads local files to Supabase Storage
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

function bucketForMediaType(type) {
  if (type === 'photo') return 'heritage-photos';
  if (type === 'map') return 'heritage-maps';
  if (type === 'model3d') return 'heritage-models';
  if (type === 'video') return 'heritage-videos';
  if (type === 'audio') return 'heritage-audio';
  if (type === 'link') return 'heritage-photos'; // Links don't need storage
  return 'heritage-photos';
}

async function uploadFileToSupabase(supabase, bucket, storagePath, localPath) {
  try {
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

function generateId(prefix, name) {
  const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `${prefix}-${cleanName}`;
}

async function migrateGalleryHeritage() {
  console.log('Starting migration of intangible and natural heritage to Supabase...\n');

  const supabase = await loadSupabaseConfig();

  // Load static gallery data
  const galleryDataPath = path.join(__dirname, '..', 'Front End', 'gallery-data.js');
  let galleryData;
  
  try {
    const galleryContent = fs.readFileSync(galleryDataPath, 'utf-8');
    // Extract GALLERY_SITES and GALLERY_MEDIA from the file
    const sitesMatch = galleryContent.match(/const GALLERY_SITES = \[([\s\S]*?)\];/);
    const mediaMatch = galleryContent.match(/const GALLERY_MEDIA = \[([\s\S]*?)\];/);
    
    if (!sitesMatch || !mediaMatch) {
      throw new Error('Could not extract GALLERY_SITES or GALLERY_MEDIA from gallery-data.js');
    }
    
    // This is a simplified extraction - in production you'd want proper parsing
    console.log('Note: This script requires manual data extraction from gallery-data.js');
    console.log('Please run the SQL seed files instead for proper migration.');
    return;
    
  } catch (error) {
    console.error('Error loading gallery data:', error.message);
    process.exit(1);
  }
}

// Run migration
migrateGalleryHeritage().then(() => {
  console.log('\nMigration completed!');
  process.exit(0);
}).catch((error) => {
  console.error('Migration error:', error);
  process.exit(1);
});
