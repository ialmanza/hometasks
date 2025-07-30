# Sistema de Notificaciones en Tiempo Real para el Calendario

## Descripción General

Este sistema implementa notificaciones en tiempo real para el componente de calendario, similar al sistema existente para las tareas. Cuando se crea, actualiza o elimina un evento del calendario, se envían notificaciones tanto locales como push.

## Componentes del Sistema

### 1. NotificationService (`src/app/services/notifications.service.ts`)
- Maneja notificaciones locales del navegador
- Incluye métodos específicos para eventos del calendario:
  - `sendCalendarEventNotification()` - Para nuevos eventos
  - `sendCalendarEventUpdateNotification()` - Para eventos actualizados
  - `sendCalendarEventDeleteNotification()` - Para eventos eliminados
- Reproduce sonido de notificación
- Auto-cierra notificaciones después de 5 segundos

### 2. CalendarNotificationsService (`src/app/services/calendar-notifications.service.ts`)
- Maneja notificaciones push para eventos del calendario
- Se conecta con las suscripciones push almacenadas en Supabase
- Envía notificaciones push a todos los dispositivos del usuario

### 3. CalendarActivitiesService (`src/app/services/calendar-activities.service.ts`)
- Integra ambos tipos de notificaciones
- Configura suscripción en tiempo real con Supabase Realtime
- Envía notificaciones automáticamente en operaciones CRUD

### 4. PushSubscriptionService (`src/app/services/push-subscription.service.ts`)
- Maneja las suscripciones push del usuario
- Solicita permisos de notificaciones
- Almacena suscripciones en Supabase

## Flujo de Notificaciones

### Al Crear un Evento:
1. Se crea el evento en la base de datos
2. Se envía notificación local inmediata
3. Se envía notificación push a todos los dispositivos del usuario
4. Se actualiza la UI en tiempo real

### Al Actualizar un Evento:
1. Se actualiza el evento en la base de datos
2. Se envía notificación de actualización
3. Se envía notificación push
4. Se actualiza la UI

### Al Eliminar un Evento:
1. Se obtiene el título del evento antes de eliminarlo
2. Se elimina el evento de la base de datos
3. Se envía notificación de eliminación
4. Se envía notificación push
5. Se actualiza la UI

## Configuración Requerida

### Permisos de Notificaciones
El sistema solicita automáticamente permisos de notificaciones al cargar el componente del calendario.

### Base de Datos
Se requiere la tabla `push_subscriptions` en Supabase con la siguiente estructura:
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

### Service Worker
El sistema utiliza el service worker existente (`/ngsw-worker.js`) para manejar las notificaciones push.

## Características

### Notificaciones Locales
- Aparecen inmediatamente en el navegador
- Incluyen título, descripción y hora del evento
- Reproducen sonido de notificación
- Se auto-cierran después de 5 segundos

### Notificaciones Push
- Se envían a todos los dispositivos del usuario
- Funcionan incluso cuando la aplicación está cerrada
- Incluyen datos adicionales para navegación

### Tiempo Real
- Los cambios se reflejan inmediatamente en todos los clientes
- Utiliza Supabase Realtime para sincronización
- No requiere recarga de página

## Uso

### En el Componente del Calendario
```typescript
// El sistema se configura automáticamente en ngOnInit()
ngOnInit() {
  this.setupNotifications();
  this.setupRealtimeSubscription();
}
```

### Personalización
Puedes personalizar las notificaciones modificando los métodos en `NotificationService`:
- Cambiar el icono
- Modificar el texto
- Ajustar el tiempo de auto-cierre
- Cambiar el sonido

## Troubleshooting

### Las notificaciones no aparecen
1. Verificar que los permisos estén concedidos
2. Revisar la consola del navegador para errores
3. Confirmar que el service worker esté registrado

### Las notificaciones push no funcionan
1. Verificar la configuración de VAPID en environment
2. Confirmar que las suscripciones estén guardadas en Supabase
3. Revisar los logs del service worker

### El sonido no se reproduce
1. Verificar que el archivo `/level-up-191997.mp3` existe
2. Confirmar que el navegador permite reproducción de audio
3. Revisar la consola para errores de audio 