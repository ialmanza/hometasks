// scripts/set-environment-dev.js
const fs = require('fs');
const path = require('path');

const envDir = path.resolve(__dirname, '../src/environments');
const envFile = path.join(envDir, 'environment.development.ts');

// Variables de desarrollo (pueden ser hardcodeadas para desarrollo local)
const devEnvironment = {
  production: false,
  supabaseUrl: 'https://fdqcganrmqgepkxgkugn.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkcWNnYW5ybXFnZXBreGdrdWduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTQ4NzgyMTIsImV4cCI6MjAzMDQ1NDIxMn0.Q77MmGHtF3JzebU8Z05bWYVO4uGhxoYwIxPnxUQY870',
  vapidPublicKey: 'BFxcRqy-X8ub88vwPJwnVOnaG_04a6gB-rWpJm9auOAp9eAPvZLhXBHbL6J__pJAltNqybaqXum9q268OrZWgbE',
  vapidPrivateKey: 'fC5culj9F31V1-DRNPIFBEAqjNqXtp8U6Oe8tWTZYdg'
};

// Generamos el contenido del archivo
const envContent = `// ⚠️ Generado automáticamente por set-environment-dev.js
// ⚠️ Configuración para desarrollo local
export const environment = {
  production: ${devEnvironment.production},
  supabaseUrl: '${devEnvironment.supabaseUrl}',
  supabaseKey: '${devEnvironment.supabaseKey}',
  vapidPublicKey: '${devEnvironment.vapidPublicKey}',
  vapidPrivateKey: '${devEnvironment.vapidPrivateKey}'
};
`;

if (!fs.existsSync(envDir)) {
  fs.mkdirSync(envDir, { recursive: true });
}

fs.writeFileSync(envFile, envContent);
console.log('✔️ Archivo environment.development.ts generado correctamente');
console.log('✅ Configuración de desarrollo lista'); 