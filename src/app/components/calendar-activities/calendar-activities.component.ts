import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { CalendarActivity, CalendarActivityWithMember } from '../../models/calendar-activity';
import { CalendarActivitiesService } from '../../services/calendar-activities.service';
import { MembersService } from '../../services/members.service';
import { NotificationService } from '../../services/notifications.service';
import { PushSubscriptionService } from '../../services/push-subscription.service';
import { AppNavigationComponent } from "../app-navigation/app-navigation.component";
import {
  faEdit,
  faTrash,
  faPlus,
  faCalendar,
  faTimes,
  faChevronLeft,
  faChevronRight,
  faStethoscope,
  faUmbrellaBeach,
  faCakeCandles,
  faSeedling,
  faNoteSticky,
  faLocationDot,
  faCirclePlus,
  IconDefinition
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-calendar-activities',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, FontAwesomeModule, AppNavigationComponent],
  templateUrl: './calendar-activities.component.html',
  styleUrl: './calendar-activities.component.css'
})
export class CalendarActivitiesComponent implements OnInit {
  // Calendario
  currentDate = new Date();
  currentMonth = this.currentDate.getMonth() + 1;
  currentYear = this.currentDate.getFullYear();
  calendarDays: (Date | null)[] = [];
  
  // Actividades
  activities: CalendarActivityWithMember[] = [];
  selectedDate: string | null = null;
  selectedDayActivities: CalendarActivityWithMember[] = [];
  
  // Modal
  showModal = false;
  showAddForm = false;
  editingActivity: CalendarActivity | null = null;
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  dateError = '';
  
  // Filtros
  selectedFilter = 'all';
  selectedMemberFilter = 'all';
  availableMembers: any[] = [];
  
  // Formulario
  activityForm: FormGroup;
  
  // Icons
  faEdit = faEdit;
  faTrash = faTrash;
  faPlus = faPlus;
  faCalendar = faCalendar;
  faTimes = faTimes;
  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;
  faNoteSticky = faNoteSticky;
  faLocationDot = faLocationDot;
  faCirclePlus = faCirclePlus;

  private activityTypeFaIcons: Record<string, IconDefinition> = {
    medico: faStethoscope,
    salida: faUmbrellaBeach,
    cumple: faCakeCandles,
    jardin: faSeedling,
    otro: faCalendar
  };

  constructor(
    private calendarService: CalendarActivitiesService,
    private membersService: MembersService,
    private notificationService: NotificationService,
    private pushSubscriptionService: PushSubscriptionService,
    private fb: FormBuilder
  ) {
    this.activityForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', Validators.maxLength(200)],
      address: ['', Validators.maxLength(300)],
      date: ['', Validators.required],
      time: [''],
      activity_type: ['medico', Validators.required],
      member_id: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.loadMembers();
    this.generateCalendar();
    this.loadActivities();
    this.setupNotifications();
    this.setupRealtimeSubscription();
  }

  ngOnDestroy() {
    this.notificationService.cleanup();
  }

  // Configurar notificaciones
  private setupNotifications() {
    this.notificationService.requestNotificationPermission();

    // Solicitar permiso de notificaciones
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('Notificaciones habilitadas para el calendario');
          // Iniciar suscripción de push
          this.pushSubscriptionService.checkAndSubscribe();
        }
      });
    }
  }

  // Configurar suscripción en tiempo real
  private setupRealtimeSubscription() {
    this.calendarService.activities$.subscribe(activities => {
      console.log('Actividades actualizadas en tiempo real:', activities);
      // Aquí puedes agregar lógica adicional si necesitas actualizar la UI
      // Por ejemplo, mostrar un toast o actualizar contadores
    });
  }

  // Generar calendario del mes
  generateCalendar() {
    const firstDay = new Date(this.currentYear, this.currentMonth - 1, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    this.calendarDays = [];
    const totalDays = 42; // 6 semanas * 7 días

    for (let i = 0; i < totalDays; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      if (date.getMonth() === this.currentMonth - 1) {
        this.calendarDays.push(date);
      } else {
        this.calendarDays.push(null);
      }
    }
  }

  // Cargar miembros de la familia
  async loadMembers() {
    this.membersService.getAllMembers().subscribe(members => {
      this.availableMembers = members;
    });
  }

  // Cargar actividades del mes
  async loadActivities() {
    this.activities = await this.calendarService.getActivitiesByMonth(this.currentMonth, this.currentYear);
  }

  // Navegar al mes anterior
  previousMonth() {
    if (this.currentMonth === 1) {
      this.currentMonth = 12;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.generateCalendar();
    this.loadActivities();
  }

  // Navegar al mes siguiente
  nextMonth() {
    if (this.currentMonth === 12) {
      this.currentMonth = 1;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.generateCalendar();
    this.loadActivities();
  }

  // Ir al mes actual (hoy)
  goToToday() {
    const today = new Date();
    this.currentDate = today;
    this.currentMonth = today.getMonth() + 1;
    this.currentYear = today.getFullYear();
    this.generateCalendar();
    this.loadActivities();
  }

  // Seleccionar día
  async selectDay(date: Date) {
    this.selectedDate = this.formatDate(date);
    this.showModal = true;
    this.showAddForm = false;
    this.isLoading = true;
    
    try {
      this.selectedDayActivities = await this.calendarService.getActivitiesByDay(this.selectedDate);
    } catch (error) {
      console.error('Error loading activities:', error);
      this.selectedDayActivities = [];
    } finally {
      this.isLoading = false;
    }
  }

  // Abrir formulario para agregar actividad
  openAddForm() {
    this.showAddForm = true;
    this.editingActivity = null;
    
    // Si no hay fecha seleccionada, usar la fecha actual
    const defaultDate = this.selectedDate || this.formatDate(new Date());
    
    this.activityForm.patchValue({
      date: defaultDate,
      activity_type: 'medico',
      member_id: '',
      address: ''
    });
  }

  // Cancelar formulario
  cancelForm() {
    this.showAddForm = false;
    this.editingActivity = null;
    this.activityForm.reset();
    this.errorMessage = '';
    this.dateError = '';
  }

  // Agregar nueva actividad
  async addActivity() {
    if (this.activityForm.valid) {
      this.isSaving = true;
      this.errorMessage = '';
      
      try {
        const formValue = this.activityForm.value;
        
        // Verificar si la fecha ya pasó
        if (this.isDateInPast(formValue.date)) {
          this.errorMessage = 'No puedes crear actividades en fechas que ya pasaron. Por favor, elige una fecha futura.';
          return;
        }
        
        // Verificar si hay duplicados
        if (formValue.time && formValue.member_id) {
          const isDuplicate = await this.calendarService.checkDuplicateActivity(
            formValue.date, 
            formValue.time, 
            formValue.member_id
          );
          
          if (isDuplicate) {
            this.errorMessage = 'Ya existe una actividad para este miembro en la misma fecha y hora. Por favor, elige otro horario.';
            return;
          }
        }

        const newActivity: CalendarActivity = {
          ...formValue
          // user_id se maneja automáticamente en el servicio
        };

        // Limpiar cualquier mensaje de error previo antes de crear la actividad
        this.errorMessage = '';

        const createdActivity = await this.calendarService.createActivity(newActivity);
        if (createdActivity && createdActivity.id) {
          // Programar notificación
          this.notificationService.scheduleActivityNotification({
            id: createdActivity.id,
            day_of_week: this.getDayOfWeek(createdActivity.date),
            title: createdActivity.title,
            description: createdActivity.description || '',
            time: createdActivity.time || ''
          });
          
          // Reproducir sonido de notificación
          this.notificationService.playNotificationSound();
          
          // Actualizar la fecha seleccionada si no estaba establecida
          if (!this.selectedDate) {
            this.selectedDate = createdActivity.date;
          }
          
          this.selectedDayActivities = await this.calendarService.getActivitiesByDay(this.selectedDate);
          this.cancelForm();
          this.loadActivities(); // Recargar para actualizar indicadores
          
          // Cerrar el modal después de crear la actividad
          this.showModal = false;
        }
      } catch (error) {
        console.error('Error al crear actividad:', error);
        this.errorMessage = 'Error al crear la actividad. Por favor, intenta de nuevo.';
      } finally {
        this.isSaving = false;
      }
    }
  }

  // Editar actividad
  editActivity(activity: CalendarActivityWithMember) {
    this.editingActivity = activity;
    this.showAddForm = true;
    this.activityForm.patchValue({
      title: activity.title,
      description: activity.description,
      address: activity.address,
      date: activity.date,
      time: activity.time,
      activity_type: activity.activity_type,
      member_id: activity.member_id
    });
  }

  // Actualizar actividad
  async updateActivity() {
    if (this.activityForm.valid && this.editingActivity) {
      this.isSaving = true;
      this.errorMessage = '';
      
      try {
        const formValue = this.activityForm.value;
        
        // Verificar si la fecha ya pasó
        if (this.isDateInPast(formValue.date)) {
          this.errorMessage = 'No puedes actualizar actividades en fechas que ya pasaron. Por favor, elige una fecha futura.';
          return;
        }

        // Verificar si hay duplicados (excluyendo la actividad actual)
        if (formValue.time && formValue.member_id) {
          const isDuplicate = await this.calendarService.checkDuplicateActivity(
            formValue.date, 
            formValue.time, 
            formValue.member_id,
            this.editingActivity.id
          );
          
          if (isDuplicate) {
            this.errorMessage = 'Ya existe una actividad para este miembro en la misma fecha y hora. Por favor, elige otro horario.';
            return;
          }
        }

        const updatedActivity: Partial<CalendarActivity> = {
          ...formValue
        };

        const result = await this.calendarService.updateActivity(this.editingActivity.id!, updatedActivity);
        if (result) {
          // Reproducir sonido de notificación
          this.notificationService.playNotificationSound();
          
          this.selectedDayActivities = await this.calendarService.getActivitiesByDay(this.selectedDate!);
          this.cancelForm();
          this.loadActivities();
          
          // Cerrar el modal después de actualizar la actividad
          this.showModal = false;
        }
      } catch (error) {
        console.error('Error al actualizar actividad:', error);
        this.errorMessage = 'Error al actualizar la actividad. Por favor, intenta de nuevo.';
      } finally {
        this.isSaving = false;
      }
    }
  }

  // Eliminar actividad
  async deleteActivity(activityId: number) {
    const confirmed = window.confirm('¿Estás seguro de eliminar esta actividad?');
    if (confirmed) {
      const success = await this.calendarService.deleteActivity(activityId);
      if (success) {
        this.notificationService.cancelScheduledNotification(activityId);
        this.selectedDayActivities = await this.calendarService.getActivitiesByDay(this.selectedDate!);
        this.loadActivities();
      }
    }
  }

  // Aplicar filtro
  async applyFilter(filter: string) {
    this.selectedFilter = filter;
    if (filter === 'all') {
      this.activities = await this.calendarService.getActivitiesByMonth(this.currentMonth, this.currentYear);
    } else {
      this.activities = await this.calendarService.getActivitiesByType(this.currentMonth, this.currentYear, filter);
    }
  }

  // Aplicar filtro por miembro
  async applyMemberFilter(memberId: string) {
    this.selectedMemberFilter = memberId;
    if (memberId === 'all') {
      this.activities = await this.calendarService.getActivitiesByMonth(this.currentMonth, this.currentYear);
    } else {
      this.activities = await this.calendarService.getActivitiesByMember(this.currentMonth, this.currentYear, memberId);
    }
  }

  // Manejar cambio en filtro de miembro
  onMemberFilterChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    if (target) {
      this.applyMemberFilter(target.value);
    }
  }

  // Obtener actividades para un día específico
  getActivitiesForDay(date: Date): CalendarActivityWithMember[] {
    const dateStr = this.formatDate(date);
    return this.activities.filter(activity => activity.date === dateStr);
  }

  // Verificar si un día tiene actividades
  hasActivities(date: Date): boolean {
    return this.getActivitiesForDay(date).length > 0;
  }

  // Obtener color del miembro para un día
  getMemberColors(date: Date): string[] {
    const dayActivities = this.getActivitiesForDay(date);
    return dayActivities.map(activity => activity.member_color || '#ccc').filter((color, index, arr) => arr.indexOf(color) === index);
  }

  // Utilidades
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getDayOfWeek(dateStr: string): string {
    const date = new Date(`${dateStr}T00:00:00`);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  }

  get selectedDateAsDate(): Date | null {
    return this.selectedDate ? new Date(`${this.selectedDate}T00:00:00`) : null;
  }

  /** Actividades futuras (fecha/hora ≥ ahora), para la lista «Próximas» en móvil. */
  get upcomingForMobileList(): CalendarActivityWithMember[] {
    const limit = 8;
    const now = Date.now();
    return [...this.activities]
      .map((a) => {
        const timePart = a.time?.trim();
        let ts: number;
        if (timePart) {
          const isoTime = timePart.length === 5 ? `${timePart}:00` : timePart;
          ts = new Date(`${a.date}T${isoTime}`).getTime();
        } else {
          ts = new Date(`${a.date}T23:59:59`).getTime();
        }
        if (Number.isNaN(ts)) {
          ts = new Date(`${a.date}T12:00:00`).getTime();
        }
        return { a, ts };
      })
      .filter(({ ts }) => ts >= now)
      .sort((x, y) => x.ts - y.ts)
      .slice(0, limit)
      .map(({ a }) => a);
  }

  openDayFromActivity(activity: CalendarActivityWithMember): void {
    const d = new Date(`${activity.date}T12:00:00`);
    void this.selectDay(d);
  }

  getShortWeekdayLabel(dateStr: string): string {
    const date = new Date(`${dateStr}T12:00:00`);
    const labels = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
    return labels[date.getDay()] ?? '';
  }

  getDayOfMonthFromDateString(dateStr: string): number {
    const date = new Date(`${dateStr}T12:00:00`);
    return date.getDate();
  }

  getDayModalSubtitle(): string {
    const n = this.selectedDayActivities.length;
    if (n === 0) {
      return 'No hay eventos programados para tu familia';
    }
    if (n === 1) {
      return '1 actividad programada para tu familia';
    }
    return `${n} actividades programadas para tu familia`;
  }

  formatActivityTime(time?: string): string {
    if (!time) return '';
    const parts = time.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1] || '0', 10);
    if (Number.isNaN(h)) return time;
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  getActivityPillarColor(activity: CalendarActivityWithMember): string {
    return activity.member_color || this.getActivityTypeColor(activity.activity_type);
  }

  getActivityTypeFaIcon(type: string): IconDefinition {
    return this.activityTypeFaIcons[type] ?? faCalendar;
  }

  getActivityDetailPrimaryText(activity: CalendarActivityWithMember): string {
    if (activity.description?.trim()) {
      return activity.description.trim();
    }
    return this.getActivityTypeLabel(activity.activity_type);
  }

  closeDayModal(): void {
    this.showModal = false;
    this.cancelForm();
  }

  getMonthName(): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[this.currentMonth - 1];
  }

  getActivityTypeColor(type: string): string {
    switch (type) {
      case 'medico': return '#3b82f6'; // Azul
      case 'salida': return '#10b981'; // Verde
      case 'cumple': return '#f59e0b'; // Naranja
      case 'jardin': return '#22c55e'; // Verde intenso
      case 'otro': return '#a855f7'; // Morado
      default: return '#6b7280'; // Gris
    }
  }

  getActivityTypeIcon(type: string): string {
    switch (type) {
      case 'medico': return '🩺';
      case 'salida': return '🍻';
      case 'cumple': return '🎉';
      case 'jardin': return '🌿';
      case 'otro': return '📌';
      default: return '📅';
    }
  }

  getActivityTypeLabel(type: string): string {
    switch (type) {
      case 'medico': return 'Médico';
      case 'salida': return 'Salida';
      case 'cumple': return 'Cumpleaños';
      case 'jardin': return 'Jardín';
      case 'otro': return 'Otro';
      default: return 'Actividad';
    }
  }

  // Verificar si un día ya pasó
  isPastDay(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayDate = new Date(date);
    dayDate.setHours(0, 0, 0, 0);
    return dayDate < today;
  }

  // Verificar si una fecha ya pasó para validación de formulario
  isDateInPast(dateString: string): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(dateString);
    selectedDate.setHours(0, 0, 0, 0);
    return selectedDate < today;
  }

  // Validar fecha en tiempo real
  onDateChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const selectedDate = target.value;
    
    if (selectedDate && this.isDateInPast(selectedDate)) {
      this.dateError = 'No puedes seleccionar una fecha que ya pasó.';
    } else {
      this.dateError = '';
    }
  }
} 