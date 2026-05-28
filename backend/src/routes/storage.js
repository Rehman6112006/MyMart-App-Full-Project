// Image Upload Routes for MyMart
const express = require('express');
const router = express.Router();
const { supabase, successResponse, errorResponse } = require('../config/supabase');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');

// Health check for storage connection - public endpoint for testing
router.get('/health', async (req, res) => {
  try {
    // Check if Supabase key is valid
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!serviceKey || serviceKey.includes('YOUR_') || serviceKey.includes('PASTE_')) {
      return res.status(500).json({
        success: false,
        error: 'SUPABASE_SERVICE_ROLE_KEY is not configured or is placeholder',
        hint: 'Please update SUPABASE_SERVICE_ROLE_KEY in .env file with your actual Supabase service role key'
      });
    }
    
    // Test Supabase connection
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Supabase connection failed',
        details: error.message,
        hint: 'Check if SUPABASE_SERVICE_ROLE_KEY is correct and valid'
      });
    }
    
    res.json({
      success: true,
      message: 'Storage connection OK',
      buckets: data.map(b => ({ name: b.name, public: b.public }))
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Storage health check failed',
      details: err.message
    });
  }
});

// Debug endpoint to test upload with sample image
router.post('/test-upload', async (req, res) => {
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!serviceKey || serviceKey.includes('YOUR_') || serviceKey.includes('PASTE_')) {
      return res.status(500).json({
        success: false,
        error: 'SUPABASE_SERVICE_ROLE_KEY is placeholder',
        hint: 'Please add your actual Supabase service role key to .env'
      });
    }
    
    // Create a simple 1x1 red PNG image
    const sampleImage = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
      'base64'
    );
    
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(`test/test-${Date.now()}.png`, sampleImage, {
        contentType: 'image/png',
        cacheControl: '3600'
      });
    
    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Upload test failed',
        details: error.message,
        possibleCauses: [
          'Bucket "product-images" does not exist',
          'RLS policies do not allow upload',
          'Service role key is invalid'
        ]
      });
    }
    
    res.json({
      success: true,
      message: 'Test upload successful! Storage is configured correctly.',
      file: data
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Test upload failed',
      details: err.message
    });
  }
});

// Upload product image - SUPPORTS BOTH: Base64 (PC File) OR Image URL
router.post('/product-image', authMiddleware, roleMiddleware(['vendor', 'admin']), async (req, res) => {
  try {
    const { imageData, imageUrl, productId } = req.body;
    
    // Check if we have image data (base64 from PC) OR image URL
    if (!imageData && !imageUrl) {
      return res.status(400).json(errorResponse('Either imageData (base64) or imageUrl is required'));
    }

    const finalProductId = productId || `temp-${Date.now()}`;
    let imageUrlResult = null;

    // CASE 1: Image URL provided - just use it directly
    if (imageUrl && !imageData) {
      console.log('📤 Using image URL:', imageUrl);
      
      // Validate URL
      try {
        new URL(imageUrl);
      } catch (e) {
        return res.status(400).json(errorResponse('Invalid image URL format'));
      }
      
      imageUrlResult = imageUrl;
    }
    
    // CASE 2: Base64/PC file - upload to Supabase
    else if (imageData) {
      console.log('📤 Uploading image from PC to Supabase...');
      
      // Decode base64 image
      let base64Data = imageData;
      if (imageData.includes(';base64,')) {
        base64Data = imageData.split(';base64,').pop();
      }
      
      let buffer;
      try {
        buffer = Buffer.from(base64Data, 'base64');
      } catch (bufferError) {
        console.error('Buffer creation error:', bufferError);
        return res.status(400).json(errorResponse('Invalid base64 image data'));
      }
      
      // Determine content type from base64 header
      let contentType = 'image/png';
      if (imageData.startsWith('data:image/jpeg') || imageData.startsWith('data:image/jpg')) {
        contentType = 'image/jpeg';
      } else if (imageData.startsWith('data:image/webp')) {
        contentType = 'image/webp';
      } else if (imageData.startsWith('data:image/gif')) {
        contentType = 'image/gif';
      }
      
      // Generate filename with proper extension
      const extension = contentType.split('/')[1];
      const fileName = `public/${finalProductId}-${Date.now()}.${extension}`;

      console.log('   Bucket: product-images');
      console.log('   Filename:', fileName);
      console.log('   Content-Type:', contentType);
      console.log('   Buffer size:', buffer.length, 'bytes');

      // Check if bucket exists
      const { data: bucketData, error: bucketError } = await supabase.storage.listBuckets();
      if (bucketError) {
        console.error('❌ Error listing buckets:', bucketError);
        return res.status(500).json(errorResponse(
          'Failed to connect to Supabase Storage',
          { supabaseError: bucketError.message }
        ));
      }
      
      const bucket = bucketData?.find(b => b.name === 'product-images');
      if (!bucket) {
        console.error('❌ Bucket "product-images" not found');
        return res.status(500).json(errorResponse(
          'Storage bucket "product-images" not found. Create it in Supabase Dashboard → Storage'
        ));
      }

      console.log('   Bucket found, uploading...');

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, buffer, {
          contentType: contentType,
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ Supabase upload error:', error);
        return res.status(500).json(errorResponse('Failed to upload image', {
          error: error.message,
          hint: 'Make sure RLS policies allow uploads to this bucket'
        }));
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      imageUrlResult = publicUrl;
      console.log('✅ Image uploaded successfully:', publicUrl);
    }

    res.json(successResponse('Image processed successfully', { imageUrl: imageUrlResult }));
    
  } catch (error) {
    console.error('❌ Image upload error:', error);
    res.status(500).json(errorResponse('Failed to upload image', { error: error.message }));
  }
});

// Upload store logo to Supabase Storage
router.post('/store-logo', authMiddleware, roleMiddleware(['vendor', 'admin']), async (req, res) => {
  try {
    const { imageData, storeId } = req.body;
    
    if (!imageData || !storeId) {
      return res.status(400).json(errorResponse('Image data and store ID are required'));
    }

    // Decode base64 image
    const base64Data = imageData.split(';base64,').pop();
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Generate filename
    const fileName = `public/${storeId}-${Date.now()}.png`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('store-logos')
      .upload(fileName, buffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return res.status(500).json(errorResponse('Failed to upload logo', error.message));
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('store-logos')
      .getPublicUrl(fileName);

    // Also update the store's logo field in the database
    const pool = require('../config/database');
    await pool.query('UPDATE stores SET logo = $1 WHERE id = $2', [publicUrl, storeId]);

    res.json(successResponse('Logo uploaded successfully', { imageUrl: publicUrl }));
    
  } catch (error) {
    console.error('Logo upload error:', error);
    res.status(500).json(errorResponse('Failed to upload logo', error.message));
  }
});

// Upload banner image
router.post('/banner-image', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const { imageData } = req.body;

    if (!imageData) {
      return res.status(400).json(errorResponse('Image data (base64) is required'));
    }

    let base64Data = imageData;
    if (imageData.includes(';base64,')) {
      base64Data = imageData.split(';base64,').pop();
    }

    let buffer;
    try {
      buffer = Buffer.from(base64Data, 'base64');
    } catch (e) {
      return res.status(400).json(errorResponse('Invalid base64 image data'));
    }

    let contentType = 'image/png';
    if (imageData.startsWith('data:image/jpeg') || imageData.startsWith('data:image/jpg')) {
      contentType = 'image/jpeg';
    } else if (imageData.startsWith('data:image/webp')) {
      contentType = 'image/webp';
    } else if (imageData.startsWith('data:image/gif')) {
      contentType = 'image/gif';
    }

    const extension = contentType.split('/')[1];
    const fileName = `banners/banner-${Date.now()}.${extension}`;

    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, buffer, {
        contentType,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      return res.status(500).json(errorResponse('Failed to upload banner image', {
        error: error.message,
        hint: 'Make sure RLS policies allow uploads to product-images bucket'
      }));
    }

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    res.json(successResponse('Banner image uploaded', { imageUrl: publicUrl }));
  } catch (error) {
    console.error('Banner image upload error:', error);
    res.status(500).json(errorResponse('Failed to upload banner image', { error: error.message }));
  }
});

// Upload user avatar
router.post('/avatar', authMiddleware, async (req, res) => {
  try {
    const { imageData, userId } = req.body;
    
    if (!imageData || !userId) {
      return res.status(400).json(errorResponse('Image data and user ID are required'));
    }

    // Decode base64 image
    const base64Data = imageData.split(';base64,').pop();
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Generate filename
    const fileName = `public/${userId}-${Date.now()}.png`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('user-avatars')
      .upload(fileName, buffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return res.status(500).json(errorResponse('Failed to upload avatar', error.message));
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('user-avatars')
      .getPublicUrl(fileName);

    res.json(successResponse('Avatar uploaded successfully', { imageUrl: publicUrl }));
    
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json(errorResponse('Failed to upload avatar', error.message));
  }
});

module.exports = router;