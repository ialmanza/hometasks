const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sourceImage = path.join(__dirname, '../public/logo mobile.png');
const outputPath = path.join(__dirname, '../public/favicon.ico');

async function generateFavicon() {
  try {
    console.log('Generando favicon desde:', sourceImage);
    
    // Generar múltiples tamaños de favicon para mejor compatibilidad
    const sizes = [16, 32, 48];
    
    // Generar favicon.png de 32x32 (tamaño estándar)
    const pngOutputPath = path.join(__dirname, '../public/favicon.png');
    await sharp(sourceImage)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(pngOutputPath);
    
    console.log('✓ Favicon PNG generado: favicon.png');
    
    // Copiar el PNG como ICO (los navegadores modernos aceptan PNG con extensión .ico)
    // O mejor, generar un ICO usando el PNG de 32x32
    // Para compatibilidad máxima, copiamos el PNG como favicon.ico también
    const icoPngPath = path.join(__dirname, '../public/favicon.ico');
    await sharp(sourceImage)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(icoPngPath);
    
    console.log('✓ Favicon ICO generado: favicon.ico (PNG con extensión .ico)');
    
  } catch (error) {
    console.error('Error al generar favicon:', error);
    process.exit(1);
  }
}

generateFavicon();

