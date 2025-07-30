// scripts/set-environment.js
const fs = require('fs');
const path = require('path');

const envDir = path.resolve(__dirname, '../src/environments');
const envFile = path.join(envDir, 'environment.ts');

// Verificamos que estén todas las variables de entorno necesarias
const { 
  supabaseUrl, 
  supabaseKey, 
  vapidPublicKey, 
  vapidPrivateKey 
} = process.env;

// Lista de variables requeridas
const requiredVars = {
  supabaseUrl,
  supabaseKey,
  vapidPublicKey,
  vapidPrivateKey
};

// Verificar que todas las variables estén presentes
const missingVars = Object.entries(requiredVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('❌ ERROR: Faltan las siguientes variables de entorno:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\n💡 Asegúrate de configurar estas variables en Netlify:');
  console.error('   Variables de Supabase: supabaseUrl, supabaseKey');
  console.error('   Variables VAPID: vapidPublicKey, vapidPrivateKey');
  process.exit(1);
}

// Generamos el contenido del archivo
const envContent = `// ⚠️ Generado automáticamente por set-environment.js
// ⚠️ NO EDITAR MANUALMENTE - Se sobrescribe en cada build
export const environment = {
  production: true,
  supabaseUrl: '${supabaseUrl}',
  supabaseKey: '${supabaseKey}',
  vapidPublicKey: '${vapidPublicKey}',
  vapidPrivateKey: '${vapidPrivateKey}'
};
`;

if (!fs.existsSync(envDir)) {
  fs.mkdirSync(envDir, { recursive: true });
}

fs.writeFileSync(envFile, envContent);
console.log('✔️ Archivo environment.ts generado correctamente');
console.log('✅ Variables configuradas:');
console.log(`   - Supabase URL: ${supabaseUrl.substring(0, 30)}...`);
console.log(`   - Supabase Key: ${supabaseKey.substring(0, 30)}...`);
console.log(`   - VAPID Public Key: ${vapidPublicKey.substring(0, 30)}...`);
console.log(`   - VAPID Private Key: ${vapidPrivateKey.substring(0, 30)}...`);
