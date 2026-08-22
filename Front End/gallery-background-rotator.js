/**
 * Gallery Background Rotator
 * Randomly changes background photos every 3 seconds based on database images
 */

(function() {
  'use strict';

  let rotationInterval = null;
  let intangiblePhotos = [];
  let naturalPhotos = [];
  let isInitialized = false;
  let preloadedImages = new Map(); // Cache for preloaded images
  let resizeTimeout = null; // Debounce timer for resize events

  // Default fallback images - using only confirmed working images
  const DEFAULT_INTANGIBLE_IMAGES = [
    'data/Intangible Cultural Heritage/Sambuokan Festival/Photographs/0M8A2763.jpg',
    'data/Intangible Cultural Heritage/Sambuokan Festival/Photographs/DJI_0160.JPG',
    'data/Intangible Cultural Heritage/Sambuokan Festival/Photographs/0M8A2806.jpg',
    'data/Intangible Cultural Heritage/Sambuokan Festival/Photographs/0M8A3170.JPG',
    'data/Intangible Cultural Heritage/Sambuokan Festival/Photographs/0M8A3597.JPG'
  ];
  
  const DEFAULT_NATURAL_IMAGES = [
    'data/Natural Heritage/Pujada Island/Photographs/pujada island 1.jpg',
    'data/Natural Heritage/Pujada Island/Photographs/pujada island.jpg',
    'data/Natural Heritage/Pujada Island/Photographs/pujada island-3.jpg',
    'data/Natural Heritage/Taytay Daga (Sleeping Dinosaur)/Photographs/DJI_0761.jpg',
    'data/Natural Heritage/Taytay Daga (Sleeping Dinosaur)/Photographs/DJI_0771.jpg'
  ];

  /**
   * Preload an image and return a promise that resolves when loaded
   */
  function preloadImage(src) {
    return new Promise((resolve, reject) => {
      if (preloadedImages.has(src)) {
        const cached = preloadedImages.get(src);
        resolve(cached === null ? null : cached); // Return null if previously failed
        return;
      }

      const img = new Image();
      img.onload = () => {
        preloadedImages.set(src, img);
        resolve(img);
      };
      img.onerror = () => {
        preloadedImages.set(src, null); // Mark as failed
        resolve(null);
      };
      img.src = src;
    });
  }

  /**
   * Preload all images from both categories
   */
  async function preloadAllImages() {
    const allImages = [...intangiblePhotos, ...naturalPhotos];
    
    // Preload in batches to avoid overwhelming the browser
    const batchSize = 5;
    for (let i = 0; i < allImages.length; i += batchSize) {
      const batch = allImages.slice(i, i + batchSize);
      await Promise.all(batch.map(preloadImage));
    }
  }

  /**
   * Fetch all photos from the database for both heritage categories
   */
  async function fetchHeritagePhotos() {
    try {
      if (typeof MatiSupabaseApi === 'undefined' || typeof MatiSupabaseApi.listMedia !== 'function') {
        setDefaultImages();
        await preloadAllImages();
        return;
      }

      // Fetch all media (photos) from the database
      const allMedia = await MatiSupabaseApi.listMedia(null);
      
      if (!allMedia || allMedia.length === 0) {
        setDefaultImages();
        await preloadAllImages();
        return;
      }

      // Filter for photo type and categorize by heritage type
      intangiblePhotos = allMedia
        .filter(item => item.type === 'photo' && isIntangibleMedia(item))
        .map(item => item.src)
        .filter(src => src && src.length > 0);

      naturalPhotos = allMedia
        .filter(item => item.type === 'photo' && isNaturalMedia(item))
        .map(item => item.src)
        .filter(src => src && src.length > 0);

      // If no photos found in database, fall back to default images
      if (intangiblePhotos.length === 0) {
        intangiblePhotos = [...DEFAULT_INTANGIBLE_IMAGES];
      }
      if (naturalPhotos.length === 0) {
        naturalPhotos = [...DEFAULT_NATURAL_IMAGES];
      }

      // Preload all images
      await preloadAllImages();

    } catch (error) {
      setDefaultImages();
      await preloadAllImages();
    }
  }

  function setDefaultImages() {
    intangiblePhotos = [...DEFAULT_INTANGIBLE_IMAGES];
    naturalPhotos = [...DEFAULT_NATURAL_IMAGES];
  }

  /**
   * Determine if media belongs to intangible cultural heritage
   */
  function isIntangibleMedia(item) {
    const src = (item.src || '').toLowerCase();
    
    // MUST be in intangible cultural heritage folder
    if (!src.includes('intangible cultural heritage')) {
      return false;
    }
    
    // Exclude if also in natural heritage (shouldn't happen but just in case)
    if (src.includes('natural heritage')) {
      return false;
    }
    
    return true;
  }

  /**
   * Determine if media belongs to natural heritage
   */
  function isNaturalMedia(item) {
    const src = (item.src || '').toLowerCase();
    
    // MUST be in natural heritage folder
    if (!src.includes('natural heritage')) {
      return false;
    }
    
    // Exclude if also in intangible cultural heritage (shouldn't happen but just in case)
    if (src.includes('intangible cultural heritage')) {
      return false;
    }
    
    return true;
  }

  /**
   * Get random photo from each category (only from successfully preloaded images)
   */
  function getRandomPhotos() {
    // Filter out images that failed to preload
    const workingIntangible = intangiblePhotos.filter(src => {
      const cached = preloadedImages.get(src);
      return cached !== null;
    });
    
    const workingNatural = naturalPhotos.filter(src => {
      const cached = preloadedImages.get(src);
      return cached !== null;
    });
    
    // Use working images if available, otherwise fall back to defaults
    const intangiblePhoto = workingIntangible.length > 0 
      ? workingIntangible[Math.floor(Math.random() * workingIntangible.length)]
      : DEFAULT_INTANGIBLE_IMAGES[Math.floor(Math.random() * DEFAULT_INTANGIBLE_IMAGES.length)];
    
    const naturalPhoto = workingNatural.length > 0 
      ? workingNatural[Math.floor(Math.random() * workingNatural.length)]
      : DEFAULT_NATURAL_IMAGES[Math.floor(Math.random() * DEFAULT_NATURAL_IMAGES.length)];

    return { intangiblePhoto, naturalPhoto };
  }

  /**
   * Update the CSS background with new random photos with smooth crossfade
   */
  function updateBackground() {
    const categoryStage = document.querySelector('.gal-category-stage');
    if (!categoryStage) {
      return;
    }

    const { intangiblePhoto, naturalPhoto } = getRandomPhotos();
    
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobilePortrait = window.innerWidth <= 640;
    
    // Adjust fade duration based on device and preferences
    const fadeDuration = prefersReducedMotion ? 0 : (isMobilePortrait ? 300 : 500);
    
    // Ensure images are preloaded before showing
    Promise.all([
      preloadImage(intangiblePhoto),
      preloadImage(naturalPhoto)
    ]).then(() => {
      // Update the global stage background (for desktop/tablet)
      categoryStage.style.setProperty('--gal-bg-intangible', `url("${intangiblePhoto}")`);
      categoryStage.style.setProperty('--gal-bg-natural', `url("${naturalPhoto}")`);
      
      // On mobile portrait, also update individual card backgrounds
      if (isMobilePortrait) {
        const intangibleCard = document.querySelector('.gal-category-card--intangible');
        const naturalCard = document.querySelector('.gal-category-card--natural');
        
        if (intangibleCard) {
          intangibleCard.style.setProperty('--gal-card-bg-intangible', `url("${intangiblePhoto}")`);
        }
        if (naturalCard) {
          naturalCard.style.setProperty('--gal-card-bg-natural', `url("${naturalPhoto}")`);
        }
      }
      
      // Skip transition for reduced motion
      if (prefersReducedMotion) {
        return;
      }
      
      // Add transitioning class for fade effect (desktop/tablet only)
      if (!isMobilePortrait) {
        categoryStage.classList.add('gal-category-stage--transitioning');
        
        // Wait for fade out, then remove transitioning class to fade in
        setTimeout(() => {
          requestAnimationFrame(() => {
            categoryStage.classList.remove('gal-category-stage--transitioning');
          });
        }, fadeDuration);
      }
    });
  }

  /**
   * Start the background rotation
   */
  function startRotation() {
    if (rotationInterval) {
      clearInterval(rotationInterval);
    }
    
    // Set initial background
    updateBackground();
    
    // Adjust rotation interval based on device
    const isMobilePortrait = window.innerWidth <= 640;
    const rotationIntervalTime = isMobilePortrait ? 5000 : 3000; // Slower on mobile for performance
    
    // Start rotation interval
    rotationInterval = setInterval(updateBackground, rotationIntervalTime);
    
    // Handle resize events to adjust rotation speed
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        // Restart rotation with new interval
        if (rotationInterval) {
          clearInterval(rotationInterval);
        }
        const newIsMobilePortrait = window.innerWidth <= 640;
        const newIntervalTime = newIsMobilePortrait ? 5000 : 3000;
        rotationInterval = setInterval(updateBackground, newIntervalTime);
      }, 250);
    });
  }

  /**
   * Initialize the background rotation
   */
  async function initBackgroundRotation() {
    if (isInitialized) return;
    isInitialized = true;

    // First, set default images to ensure we have something to work with
    setDefaultImages();

    // Try to fetch from database in background
    fetchHeritagePhotos().catch(err => {
      // Using defaults
    });

    // Use MutationObserver to watch for category stage element
    const observer = new MutationObserver((mutations) => {
      const categoryStage = document.querySelector('.gal-category-stage');
      if (categoryStage && !rotationInterval) {
        startRotation();
      }
    });

    // Start observing the document
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Check if element already exists
    const categoryStage = document.querySelector('.gal-category-stage');
    if (categoryStage) {
      startRotation();
    }

    // Clean up observer after 10 seconds if element not found
    setTimeout(() => {
      observer.disconnect();
    }, 10000);
  }

  /**
   * Stop the background rotation
   */
  function stopBackgroundRotation() {
    if (rotationInterval) {
      clearInterval(rotationInterval);
      rotationInterval = null;
    }
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
      resizeTimeout = null;
    }
  }

  /**
   * Reinitialize the background rotation (call when data changes)
   */
  async function reinitializeRotation() {
    stopBackgroundRotation();
    isInitialized = false;
    await initBackgroundRotation();
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBackgroundRotation);
  } else {
    initBackgroundRotation();
  }

  // Expose control functions globally
  window.GalleryBackgroundRotator = {
    stop: stopBackgroundRotation,
    reinitialize: reinitializeRotation,
    updateNow: updateBackground
  };

})();