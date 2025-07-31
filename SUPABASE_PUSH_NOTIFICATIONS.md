# Notificaciones Push con Supabase

## Descripción

Este sistema implementa notificaciones push reales usando Supabase Edge Functions, sin necesidad de Firebase u otros servicios externos.

## Arquitectura

### Componentes

1. **Edge Function** (`supabase/functions/send-push-notification/`)
   - Maneja el envío real de notificaciones push
   - Usa Web Push API con VAPID
   - Se ejecuta en el servidor de Supabase

2. **Servicio de Notificaciones** (`src/app/services/push-notification.service.ts`)
   - Integra con la Edge Function
   - Maneja fallbacks para desarrollo local
   - Gestiona suscripciones push

3. **Service Worker** (`public/sw.js`)
   - Recibe y muestra las notificaciones
   - Maneja eventos de clic en notificaciones

## Configuración

### 1. Generar Claves VAPID

```bash
npm run generate-vapid
```

Esto generará las claves VAPID necesarias para las notificaciones push.

### 2. Configurar Variables de Entorno en Supabase

En el Dashboard de Supabase, ve a **Settings > Edge Functions** y configura:

```
VAPID_PUBLIC_KEY=tu_clave_publica_vapid
VAPID_PRIVATE_KEY=tu_clave_privada_vapid
VAPID_EMAIL=tu_email@ejemplo.com
```

### 3. Desplegar Edge Function

```bash
npm run deploy-push-function
```

O manualmente:

```bash
supabase functions deploy send-push-notification
```

### 4. Verificar Configuración

```bash
npm run check-pwa
```

## Flujo de Notificaciones

### Desarrollo Local
1. Usuario crea tarea
2. Se envía notificación local del navegador
3. Se registra en base de datos para historial

### Producción
1. Usuario crea tarea
2. Se llama a la Edge Function de Supabase
3. Edge Function envía notificación push real
4. Service Worker recibe y muestra la notificación
5. Se registra en base de datos para historial

## Estructura de Base de Datos

### Tabla `push_subscriptions`
```sql
CREATE TABLE push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL,
  expiration_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Tabla `authorized_notification_users`
```sql
CREATE TABLE authorized_notification_users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  notification_preferences JSONB DEFAULT '{"push": true, "email": false}',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Tabla `guest_notifications`
```sql
CREATE TABLE guest_notifications (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Troubleshooting

### Las notificaciones no llegan en producción

1. **Verificar Edge Function**:
   ```bash
   supabase functions logs send-push-notification
   ```

2. **Verificar variables de entorno**:
   - VAPID_PUBLIC_KEY configurada
   - VAPID_PRIVATE_KEY configurada
   - VAPID_EMAIL configurado

3. **Verificar suscripciones**:
   - Usuario autorizado en `authorized_notification_users`
   - Suscripción válida en `push_subscriptions`
   - Permisos de notificación concedidos

### Error "Function not found"

1. Verificar que la Edge Function esté desplegada:
   ```bash
   supabase functions list
   ```

2. Redesplegar si es necesario:
   ```bash
   npm run deploy-push-function
   ```

### Notificaciones llegan pero no se muestran

1. Verificar Service Worker:
   - Debe estar registrado
   - Debe manejar eventos `push`

2. Verificar permisos:
   - Notification.permission debe ser 'granted'

## Características

### ✅ Notificaciones Push Reales
- Envío real a dispositivos móviles y desktop
- Funciona incluso cuando la app está cerrada
- Usa Web Push API estándar

### ✅ Fallback Inteligente
- Desarrollo local: notificaciones del navegador
- Producción: Edge Function de Supabase
- Fallback a notificaciones locales si falla

### ✅ Integración Completa
- Suscripciones automáticas
- Gestión de usuarios autorizados
- Historial de notificaciones

### ✅ Seguridad
- VAPID para autenticación
- Verificación de usuarios autorizados
- CORS configurado correctamente

## Próximos Pasos

1. **Desplegar Edge Function**:
   ```bash
   npm run deploy-push-function
   ```

2. **Configurar variables de entorno** en Supabase Dashboard

3. **Probar notificaciones** en producción

4. **Monitorear logs** en Supabase Dashboard

## Comandos Útiles

```bash
# Generar claves VAPID
npm run generate-vapid

# Desplegar Edge Function
npm run deploy-push-function

# Verificar configuración PWA
npm run check-pwa

# Ver logs de Edge Function
supabase functions logs send-push-notification

# Listar funciones desplegadas
supabase functions list
``` 