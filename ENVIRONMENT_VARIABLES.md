# Variables de Entorno - Hometasks PWA

## 🔐 Variables Requeridas para Producción

Estas variables deben configurarse en **Netlify** para el despliegue en producción:

### **Supabase Variables**
| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `supabaseUrl` | URL de tu proyecto Supabase | `https://tu-proyecto.supabase.co` |
| `supabaseKey` | Clave anónima de Supabase | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

### **VAPID Variables (Notificaciones Push)**
| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `vapidPublicKey` | Clave pública VAPID | `TU_CLAVE_PUBLICA_VAPID_AQUI` |
| `vapidPrivateKey` | Clave privada VAPID | `TU_CLAVE_PRIVADA_VAPID_AQUI` |

## 🚀 Configuración en Netlify

### **1. Ir a Netlify Dashboard**
- Ve a tu proyecto en Netlify
- Navega a **Site settings** → **Environment variables**

### **2. Agregar Variables**
Agrega estas variables con sus valores correspondientes:

```
supabaseUrl = https://tu-proyecto.supabase.co
supabaseKey = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tu-clave-anonima-aqui
vapidPublicKey = TU_CLAVE_PUBLICA_VAPID_AQUI
vapidPrivateKey = TU_CLAVE_PRIVADA_VAPID_AQUI
```

**💡 Nota:** Reemplaza los valores de ejemplo con tus claves reales de Supabase y VAPID.

### **3. Configurar Build Command**
En Netlify, asegúrate de que el build command sea:
```bash
npm run build
```

## 🔧 Desarrollo Local

### **Para desarrollo local:**
```bash
npm run setup-dev
npm start
```

### **Para producción:**
```bash
npm run build
```

## 🛡️ Seguridad

### **¿Por qué es una buena práctica?**

1. **🔒 Protección de Claves**: Las claves sensibles no se exponen en el código
2. **🚫 Prevención de Acceso No Autorizado**: Evita que terceros accedan a tu base de datos
3. **📊 Flexibilidad**: Puedes cambiar configuraciones sin tocar código
4. **🌍 Entornos Separados**: Diferentes configuraciones para dev/prod
5. **🔍 Auditoría**: Mejor control de qué claves están en uso

### **Variables Sensibles que NO deben estar en GitHub:**
- ✅ `supabaseKey` (clave de acceso a la base de datos)
- ✅ `vapidPrivateKey` (clave privada para notificaciones)
- ✅ Cualquier clave de API privada
- ✅ URLs de bases de datos internas

### **Variables que SÍ pueden estar en GitHub:**
- ✅ `supabaseUrl` (URL pública del proyecto)
- ✅ `vapidPublicKey` (clave pública para notificaciones)
- ✅ Configuraciones de desarrollo

## 🔍 Verificación

### **Verificar configuración local:**
```bash
npm run check-pwa
```

### **Verificar variables en Netlify:**
1. Ve a **Site settings** → **Environment variables**
2. Verifica que todas las variables estén configuradas
3. Revisa que no haya espacios extra en los valores

## 🚨 Troubleshooting

### **Error: "Faltan variables de entorno"**
- Verifica que todas las variables estén configuradas en Netlify
- Asegúrate de que los nombres coincidan exactamente
- Revisa que no haya espacios en blanco

### **Error: "Notificaciones push no funcionan"**
- Verifica que las claves VAPID estén correctas
- Confirma que las claves coincidan con las generadas
- Revisa los logs del service worker

### **Error: "No se puede conectar a Supabase"**
- Verifica que la URL y clave de Supabase sean correctas
- Confirma que el proyecto Supabase esté activo
- Revisa los permisos de la clave anónima

## 📝 Notas Importantes

- **Nunca** subas las claves privadas a GitHub
- **Siempre** usa variables de entorno en producción
- **Regenera** las claves VAPID si sospechas que se han comprometido
- **Mantén** un registro de qué claves están en uso
- **Revisa** periódicamente los permisos de las claves 