#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Configuración de Edge Function de notificaciones push...');

try {
  // Verificar si existe la carpeta de la Edge Function
  const functionPath = path.join(__dirname, '..', 'supabase', 'functions', 'send-push-notification');
  
  if (!fs.existsSync(functionPath)) {
    console.error('❌ No se encontró la carpeta de la Edge Function');
    console.error('Asegúrate de que existe: supabase/functions/send-push-notification/');
    process.exit(1);
  }

  console.log('✅ Carpeta de Edge Function encontrada');
  console.log('');
  console.log('📋 Instrucciones para desplegar manualmente:');
  console.log('');
  console.log('1. Instala Supabase CLI usando uno de estos métodos:');
  console.log('');
  console.log('   Opción A - Chocolatey:');
  console.log('   choco install supabase');
  console.log('');
  console.log('   Opción B - Scoop:');
  console.log('   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git');
  console.log('   scoop install supabase');
  console.log('');
  console.log('   Opción C - Descarga directa:');
  console.log('   https://github.com/supabase/cli/releases');
  console.log('');
  console.log('2. Loguea en Supabase:');
  console.log('   supabase login');
  console.log('');
  console.log('3. Desplega la Edge Function:');
  console.log('   supabase functions deploy send-push-notification');
  console.log('');
  console.log('4. Configura las variables de entorno en Supabase Dashboard:');
  console.log('   - Ve a Settings > Edge Functions');
  console.log('   - Agrega estas variables:');
  console.log('     VAPID_PUBLIC_KEY=tu_clave_publica_vapid');
  console.log('     VAPID_PRIVATE_KEY=tu_clave_privada_vapid');
  console.log('     VAPID_EMAIL=tu_email@ejemplo.com');
  console.log('');
  console.log('5. Prueba las notificaciones en tu aplicación');
  console.log('');
  console.log('📁 Archivos de la Edge Function:');
  console.log(`   - ${functionPath}/index.ts`);
  console.log(`   - ${functionPath}/config.toml`);
  console.log('');
  console.log('✅ Configuración lista para desplegar manualmente');

} catch (error) {
  console.error('❌ Error en la configuración:', error.message);
  process.exit(1);
} 