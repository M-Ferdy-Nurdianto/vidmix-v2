const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function validateImageFile(inputPath) {
  try {
    const metadata = await sharp(inputPath).metadata();
    return {
      valid: true,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format
    };
  } catch (error) {
    return {
      valid: false,
      error: `Format gambar tidak didukung atau file rusak: ${error.message}`
    };
  }
}

async function normalizeStickerImage(inputPath, outputPath, maxDimension = 1000) {
  try {
    const info = await sharp(inputPath)
      .resize(maxDimension, maxDimension, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .png()
      .toFile(outputPath);
      
    return {
      width: info.width,
      height: info.height,
      format: info.format
    };
  } catch (error) {
    throw new Error(`Gagal normalisasi gambar: ${error.message}`);
  }
}

async function generateThumbnail(inputPath, outputPath, size = 150) {
  try {
    // Generate PNG thumbnail to preserve alpha
    await sharp(inputPath)
      .resize(size, size, {
        fit: 'cover'
      })
      .png()
      .toFile(outputPath);
  } catch (error) {
    console.error(`Gagal membuat thumbnail untuk ${inputPath}:`, error.message);
  }
}

module.exports = {
  validateImageFile,
  normalizeStickerImage,
  generateThumbnail
};
