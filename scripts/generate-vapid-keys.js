const webpush = require('web-push');

// Generar claves VAPID
const vapidKeys = webpush.generateVAPIDKeys();

console.log('Claves VAPID generadas:');
console.log('Public Key:', vapidKeys.publicKey);
console.log('Private Key:', vapidKeys.privateKey);

console.log('\nPara usar en tu aplicación:');
console.log('1. Copia la Public Key a environment.ts');
console.log('2. Guarda la Private Key de forma segura (solo para el servidor)');
console.log('3. Nunca expongas la Private Key en el cliente');

// También puedes usar estas claves para testing
console.log('\nClaves de ejemplo para testing:');
console.log('Public Key: BEl62iUYgUivxIkv69yViEuiBIa1FQj8vF8jZ8N7yHvOLHGRnPLlirH1qgJ3GweM96epkTQ5_e9qYEw9Bp1FZDlI');
console.log('Private Key: Vk5OeMdb9H-2bLNXsJaFPGmfCHjiVE4E0Oq3qWsE6jU'); 