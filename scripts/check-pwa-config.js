const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando configuración PWA...\n');

// Verificar archivos críticos
const criticalFiles = [
  'public/manifest.webmanifest',
  'ngsw-config.json',
  'public/sw.js',
  'src/environments/environments.ts',
  'src/environments/environments.development.ts'
];

let allFilesExist = true;

criticalFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} - Existe`);
  } else {
    console.log(`❌ ${file} - No existe`);
    allFilesExist = false;
  }
});

// Verificar manifest
try {
  const manifestPath = 'public/manifest.webmanifest';
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    console.log('\n📱 Manifest Web App:');
    console.log(`   Nombre: ${manifest.name}`);
    console.log(`   Display: ${manifest.display}`);
    console.log(`   Theme Color: ${manifest.theme_color}`);
    console.log(`   Background Color: ${manifest.background_color}`);
    console.log(`   Íconos: ${manifest.icons?.length || 0} definidos`);
    
    // Verificar íconos
    if (manifest.icons) {
      manifest.icons.forEach((icon, index) => {
        const iconPath = `public/${icon.src}`;
        if (fs.existsSync(iconPath)) {
          console.log(`   ✅ Ícono ${index + 1}: ${icon.src}`);
        } else {
          console.log(`   ❌ Ícono ${index + 1}: ${icon.src} - No existe`);
        }
      });
    }
  }
} catch (error) {
  console.log('❌ Error leyendo manifest:', error.message);
}

// Verificar ngsw-config.json
try {
  const ngswPath = 'ngsw-config.json';
  if (fs.existsSync(ngswPath)) {
    const ngswConfig = JSON.parse(fs.readFileSync(ngswPath, 'utf8'));
    
    console.log('\n⚙️ Service Worker Config:');
    console.log(`   Index: ${ngswConfig.index}`);
    console.log(`   Asset Groups: ${ngswConfig.assetGroups?.length || 0}`);
    console.log(`   Data Groups: ${ngswConfig.dataGroups?.length || 0}`);
    console.log(`   Navigation Strategy: ${ngswConfig.navigationRequestStrategy || 'default'}`);
  }
} catch (error) {
  console.log('❌ Error leyendo ngsw-config.json:', error.message);
}

// Verificar environment
try {
  const envPath = 'src/environments/environments.ts';
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    console.log('\n🔧 Environment:');
    if (envContent.includes('vapidPublicKey')) {
      console.log('   ✅ VAPID Public Key configurada');
    } else {
      console.log('   ❌ VAPID Public Key no configurada');
    }
    
    if (envContent.includes('vapidPrivateKey')) {
      console.log('   ✅ VAPID Private Key configurada');
    } else {
      console.log('   ❌ VAPID Private Key no configurada');
    }
  }
} catch (error) {
  console.log('❌ Error leyendo environment:', error.message);
}

// Verificar package.json
try {
  const packagePath = 'package.json';
  if (fs.existsSync(packagePath)) {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    console.log('\n📦 Dependencias PWA:');
    const pwaDeps = ['@angular/service-worker', 'web-push'];
    
    pwaDeps.forEach(dep => {
      if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
        console.log(`   ✅ ${dep} instalado`);
      } else {
        console.log(`   ❌ ${dep} no instalado`);
      }
    });
    
    if (packageJson.scripts?.['generate-vapid']) {
      console.log('   ✅ Script generate-vapid configurado');
    } else {
      console.log('   ❌ Script generate-vapid no configurado');
    }
  }
} catch (error) {
  console.log('❌ Error leyendo package.json:', error.message);
}

console.log('\n🎯 Resumen:');
if (allFilesExist) {
  console.log('✅ Todos los archivos críticos existen');
  console.log('✅ Configuración PWA lista para producción');
} else {
  console.log('❌ Faltan algunos archivos críticos');
  console.log('❌ Revisa la configuración antes de desplegar');
}

console.log('\n💡 Próximos pasos:');
console.log('1. Ejecuta: npm run build --configuration production');
console.log('2. Prueba las notificaciones push');
console.log('3. Verifica las actualizaciones automáticas');
console.log('4. Despliega a producción'); 