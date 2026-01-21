const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sourceImage = path.join(__dirname, '../public/logo mobile.png');
const outputDir = path.join(__dirname, '../public/icons');

// Tamaños de íconos requeridos para PWA
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Asegurar que el directorio de salida existe
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  try {
    console.log('Generando íconos desde:', sourceImage);
    
    for (const size of iconSizes) {
      const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
      
      await sharp(sourceImage)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Generado: icon-${size}x${size}.png`);
    }
    
    console.log('\n¡Todos los íconos han sido generados exitosamente!');
  } catch (error) {
    console.error('Error al generar íconos:', error);
    process.exit(1);
  }
}

generateIcons();

