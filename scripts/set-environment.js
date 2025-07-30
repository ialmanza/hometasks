// scripts/set-environment.js
const fs = require('fs');
const path = require('path');

const envDir = path.resolve(__dirname, '../src/environments');
const envFile = path.join(envDir, 'environment.ts');

// Verificamos que estén las variables de entorno
const { supabaseUrl, supabaseKey } = process.env;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERROR: faltan variables de entorno supabaseUrl o supabaseKey.');
  process.exit(1);
}

// Generamos el contenido del archivo
const envContent = `// ⚠️ Generado automáticamente por set-environment.js
export const environment = {
  production: true,
  supabaseUrl: '${supabaseUrl}',
  supabaseKey: '${supabaseKey}'
};
`;

if (!fs.existsSync(envDir)) {
  fs.mkdirSync(envDir, { recursive: true });
}

fs.writeFileSync(envFile, envContent);
console.log('✔️ Archivo environment.ts generado correctamente');
