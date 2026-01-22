import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SecuritySettingsService, UserSecuritySettings } from '../../services/security-settings.service';
import { PinService } from '../../services/pin.service';
import { AuthService } from '../../services/auth.service';
import { BiometricService } from '../../services/biometric.service';
import { SessionHelperService } from '../../services/session-helper.service';
import { PinSetupComponent } from './pin-setup/pin-setup.component';
import { PinChangeComponent } from './pin-change/pin-change.component';
import { PinVerifyComponent } from './pin-verify/pin-verify.component';
import { supabase } from '../../services/Supabase-Client/supabase-client';
import { ExpensesService } from '../../services/expenses.service';
import { VacationExpensesService } from '../../services/vacation-expenses.service';
import { SettingsService, Theme } from '../../services/settings/settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PinSetupComponent, PinChangeComponent, PinVerifyComponent],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class SettingsComponent implements OnInit {
  // Estados
  isLoading = signal<boolean>(false);
  
  // Seguridad
  showSetupPinModal = signal<boolean>(false);
  showChangePinModal = signal<boolean>(false);
  showDisableLockModal = signal<boolean>(false);
  isInitialPinSetup = signal<boolean>(false); // Para mostrar PinSetup directamente en configuración inicial
  securitySettings = signal<UserSecuritySettings | null>(null);
  isUpdatingSecurity = signal<boolean>(false);
  
  // Biometría
  isBiometricSupported = signal<boolean>(false);
  isBiometricAvailable = signal<boolean>(false);
  isRegisteringBiometric = signal<boolean>(false);
  
  // Apariencia / Tema
  // selectedTheme ahora se obtiene del SettingsService
  
  // Gestión de Datos
  showDateRangeModal = signal<boolean>(false);
  dateRangeStart = signal<string>('');
  dateRangeEnd = signal<string>('');
  isExporting = signal<boolean>(false);
  showResetCategoriesConfirm = signal<boolean>(false);
  isResettingCategories = signal<boolean>(false);
  
  // Acciones Críticas
  showDeleteConfirm = signal<boolean>(false);
  isDeletingExpenses = signal<boolean>(false);
  
  // Información - ahora se obtiene del SettingsService
  get appName(): string {
    return this.settingsService.getAppName();
  }
  
  get appVersion(): string {
    return this.settingsService.getAppVersion();
  }

  constructor(
    private securitySettingsService: SecuritySettingsService,
    private pinService: PinService,
    private authService: AuthService,
    private biometricService: BiometricService,
    private sessionHelper: SessionHelperService,
    private expensesService: ExpensesService,
    private vacationExpensesService: VacationExpensesService,
    public router: Router,
    private route: ActivatedRoute,
    public settingsService: SettingsService
  ) {}

  async ngOnInit() {
    // Mostrar spinner mientras se cargan los datos
    this.isLoading.set(true);
    
    try {
      // Cargar configuración de seguridad primero
      await this.loadSecuritySettings();
      // Verificar soporte de biometría
      await this.checkBiometricSupport();
      // Inicializar rango de fechas al mes actual
      this.resetToCurrentMonth();
      
      // Verificar query params en la carga inicial
      // Esperar a que los settings se carguen antes de verificar
      this.route.queryParams.subscribe(async (params) => {
        if (params['setupPin'] === 'true') {
          // Asegurar que los settings estén cargados
          if (!this.securitySettings()) {
            await this.loadSecuritySettings();
          }
          // Verificar si realmente no tiene PIN configurado
          if (!this.isPinConfigured()) {
            // Mostrar PinSetupComponent directamente (no como modal)
            this.isInitialPinSetup.set(true);
          }
          // Limpiar el query param de la URL (mantener returnUrl)
          this.router.navigate([], { 
            relativeTo: this.route,
            queryParams: { setupPin: null },
            queryParamsHandling: 'merge',
            replaceUrl: true
          });
        }
      });
    } catch (error) {
      console.error('Error al inicializar settings:', error);
    } finally {
      // Ocultar spinner cuando todos los datos estén cargados
      this.isLoading.set(false);
    }
  }

  /**
   * Navega hacia atrás
   */
  goBack() {
    this.router.navigate(['/']);
  }

  /**
   * Navega a la página de términos y privacidad
   */
  navigateToTermsAndPrivacy() {
    this.router.navigate(['/terms-and-privacy']);
  }

  // ==================== SEGURIDAD Y PRIVACIDAD ====================

  /**
   * Carga la configuración de seguridad
   */
  async loadSecuritySettings() {
    try {
      let settings = await this.securitySettingsService.getSettings();
      
      // Si no existe configuración, inicializarla por defecto
      if (!settings) {
        settings = await this.securitySettingsService.initializeDefaultSettings();
      }
      
      this.securitySettings.set(settings);
    } catch (error) {
      console.error('Error al cargar configuración de seguridad:', error);
    }
  }

  /**
   * Verifica si el bloqueo está habilitado
   */
  isLockEnabled(): boolean {
    return this.securitySettings()?.lock_enabled || false;
  }

  /**
   * Verifica si el PIN está configurado
   */
  isPinConfigured(): boolean {
    const settings = this.securitySettings();
    return !!(settings?.pin_hash && settings?.pin_salt);
  }

  /**
   * Verifica el soporte de biometría en el dispositivo
   */
  async checkBiometricSupport() {
    try {
      const isSupported = this.biometricService.isSupported();
      this.isBiometricSupported.set(isSupported);
      
      // Verificar disponibilidad usando el nuevo método
      const isAvailable = await this.biometricService.isAvailable();
      this.isBiometricAvailable.set(isAvailable);
    } catch (error) {
      console.error('Error al verificar soporte biométrico:', error);
      this.isBiometricSupported.set(false);
      this.isBiometricAvailable.set(false);
    }
  }

  /**
   * Verifica si la biometría está habilitada
   */
  isBiometricEnabled(): boolean {
    const settings = this.securitySettings();
    return settings?.biometric_enabled || false;
  }

  /**
   * Verifica si la biometría está registrada
   */
  isBiometricRegistered(): boolean {
    const settings = this.securitySettings();
    return !!(settings?.biometric_key_id);
  }

  /**
   * Registra una nueva credencial biométrica
   */
  async registerBiometric() {
    // Verificar que el PIN esté configurado primero
    if (!this.isPinConfigured()) {
      alert('Debes configurar un PIN antes de registrar biometría.');
      return;
    }

    // Verificar disponibilidad
    if (!this.isBiometricAvailable()) {
      alert('La biometría no está disponible en este dispositivo.');
      return;
    }

    this.isRegisteringBiometric.set(true);
    
    try {
      const userId = await this.authService.getCurrentUserId();
      if (!userId) {
        alert('Error: Usuario no autenticado.');
        return;
      }

      // Registrar credencial biométrica usando registerPasskey
      const result = await this.biometricService.registerPasskey();

      if (!result.ok) {
        alert(`Error al registrar biometría: ${result.message || 'Error desconocido'}`);
        return;
      }

      if (!result.credentialId) {
        alert('Error al registrar biometría: No se obtuvo el ID de la credencial.');
        return;
      }

      // Guardar credentialId en la configuración de seguridad
      await this.securitySettingsService.saveSettings({
        biometric_enabled: true,
        biometric_key_id: result.credentialId
      });

      await this.loadSecuritySettings();
      alert('Biometría registrada exitosamente.');
    } catch (error) {
      console.error('Error al registrar biometría:', error);
      alert('Error al registrar biometría. Por favor, intenta nuevamente.');
    } finally {
      this.isRegisteringBiometric.set(false);
    }
  }

  /**
   * Maneja el cambio del toggle de biometría
   */
  async onBiometricToggleChange(enabled: boolean) {
    if (enabled) {
      // Si intenta activar pero no tiene biometría registrada, registrar primero
      if (!this.isBiometricRegistered()) {
        await this.registerBiometric();
        return;
      }
      // Si ya está registrada, solo activar
      await this.enableBiometric();
    } else {
      // Si intenta desactivar, pedir confirmación
      if (confirm('¿Estás seguro de que deseas desactivar la biometría?')) {
        await this.disableBiometric();
      }
    }
  }

  /**
   * Activa la biometría
   */
  async enableBiometric() {
    if (!this.isBiometricRegistered()) {
      alert('Primero debes registrar una credencial biométrica.');
      return;
    }

    this.isUpdatingSecurity.set(true);
    try {
      await this.securitySettingsService.saveSettings({
        biometric_enabled: true
      });

      await this.loadSecuritySettings();
    } catch (error) {
      console.error('Error al activar biometría:', error);
      alert('Error al activar biometría. Por favor, intenta nuevamente.');
    } finally {
      this.isUpdatingSecurity.set(false);
    }
  }

  /**
   * Desactiva la biometría
   */
  async disableBiometric() {
    this.isUpdatingSecurity.set(true);
    try {
      await this.securitySettingsService.saveSettings({
        biometric_enabled: false
      });

      await this.loadSecuritySettings();
    } catch (error) {
      console.error('Error al desactivar biometría:', error);
      alert('Error al desactivar biometría. Por favor, intenta nuevamente.');
    } finally {
      this.isUpdatingSecurity.set(false);
    }
  }

  /**
   * Elimina la credencial biométrica registrada
   */
  async deleteBiometric() {
    if (!confirm('¿Estás seguro de que deseas eliminar la credencial biométrica registrada? Tendrás que registrarla nuevamente para usar biometría.')) {
      return;
    }

    this.isUpdatingSecurity.set(true);
    try {
      await this.securitySettingsService.saveSettings({
        biometric_enabled: false,
        biometric_key_id: null
      });

      await this.loadSecuritySettings();
      alert('Credencial biométrica eliminada exitosamente.');
    } catch (error) {
      console.error('Error al eliminar biometría:', error);
      alert('Error al eliminar biometría. Por favor, intenta nuevamente.');
    } finally {
      this.isUpdatingSecurity.set(false);
    }
  }

  /**
   * Maneja el cambio del toggle de bloqueo
   */
  async onLockToggleChange(enabled: boolean) {
    if (enabled) {
      // Si intenta activar pero no tiene PIN, mostrar modal de configuración
      if (!this.isPinConfigured()) {
        this.showSetupPinModal.set(true);
        return;
      }
      // Si tiene PIN, activar directamente
      await this.enableLock();
    } else {
      // Si intenta desactivar, pedir confirmación con PIN
      this.showDisableLockModal.set(true);
    }
  }

  /**
   * Activa el bloqueo
   */
  async enableLock() {
    this.isUpdatingSecurity.set(true);
    try {
      await this.securitySettingsService.saveSettings({
        lock_enabled: true
      });
      await this.loadSecuritySettings();
    } catch (error) {
      console.error('Error al activar bloqueo:', error);
      alert('Error al activar el bloqueo. Por favor, intenta nuevamente.');
    } finally {
      this.isUpdatingSecurity.set(false);
    }
  }

  /**
   * Desactiva el bloqueo (requiere PIN)
   */
  async disableLock(currentPin: string) {
    this.isUpdatingSecurity.set(true);
    try {
      const settings = this.securitySettings();
      if (!settings || !settings.pin_hash || !settings.pin_salt) {
        alert('PIN no configurado');
        return;
      }

      // Verificar PIN
      const isValid = await this.pinService.verifyPin(
        currentPin,
        settings.pin_salt,
        settings.pin_hash
      );

      if (!isValid) {
        alert('PIN incorrecto');
        return;
      }

      // Desactivar bloqueo
      await this.securitySettingsService.saveSettings({
        lock_enabled: false
      });
      
      // Si el usuario desactiva el bloqueo, mantener el PIN pero no usar /lock como login
      // El flag 'has_pin_configured' se mantiene para que pueda reactivarlo fácilmente
      
      await this.loadSecuritySettings();
      this.showDisableLockModal.set(false);
    } catch (error) {
      console.error('Error al desactivar bloqueo:', error);
      alert('Error al desactivar el bloqueo. Por favor, intenta nuevamente.');
    } finally {
      this.isUpdatingSecurity.set(false);
    }
  }

  /**
   * Abre el modal de configuración de PIN
   */
  openSetupPinModal() {
    this.showSetupPinModal.set(true);
  }

  /**
   * Cierra el modal de configuración de PIN
   */
  closeSetupPinModal() {
    this.showSetupPinModal.set(false);
  }

  /**
   * Cancela la configuración inicial de PIN
   */
  cancelInitialPinSetup() {
    // No permitir cancelar la configuración inicial, debe configurarse
    // Pero si el usuario realmente quiere cancelar, redirigir a login
    if (confirm('Debes configurar un PIN para continuar. ¿Deseas cerrar sesión?')) {
      this.signOut();
    }
  }

  /**
   * Configura un nuevo PIN
   */
  async setupPin(pin: string, confirmPin: string) {
    // Validar que los PINs coincidan
    if (pin !== confirmPin) {
      alert('Los PINs no coinciden');
      return;
    }

    // Validar formato del PIN
    const validationError = this.pinService.getPinValidationError(pin);
    if (validationError) {
      alert(validationError);
      return;
    }

    this.isUpdatingSecurity.set(true);
    try {
      // Generar salt y hash del PIN
      const salt = await this.pinService.generateSalt();
      const hash = await this.pinService.hashPin(pin, salt);

      // Guardar configuración
      await this.securitySettingsService.saveSettings({
        pin_hash: hash,
        pin_salt: salt,
        lock_enabled: true // Activar bloqueo al configurar PIN
      });

      // Verificar que se guardó correctamente
      const savedSettings = await this.securitySettingsService.getSettings();
      if (!savedSettings || !savedSettings.pin_hash || !savedSettings.pin_salt) {
        throw new Error('El PIN no se guardó correctamente en la base de datos');
      }

      // Guardar información en localStorage para permitir /lock como método de autenticación
      // incluso cuando la sesión de Supabase expire
      const userId = await this.authService.getCurrentUserId();
      if (userId) {
        localStorage.setItem('has_pin_configured', 'true');
        localStorage.setItem('user_id_for_pin', userId); // Guardar user_id para verificar PIN sin sesión
      }

      await this.loadSecuritySettings();
      this.showSetupPinModal.set(false);
      this.isInitialPinSetup.set(false); // Cerrar vista de configuración inicial
      
      // Limpiar cache del servicio helper para que se actualice la información
      this.sessionHelper.clearPinCache();
      
      // Si llegó aquí desde la configuración inicial, redirigir a la ruta original
      const urlParams = new URLSearchParams(window.location.search);
      const returnUrl = urlParams.get('returnUrl');
      
      if (returnUrl) {
        // Limpiar query params y redirigir
        this.router.navigateByUrl(returnUrl);
      } else {
        // Redirigir al dashboard por defecto
        this.router.navigate(['/expenses-dashboard']);
      }
      
      alert('PIN configurado exitosamente');
    } catch (error: any) {
      console.error('Error al configurar PIN:', error);
      const errorMessage = error?.message || 'Error desconocido al configurar el PIN';
      alert(`Error al configurar el PIN: ${errorMessage}. Por favor, intenta nuevamente.`);
    } finally {
      this.isUpdatingSecurity.set(false);
    }
  }

  /**
   * Abre el modal de cambio de PIN
   */
  openChangePinModal() {
    this.showChangePinModal.set(true);
  }

  /**
   * Cierra el modal de cambio de PIN
   */
  closeChangePinModal() {
    this.showChangePinModal.set(false);
  }

  /**
   * Cambia el PIN
   */
  async changePin(currentPin: string, newPin: string, confirmPin: string) {
    // Validar PIN actual
    const settings = this.securitySettings();
    if (!settings || !settings.pin_hash || !settings.pin_salt) {
      alert('PIN no configurado');
      return;
    }

    const isValidCurrent = await this.pinService.verifyPin(
      currentPin,
      settings.pin_salt,
      settings.pin_hash
    );

    if (!isValidCurrent) {
      alert('PIN actual incorrecto');
      return;
    }

    // Validar que los nuevos PINs coincidan
    if (newPin !== confirmPin) {
      alert('Los nuevos PINs no coinciden');
      return;
    }

    // Validar formato del nuevo PIN
    const validationError = this.pinService.getPinValidationError(newPin);
    if (validationError) {
      alert(validationError);
      return;
    }

    this.isUpdatingSecurity.set(true);
    try {
      // Generar nuevo salt y hash
      const salt = await this.pinService.generateSalt();
      const hash = await this.pinService.hashPin(newPin, salt);

      // Guardar nueva configuración
      await this.securitySettingsService.saveSettings({
        pin_hash: hash,
        pin_salt: salt
      });

      await this.loadSecuritySettings();
      this.showChangePinModal.set(false);
      
      // Limpiar cache del servicio helper para que se actualice la información
      this.sessionHelper.clearPinCache();
      
      alert('PIN cambiado exitosamente');
      
      // Redirigir de vuelta al dashboard o mantener en settings
      // El usuario puede elegir quedarse en settings
    } catch (error) {
      console.error('Error al cambiar PIN:', error);
      alert('Error al cambiar el PIN. Por favor, intenta nuevamente.');
    } finally {
      this.isUpdatingSecurity.set(false);
    }
  }

  // ==================== APARIENCIA ====================
  
  /**
   * Obtiene el signal del tema actual (para usar en el template con selectedTheme())
   */
  get selectedTheme() {
    return this.settingsService.currentTheme;
  }
  
  /**
   * Maneja el cambio de tema
   */
  onThemeChange(theme: Theme): void {
    this.settingsService.setTheme(theme);
  }
  
  // ==================== GESTIÓN DE DATOS ====================
  
  /**
   * Abre el modal de selección de rango de fechas
   */
  openDateRangeModal() {
    this.showDateRangeModal.set(true);
  }
  
  /**
   * Cierra el modal de selección de rango de fechas
   */
  closeDateRangeModal() {
    this.showDateRangeModal.set(false);
  }
  
  /**
   * Obtiene el label del rango de fechas
   */
  dateRangeLabel(): string {
    const start = this.dateRangeStart();
    const end = this.dateRangeEnd();
    if (!start && !end) {
      return 'Mes Actual';
    }
    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      return `${startDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} - ${endDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`;
    }
    return 'Seleccionar rango';
  }
  
  /**
   * Resetea el rango al mes actual
   */
  resetToCurrentMonth() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    this.dateRangeStart.set(firstDay.toISOString().split('T')[0]);
    this.dateRangeEnd.set(lastDay.toISOString().split('T')[0]);
  }
  
  /**
   * Aplica el rango de fechas seleccionado
   */
  applyDateRange() {
    // TODO: Implementar lógica de aplicación del rango
    console.log('Rango aplicado:', this.dateRangeStart(), this.dateRangeEnd());
    this.closeDateRangeModal();
  }
  
  /**
   * Exporta los gastos
   */
  async onExportExpenses() {
    // TODO: Implementar lógica de exportación
    console.log('Exportando gastos...');
    this.isExporting.set(true);
    try {
      // Simular exportación
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Funcionalidad de exportación pendiente de implementar');
    } finally {
      this.isExporting.set(false);
    }
  }
  
  /**
   * Muestra el diálogo de confirmación para restablecer categorías
   */
  showResetCategoriesDialog() {
    this.showResetCategoriesConfirm.set(true);
  }
  
  /**
   * Cierra el diálogo de confirmación de restablecer categorías
   */
  closeResetCategoriesConfirm() {
    this.showResetCategoriesConfirm.set(false);
  }
  
  /**
   * Restablece las categorías
   */
  async onResetCategories() {
    // TODO: Implementar lógica de restablecimiento de categorías
    console.log('Restableciendo categorías...');
    this.isResettingCategories.set(true);
    try {
      // Simular restablecimiento
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Funcionalidad de restablecer categorías pendiente de implementar');
      this.closeResetCategoriesConfirm();
    } finally {
      this.isResettingCategories.set(false);
    }
  }
  
  // ==================== ACCIONES CRÍTICAS ====================
  
  /**
   * Muestra el diálogo de confirmación para eliminar gastos
   */
  showDeleteExpensesDialog() {
    this.showDeleteConfirm.set(true);
  }
  
  /**
   * Cierra el diálogo de confirmación de eliminar gastos
   */
  closeDeleteConfirm() {
    this.showDeleteConfirm.set(false);
  }
  
  /**
   * Elimina todos los datos asociados al usuario en la base de datos
   */
  async onDeleteAllExpenses() {
    const userId = await this.authService.getCurrentUserId();
    if (!userId) {
      alert('Error: Usuario no autenticado.');
      return;
    }

    this.isDeletingExpenses.set(true);
    
    try {
      const errors: string[] = [];

      // 1. Eliminar todos los gastos familiares asociados al usuario
      // Primero obtenemos los miembros de familia del usuario para eliminar sus gastos
      const { data: familyMembers, error: membersError } = await supabase
        .from('family_members')
        .select('id')
        .eq('user_id', userId);

      if (membersError) {
        console.error('Error obteniendo miembros de familia:', membersError);
        errors.push('Error al obtener miembros de familia');
      } else if (familyMembers && familyMembers.length > 0) {
        const memberIds = familyMembers.map(m => m.id);
        
        // Eliminar gastos familiares de los miembros del usuario
        const { error: expensesError } = await supabase
          .from('family_expenses')
          .delete()
          .in('responsible_member_id', memberIds);

        if (expensesError) {
          console.error('Error eliminando gastos familiares:', expensesError);
          errors.push('Error al eliminar gastos familiares');
        }

        // Eliminar gastos de vacaciones de los miembros del usuario
        const { error: vacationExpensesError } = await supabase
          .from('vacation_expenses')
          .delete()
          .in('responsible_member_id', memberIds);

        if (vacationExpensesError) {
          console.error('Error eliminando gastos de vacaciones:', vacationExpensesError);
          errors.push('Error al eliminar gastos de vacaciones');
        }

        // Eliminar miembros de familia
        const { error: deleteMembersError } = await supabase
          .from('family_members')
          .delete()
          .eq('user_id', userId);

        if (deleteMembersError) {
          console.error('Error eliminando miembros de familia:', deleteMembersError);
          errors.push('Error al eliminar miembros de familia');
        }
      }

      // 2. Eliminar actividades diarias del usuario
      const { error: activitiesError } = await supabase
        .from('daily_activities')
        .delete()
        .eq('user_id', userId);

      if (activitiesError) {
        console.error('Error eliminando actividades:', activitiesError);
        errors.push('Error al eliminar actividades');
      }

      // 3. Eliminar schedules semanales del usuario (esto eliminará en cascada las comidas y actividades relacionadas)
      const { error: schedulesError } = await supabase
        .from('weekly_schedules')
        .delete()
        .eq('user_id', userId);

      if (schedulesError) {
        console.error('Error eliminando schedules semanales:', schedulesError);
        errors.push('Error al eliminar schedules semanales');
      }

      // 4. Eliminar suscripciones push del usuario
      const { error: pushSubsError } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId);

      if (pushSubsError) {
        console.error('Error eliminando suscripciones push:', pushSubsError);
        errors.push('Error al eliminar suscripciones push');
      }

      // 5. Eliminar notificaciones de actividad del usuario
      const { error: activityNotifError } = await supabase
        .from('activity_notifications')
        .delete()
        .eq('user_id', userId);

      if (activityNotifError) {
        console.error('Error eliminando notificaciones de actividad:', activityNotifError);
        errors.push('Error al eliminar notificaciones de actividad');
      }

      // 6. Eliminar configuraciones de bloqueo del usuario
      const { error: lockSettingsError } = await supabase
        .from('user_security_settings')
        .delete()
        .eq('user_id', userId);

      if (lockSettingsError) {
        console.error('Error eliminando configuraciones de bloqueo:', lockSettingsError);
        errors.push('Error al eliminar configuraciones de bloqueo');
      }

      // 7. Eliminar passkeys del usuario
      const { error: passkeysError } = await supabase
        .from('user_passkeys')
        .delete()
        .eq('user_id', userId);

      if (passkeysError) {
        console.error('Error eliminando passkeys:', passkeysError);
        errors.push('Error al eliminar passkeys');
      }

      // Mostrar resultado
      if (errors.length > 0) {
        alert(`Algunos datos no se pudieron eliminar:\n${errors.join('\n')}`);
      } else {
        alert('Todos los datos del usuario han sido eliminados exitosamente.');
      }

      this.closeDeleteConfirm();
    } catch (error) {
      console.error('Error al eliminar todos los datos:', error);
      alert('Error al eliminar los datos. Por favor, intenta nuevamente.');
    } finally {
      this.isDeletingExpenses.set(false);
    }
  }

  /**
   * Cierra la sesión del usuario
   */
  async signOut() {
    // Confirmar acción
    if (!confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      return;
    }

    try {
      // Limpiar estado de bloqueo y otros datos locales primero
      sessionStorage.clear();
      localStorage.removeItem('has_pin_configured');
      localStorage.removeItem('user_id_for_pin');
      
      // Limpiar cache de SessionHelperService para que el login funcione correctamente
      this.sessionHelper.clearCache();
      
      // Cerrar sesión en Supabase
      await this.authService.logout();

      // Esperar un momento para asegurar que el estado se actualice
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Redirigir a login con replaceUrl para evitar volver atrás
      // Usar window.location para forzar una navegación completa y limpiar todo el estado
      window.location.replace('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      // Intentar redirigir de todas formas
      try {
        sessionStorage.clear();
        localStorage.removeItem('has_pin_configured');
        localStorage.removeItem('user_id_for_pin');
        // Limpiar cache de SessionHelperService también en el catch
        this.sessionHelper.clearCache();
        window.location.replace('/login');
      } catch (navError) {
        console.error('Error al redirigir:', navError);
        alert('Error al cerrar sesión. Por favor, recarga la página.');
      }
    }
  }
}
