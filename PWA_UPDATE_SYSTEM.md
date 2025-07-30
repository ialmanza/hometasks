# Sistema de Actualizaciones Automáticas PWA

## Descripción General

Este sistema implementa actualizaciones automáticas para la PWA de Hometasks, permitiendo que los usuarios reciban nuevas versiones sin necesidad de actualizar manualmente el navegador.

## Componentes del Sistema

### 1. AppUpdateService (`src/app/services/app-update.service.ts`)
- **Detección automática**: Verifica actualizaciones cada 6 horas
- **Notificaciones**: Muestra notificaciones push y banner cuando hay actualizaciones
- **Activación**: Maneja la activación de nuevas versiones
- **Estado**: Mantiene el estado de actualizaciones disponibles

### 2. AppUpdateComponent (`src/app/components/app-update/app-update.component.ts`)
- **UI de actualización**: Banner visual para notificar actualizaciones
- **Interacción**: Botones para actualizar ahora o posponer
- **Responsive**: Diseño adaptativo para móvil y desktop

### 3. Service Worker (`public/sw.js`)
- **Cache inteligente**: Estrategia de cache optimizada
- **Notificaciones push**: Manejo de notificaciones push
- **Actualizaciones**: Intercepta y maneja actualizaciones

## Flujo de Actualización

### 1. Detección
- El servicio verifica actualizaciones al iniciar la app
- Verificaciones periódicas cada 6 horas
- Escucha eventos del service worker

### 2. Notificación
- Muestra banner en la parte superior
- Envía notificación push (si está habilitada)
- Permite al usuario elegir actualizar o posponer

### 3. Activación
- Descarga la nueva versión en segundo plano
- Activa la nueva versión cuando está lista
- Recarga automáticamente la página

## Configuración

### ngsw-config.json
```json
{
  "navigationRequestStrategy": "freshness",
  "assetGroups": [
    {
      "name": "app",
      "installMode": "prefetch"
    }
  ]
}
```

### Service Worker
- Cache estratégico para assets críticos
- Actualización automática de recursos
- Manejo de notificaciones push

## Características

### ✅ Actualización Automática
- Detección automática de nuevas versiones
- Descarga en segundo plano
- Activación sin interrumpir al usuario

### ✅ Notificaciones Inteligentes
- Banner visual no intrusivo
- Notificaciones push opcionales
- Opción de posponer actualización

### ✅ Experiencia de Usuario
- Sin pérdida de datos
- Actualización transparente
- Feedback visual del proceso

### ✅ Compatibilidad
- Funciona en todos los navegadores modernos
- Fallback para navegadores sin soporte
- Responsive design

## Uso

### Para Desarrolladores
1. **Generar claves VAPID**:
   ```bash
   npm run generate-vapid
   ```

2. **Configurar environment**:
   ```typescript
   export const environment = {
     vapidPublicKey: 'TU_CLAVE_PUBLICA',
     vapidPrivateKey: 'TU_CLAVE_PRIVADA'
   };
   ```

3. **Build para producción**:
   ```bash
   ng build --configuration production
   ```

### Para Usuarios
- Las actualizaciones son automáticas
- Aparece un banner cuando hay una nueva versión
- Pueden elegir actualizar inmediatamente o más tarde
- Las notificaciones push son opcionales

## Troubleshooting

### Las actualizaciones no aparecen
1. Verificar que el service worker esté registrado
2. Confirmar que esté en modo producción
3. Revisar la consola para errores

### Las notificaciones no funcionan
1. Verificar permisos de notificaciones
2. Confirmar configuración de VAPID
3. Revisar logs del service worker

### El banner no aparece
1. Verificar que el componente esté importado
2. Confirmar que el servicio esté inyectado
3. Revisar la consola para errores

## Mejoras Futuras

- [ ] Actualización silenciosa en segundo plano
- [ ] Notificaciones personalizadas por tipo de actualización
- [ ] Métricas de adopción de actualizaciones
- [ ] Rollback automático en caso de errores
- [ ] Actualización diferida programada 