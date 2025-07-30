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
import { faEdit, faTrash, faPlus, faCalendar, faTimes, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

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

      // Limpiar mensaje de error si no hay problemas
      this.errorMessage = '';

      const newActivity: CalendarActivity = {
        ...formValue
        // user_id se maneja automáticamente en el servicio
      };

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
        
        // Actualizar la fecha seleccionada si no estaba establecida
        if (!this.selectedDate) {
          this.selectedDate = createdActivity.date;
        }
        
        this.selectedDayActivities = await this.calendarService.getActivitiesByDay(this.selectedDate);
        this.cancelForm();
        this.loadActivities(); // Recargar para actualizar indicadores
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

      // Limpiar mensaje de error si no hay problemas
      this.errorMessage = '';

      const updatedActivity: Partial<CalendarActivity> = {
        ...formValue
      };

      const result = await this.calendarService.updateActivity(this.editingActivity.id!, updatedActivity);
      if (result) {
        this.selectedDayActivities = await this.calendarService.getActivitiesByDay(this.selectedDate!);
        this.cancelForm();
        this.loadActivities();
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
    return date.toISOString().split('T')[0];
  }

  getDayOfWeek(dateStr: string): string {
    const date = new Date(dateStr);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
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
      default: return '#6b7280'; // Gris
    }
  }

  getActivityTypeIcon(type: string): string {
    switch (type) {
      case 'medico': return '🩺';
      case 'salida': return '🍻';
      case 'cumple': return '🎉';
      default: return '📅';
    }
  }

  getActivityTypeLabel(type: string): string {
    switch (type) {
      case 'medico': return 'Médico';
      case 'salida': return 'Salida';
      case 'cumple': return 'Cumpleaños';
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