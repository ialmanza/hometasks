# Family Planner - Aplicación de Gestión Familiar

## 📋 Descripción General

**Family Planner** es una aplicación web progresiva (PWA) desarrollada en Angular 19 que permite a las familias organizar y gestionar sus tareas diarias, actividades, comidas y listas de compras de manera eficiente. La aplicación está diseñada para ser responsive y funciona tanto en dispositivos móviles como de escritorio.

## 🎯 Propósito del Proyecto

El proyecto está pensado para:
- **Organización familiar**: Centralizar todas las tareas y actividades de la familia
- **Planificación semanal**: Gestionar comidas y actividades por día de la semana
- **Lista de compras**: Mantener un control de los productos necesarios
- **Notificaciones**: Recordatorios automáticos para actividades programadas
- **Colaboración**: Permitir que múltiples miembros de la familia accedan y actualicen la información

## 🏗️ Arquitectura del Proyecto

### Tecnologías Principales
- **Frontend**: Angular 19 (Framework principal)
- **Base de Datos**: Supabase (PostgreSQL)
- **Estilos**: Tailwind CSS
- **Iconos**: FontAwesome
- **Notificaciones**: Service Workers + Push API
- **PWA**: Angular Service Worker

### Estructura de Carpetas
```
hometasks/
├── src/
│   ├── app/
│   │   ├── components/          # Componentes de la aplicación
│   │   ├── models/             # Interfaces y tipos TypeScript
│   │   ├── services/           # Servicios para lógica de negocio
│   │   └── app.*              # Archivos principales de Angular
│   ├── environments/           # Configuraciones por entorno
│   └── public/                # Assets estáticos
├── package.json               # Dependencias del proyecto
└── tailwind.config.js        # Configuración de Tailwind CSS
```

## 🧩 Componentes

### 1. **AppNavigationComponent** (`app-navigation/`)
- **Propósito**: Navegación principal de la aplicación
- **Funcionalidades**:
  - Menú responsive (desktop y móvil)
  - Logo y branding de "Family Planner"
  - Enlaces a todas las secciones principales
  - Indicador de página activa

### 2. **InicioComponent** (`inicio/`)
- **Propósito**: Dashboard principal con vista general
- **Funcionalidades**:
  - Banner de bienvenida
  - Tarjetas de estadísticas rápidas
  - Vista previa de últimas actividades
  - Vista previa de comidas del día
  - Vista previa de lista de compras
  - Estados vacíos para cada sección

### 3. **HomeTasksComponent** (`home-tasks/`)
- **Propósito**: Gestión de tareas generales
- **Funcionalidades**:
  - Crear, editar, eliminar tareas
  - Marcar tareas como completadas
  - Animaciones de entrada/salida
  - Formularios reactivos con validación
  - Integración con notificaciones push
  - Sonido de notificación al crear tareas

### 4. **DailyActivitiesListComponent** (`daily-activities-list/`)
- **Propósito**: Gestión de actividades diarias por día de la semana
- **Funcionalidades**:
  - Selector de día de la semana
  - CRUD completo de actividades
  - Programación de notificaciones automáticas
  - Validación de formularios
  - Iconos de FontAwesome para acciones

### 5. **WeeklyPlannerComponent** (`weekly-planner/`)
- **Propósito**: Planificador semanal integrado
- **Funcionalidades**:
  - Vista de toda la semana
  - Gestión de comidas por día
  - Gestión de actividades por día
  - Formularios separados para comidas y actividades
  - Edición inline de elementos

### 6. **MealsComponent** (`meals/`)
- **Propósito**: Gestión específica de comidas
- **Funcionalidades**:
  - CRUD de comidas por día
  - Tipos de comida: Desayuno, Almuerzo, Cena
  - Validación de formularios
  - Confirmación antes de eliminar

### 7. **ShoppingListComponent** (`shopping-list/`)
- **Propósito**: Lista de compras familiar
- **Funcionalidades**:
  - CRUD de elementos de compra
  - Categorización: frutas, verduras, otros
  - Marcado de elementos como comprados
  - Productos de acceso rápido
  - Gestión de cantidades y unidades
  - Valores por defecto inteligentes

## 📊 Modelos de Datos

### 1. **DailyActivity** (`models/daily_activity.ts`)
```typescript
interface DailyActivity {
  id?: number;
  day_of_week: string;
  title: string;
  description: string;
  time: string;
}
```

### 2. **Meal** (`models/meals.ts`)
```typescript
interface Meal {
  id?: number;
  day_of_week: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner';
  description: string;
}
```

### 3. **ShoppingListItem** (`models/shoppinglist.ts`)
```typescript
interface ShoppingListItem {
  id?: number;
  name: string;
  category: 'fruits' | 'vegetables' | 'other';
  quantity: number;
  unit: string;
  is_purchased: boolean;
  created_at?: string;
}
```

### 4. **Task** (definido en `tasks.service.ts`)
```typescript
interface Task {
  id?: string;
  title: string;
  description: string;
  completed: boolean;
  created_at?: Date;
}
```

## 🔧 Servicios

### 1. **ActivitiesService** (`services/activities.service.ts`)
- **Responsabilidad**: Gestión de actividades diarias
- **Métodos principales**:
  - `createActivity()`: Crear nueva actividad
  - `getActivitiesByDay()`: Obtener actividades por día
  - `updateActivity()`: Actualizar actividad existente
  - `deleteActivity()`: Eliminar actividad

### 2. **MealsService** (`services/meal.service.ts`)
- **Responsabilidad**: Gestión de comidas
- **Métodos principales**:
  - `createMeal()`: Crear nueva comida
  - `getMealsByDay()`: Obtener comidas por día
  - `updateMeal()`: Actualizar comida existente
  - `deleteMeal()`: Eliminar comida

### 3. **ShoppingListService** (`services/shopping-list.service.ts`)
- **Responsabilidad**: Gestión de lista de compras
- **Características**:
  - Uso de RxJS Observables
  - Ordenamiento por fecha de creación
  - Mapeo de respuestas de Supabase
- **Métodos principales**:
  - `createItem()`: Crear nuevo elemento
  - `getItems()`: Obtener todos los elementos
  - `updateItem()`: Actualizar elemento
  - `deleteItem()`: Eliminar elemento

### 4. **TasksService** (`services/tasks.service.ts`)
- **Responsabilidad**: Gestión de tareas generales
- **Características**:
  - BehaviorSubject para estado reactivo
  - Sonido de notificación integrado
  - Ordenamiento por fecha de creación
- **Métodos principales**:
  - `loadTasks()`: Cargar todas las tareas
  - `addTask()`: Agregar nueva tarea
  - `updateTask()`: Actualizar tarea
  - `deleteTask()`: Eliminar tarea
  - `toggleTaskCompletion()`: Cambiar estado de completado

### 5. **WeeklyScheduleService** (`services/weekly-schedule.service.ts`)
- **Responsabilidad**: Gestión del planificador semanal
- **Características**:
  - Inicialización automática de datos semanales
  - Limpieza automática de registros antiguos
  - Gestión de schedules, meals y activities
- **Métodos principales**:
  - `initializeWeeklyData()`: Inicializar datos de la semana
  - `loadCurrentWeekSchedules()`: Cargar schedules actuales
  - `addMeal()` / `addActivity()`: Agregar elementos
  - `updateMeal()` / `deleteMeal()`: Gestión de comidas

### 6. **NotificationService** (`services/notifications.service.ts`)
- **Responsabilidad**: Sistema de notificaciones completo
- **Características**:
  - Service Worker integration
  - Push notifications
  - Notificaciones programadas por tiempo
  - Sonidos de notificación
  - Tiempo real con Supabase
- **Funcionalidades principales**:
  - `scheduleActivityNotification()`: Programar notificaciones
  - `sendTaskNotification()`: Enviar notificaciones de tareas
  - `requestNotificationPermission()`: Solicitar permisos
  - `setupTaskNotificationListener()`: Listener en tiempo real

### 7. **PushSubscriptionService** (`services/push-subscription.service.ts`)
- **Responsabilidad**: Gestión de suscripciones push
- **Funcionalidades**:
  - Verificación de suscripciones existentes
  - Creación de nuevas suscripciones
  - Integración con VAPID keys

## 🗄️ Base de Datos (Supabase)

### Tablas Principales:
1. **`daily_activitiestwo`**: Actividades diarias
2. **`mealstwo`**: Comidas por día
3. **`shopping_list`**: Lista de compras
4. **`task_notifications`**: Tareas generales
5. **`weekly_schedules`**: Schedules semanales
6. **`meals`**: Comidas del planificador
7. **`daily_activities`**: Actividades del planificador
8. **`push_subscriptions`**: Suscripciones push
9. **`activity_notifications`**: Historial de notificaciones

## 🎨 Estilos y UI

### Framework CSS: Tailwind CSS
- **Configuración**: `tailwind.config.js`
- **Responsive design**: Mobile-first approach
- **Componentes**: Diseño modular y reutilizable

### Características de UI:
- **Navegación responsive**: Menú adaptativo para móvil/desktop
- **Animaciones**: Transiciones suaves entre estados
- **Iconografía**: FontAwesome para iconos
- **Estados vacíos**: Mensajes informativos cuando no hay datos
- **Formularios**: Validación reactiva con Angular Forms

## 🔔 Sistema de Notificaciones

### Tipos de Notificaciones:
1. **Notificaciones Push**: Para nuevas tareas
2. **Notificaciones Programadas**: Para actividades diarias
3. **Notificaciones del Sistema**: Para eventos en tiempo real
4. **Sonidos**: Audio de confirmación

### Características:
- **Service Worker**: Manejo offline
- **Permisos**: Solicitud automática de permisos
- **Tiempo Real**: Integración con Supabase Realtime
- **Programación**: Cálculo automático de próximas notificaciones

## 🚀 Funcionalidades Principales

### 1. **Gestión de Tareas**
- Crear, editar, eliminar tareas
- Marcar como completadas
- Notificaciones automáticas
- Sonido de confirmación

### 2. **Actividades Diarias**
- Organización por día de la semana
- Programación de notificaciones
- Gestión de horarios
- Descripciones detalladas

### 3. **Planificación de Comidas**
- Menú semanal
- Tipos de comida (desayuno, almuerzo, cena)
- Descripciones de platos
- Organización por día

### 4. **Lista de Compras**
- Categorización de productos
- Control de cantidades
- Marcado de comprados
- Productos de acceso rápido
- Gestión de unidades

### 5. **Dashboard**
- Vista general de todas las secciones
- Estadísticas rápidas
- Acceso directo a funcionalidades
- Estados vacíos informativos

## 🔧 Configuración del Proyecto

### Variables de Entorno (`environments/environments.ts`)
```typescript
export const environment = {
  production: true,
  supabaseUrl: 'https://fdqcganrmqgepkxgkugn.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  vapidPublicKey: 'TU_CLAVE_PUBLICA',
  vapidPrivateKey: 'TU_CLAVE_PRIVADA'
};
```

### Dependencias Principales:
- **@angular/core**: ^19.0.4
- **@supabase/supabase-js**: ^2.47.7
- **@fortawesome/angular-fontawesome**: ^1.0.0
- **tailwindcss**: ^3.4.17
- **web-push**: ^3.6.7

## 📱 Características PWA

### Service Worker:
- **Archivo**: `ngsw-worker.js`
- **Funcionalidades**: Caching, offline support, push notifications

### Manifest:
- **Archivo**: `public/manifest.webmanifest`
- **Iconos**: Múltiples tamaños para diferentes dispositivos
- **Configuración**: Instalación como app nativa

## 🔄 Flujo de Datos

### 1. **Creación de Tareas**:
```
Formulario → TasksService → Supabase → Notificación → UI Update
```

### 2. **Actividades Diarias**:
```
Formulario → ActivitiesService → Supabase → NotificationService → UI Update
```

### 3. **Lista de Compras**:
```
Formulario → ShoppingListService → Supabase → UI Update (Observable)
```

### 4. **Notificaciones**:
```
Evento → NotificationService → Service Worker → Push Notification → UI Update
```

## 🛠️ Comandos de Desarrollo

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo
npm start

# Construir para producción
npm run build

# Ejecutar tests
npm test

# Construir en modo watch
npm run watch
```

## 📋 Próximas Mejoras Sugeridas

### Funcionalidades:
1. **Autenticación de usuarios**: Sistema de login/logout
2. **Compartir listas**: Compartir listas entre familiares
3. **Recordatorios avanzados**: Notificaciones más sofisticadas
4. **Estadísticas**: Dashboard con métricas de uso
5. **Templates**: Plantillas predefinidas para actividades
6. **Gestión de gastos familiares**: Sistema completo de gastos y miembros

## 🚀 **Nuevas Funcionalidades Implementadas**

### **Sistema de Gestión Familiar (Fase 1 - Completada)**

#### **Modelos de Datos:**
- **`FamilyMember`** (`models/family-member.model.ts`): Gestión de miembros de familia
- **`FamilyExpense`** (`models/family-expense.model.ts`): Gestión de gastos familiares

#### **Servicios Base:**
- **`MembersService`** (`services/members.service.ts`): CRUD completo para miembros
  - `getAllMembers()`: Obtener todos los miembros
  - `addMember()`: Crear nuevo miembro
  - `updateMember()`: Actualizar miembro existente
  - `deleteMember()`: Eliminar miembro

- **`ExpensesService`** (`services/expenses.service.ts`): CRUD completo para gastos
  - `getAllExpenses()`: Obtener todos los gastos
  - `getUnpaidExpenses()`: Obtener gastos pendientes
  - `addExpense()`: Crear nuevo gasto
  - `updateExpense()`: Actualizar gasto existente
  - `deleteExpense()`: Eliminar gasto
  - `togglePaidStatus()`: Cambiar estado de pago

#### **Características Técnicas:**
- **Integración con Supabase**: Conexión directa a las tablas `family_members` y `family_expenses`
- **RxJS Observables**: Manejo reactivo de datos
- **TypeScript**: Tipado fuerte para mejor desarrollo
- **Manejo de errores**: Gestión robusta de errores de Supabase

### **Sistema de Gestión Familiar (Fase 2 - Completada)**

#### **Componente FamilyMembersComponent:**
- **Ubicación**: `components/family-members/`
- **Funcionalidades**:
  - Listado de miembros con avatares generados automáticamente
  - Formulario para agregar/editar miembros
  - CRUD completo (Crear, Leer, Actualizar, Eliminar)
  - Validación de formularios con Angular Reactive Forms
  - Estados de carga y vacío
  - Diseño responsive basado en el landing page proporcionado
  - Navegación integrada con el sistema existente

#### **Características del Componente:**
- **Avatares dinámicos**: Generación automática de iniciales con colores aleatorios
- **Formulario reactivo**: Validación en tiempo real
- **Estados de UI**: Loading, empty state, error handling
- **Animaciones**: Transiciones suaves entre estados
- **Responsive design**: Adaptado para móvil y desktop
- **Iconografía**: FontAwesome para iconos de acción

#### **Rutas Agregadas:**
- **`/members`**: Acceso al componente de miembros de familia

### **Sistema de Gestión Familiar (Fase 3 - Completada)**

#### **Componente AddExpenseFormComponent:**
- **Ubicación**: `components/add-expense-form/`
- **Funcionalidades**:
  - Formulario completo para agregar gastos familiares
  - Integración con miembros de familia (select dinámico)
  - Validaciones avanzadas en tiempo real
  - Formateo automático de montos
  - Estados de carga y envío
  - Diseño fiel al landing page proporcionado
  - Navegación integrada con el sistema existente

#### **Características del Formulario:**
- **Campos requeridos**: Título, monto, fecha de vencimiento
- **Campos opcionales**: Descripción, miembro responsable
- **Validaciones**: Longitud mínima, montos positivos, fechas válidas
- **Formateo de montos**: Solo números y punto decimal
- **Select dinámico**: Carga automática de miembros disponibles
- **Mensajes de error**: Validación visual en tiempo real
- **Estados de UI**: Loading, submitting, error handling

#### **Integración con Servicios:**
- **`ExpensesService`**: Para crear nuevos gastos
- **`MembersService`**: Para cargar miembros disponibles
- **Formularios reactivos**: Validación robusta con Angular Forms

#### **Rutas Agregadas:**
- **`/add-expense`**: Acceso al formulario de agregar gastos

### **Sistema de Gestión Familiar (Fase 4 - Completada)**

#### **Componente FamilyExpensesComponent:**
- **Ubicación**: `components/family-expenses/`
- **Funcionalidades**:
  - Lista completa de gastos familiares con filtros
  - Filtros dinámicos: All, Unpaid, Paid
  - Toggle de estado pagado/pendiente con un clic
  - CRUD completo (Crear, Leer, Actualizar, Eliminar)
  - Integración con miembros de familia
  - Iconos automáticos basados en el título del gasto
  - Formateo de montos y fechas
  - Estados de carga y vacío inteligentes
  - Diseño fiel al landing page proporcionado
  - Navegación integrada con el sistema existente

#### **Características del Componente:**
- **Filtros inteligentes**: Filtrado en tiempo real por estado de pago
- **Iconos dinámicos**: Detección automática de tipo de gasto por título
- **Toggle de estado**: Cambio rápido entre pagado/pendiente
- **Formateo automático**: Montos en formato de moneda, fechas localizadas
- **Estados vacíos contextuales**: Mensajes diferentes según el filtro activo
- **Acciones rápidas**: Editar, eliminar, cambiar estado
- **Responsive design**: Adaptado para móvil y desktop
- **Animaciones suaves**: Transiciones y efectos hover

#### **Integración Completa:**
- **`ExpensesService`**: Para todas las operaciones CRUD de gastos
- **`MembersService`**: Para mostrar nombres de miembros responsables
- **Navegación**: Integración con formulario de agregar gastos
- **Estados reactivos**: Actualización automática de la UI

#### **Rutas Agregadas:**
- **`/expenses`**: Acceso al listado de gastos familiares

### **Sistema de Gestión Familiar (Fase 5 - Completada)**

#### **Navegación Optimizada:**
- **Ubicación**: `components/app-navigation/`
- **Funcionalidades**:
  - Navegación móvil optimizada con 5 elementos principales
  - Menú modal "Más" para funcionalidades secundarias
  - Navegación desktop completa con todas las opciones
  - Iconografía FontAwesome integrada
  - Animaciones suaves y transiciones
  - Estados activos y hover mejorados

#### **Navegación Móvil (5 elementos):**
```
[🏠] [📋] [🛒] [💰] [⋮]
Home  Tareas Compras Gastos Más
```

#### **Menú "Más" (⋮):**
- 👤 **Miembros**: Gestión de miembros de familia
- 📅 **Actividades**: Actividades diarias
- 🍽️ **Comidas**: Planificador de comidas

#### **Navegación Desktop (Completa):**
- 🏠 **Inicio**: Dashboard principal
- 📋 **Tareas**: Gestión de tareas
- 🛒 **Compras**: Lista de compras
- 💰 **Gastos**: Gestión de gastos familiares
- 👤 **Miembros**: Gestión de miembros
- 📅 **Actividades**: Actividades diarias
- 🍽️ **Comidas**: Planificador de comidas

#### **Características Técnicas:**
- **Responsive design**: Adaptación automática móvil/desktop
- **Menú modal**: Slide-up desde abajo en móvil
- **Iconografía consistente**: FontAwesome para todos los iconos
- **Estados visuales**: Active, hover, focus mejorados
- **Accesibilidad**: Navegación por teclado y focus visible
- **Animaciones**: Transiciones suaves y efectos hover

#### **Integración Completa:**
- **Todas las rutas**: Integración con todos los componentes
- **Navegación fluida**: Transiciones entre secciones
- **Estados activos**: Indicador visual de página actual
- **Cierre automático**: Menú modal se cierra al navegar

### Técnicas:
1. **Testing**: Aumentar cobertura de tests
2. **Performance**: Optimización de carga
3. **Accessibility**: Mejoras de accesibilidad
4. **Internationalization**: Soporte multiidioma
5. **Offline**: Mejor manejo offline

## 🤝 Contribución

Para contribuir al proyecto:
1. Fork del repositorio
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo licencia MIT. Ver el archivo LICENSE para más detalles.

---

**Desarrollado con ❤️ para familias organizadas**
