import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-terms-and-privacy',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="bg-background-light dark:bg-background-dark text-[#111817] dark:text-white min-h-screen">
      <!-- Mobile Header -->
      <header class="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-4 py-3 flex items-center border-b border-slate-200 dark:border-slate-800 md:hidden">
        <button class="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors" (click)="goBack()">
          <span class="material-symbols-outlined text-slate-600 dark:text-slate-400" translate="no">arrow_back_ios_new</span>
        </button>
        <h1 class="flex-1 text-center font-semibold text-lg text-slate-900 dark:text-white pr-8">
          Términos y Privacidad
        </h1>
      </header>

      <!-- Desktop Header -->
      <nav class="hidden md:flex sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 items-center justify-between">
        <button class="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors" (click)="goBack()">
          <span class="material-symbols-outlined text-slate-600 dark:text-slate-400" translate="no">arrow_back_ios_new</span>
        </button>
        <h1 class="text-lg font-bold text-slate-900 dark:text-white">Términos y Privacidad</h1>
        <div class="w-10"></div>
      </nav>

      <!-- Mobile View -->
      <main class="p-4 pb-32 max-w-lg mx-auto md:hidden">
        <div class="mb-8 text-center px-4">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
            <span class="material-symbols-outlined text-primary text-3xl" translate="no">verified_user</span>
          </div>
          <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">Tu privacidad importa</h2>
          <p class="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            Hemos simplificado nuestros términos para que sean fáciles de entender para toda la familia.
          </p>
        </div>

        <div class="space-y-3">
          @for (section of sections; track section.id) {
            <div class="accordion-item bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-sm transition-all duration-200"
                 [class.active]="activeAccordion() === section.id">
              <button class="w-full px-5 py-4 flex items-center justify-between text-left group" (click)="toggleAccordion(section.id)">
                <div class="flex items-center space-x-3">
                  <span class="text-primary font-bold text-lg">{{ section.id }}.</span>
                  <span class="font-semibold text-slate-800 dark:text-slate-100">{{ section.title }}</span>
                </div>
                <span class="material-symbols-outlined chevron transition-transform text-slate-400 group-hover:text-primary"
                      [class.rotate-180]="activeAccordion() === section.id"
                      translate="no">expand_more</span>
              </button>
              <div class="accordion-content px-5" [class.open]="activeAccordion() === section.id">
                <div class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed space-y-3 pb-4">
                  @if (section.content) {
                    <div [innerHTML]="section.content"></div>
                  }
                  @if (section.listItems) {
                    <ul class="space-y-2 list-none">
                      @for (item of section.listItems; track item) {
                        <li class="flex items-start">
                          <span class="material-symbols-outlined text-primary text-xs mt-1 mr-2" translate="no">circle</span>
                          <span>{{ item }}</span>
                        </li>
                      }
                    </ul>
                  }
                  @if (section.additionalContent) {
                    <div [innerHTML]="section.additionalContent"></div>
                  }
                </div>
              </div>
            </div>
          }
        </div>

        <div class="mt-8 px-4 text-center">
          <p class="text-xs text-slate-400 dark:text-slate-500">
            Última actualización: {{ lastUpdate }}
          </p>
        </div>
      </main>

      <!-- Desktop View -->
      <main class="hidden md:block max-w-2xl mx-auto px-6 py-8">
        <div class="mb-8">
          <div class="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-primary text-xs font-semibold mb-3">
            <span class="material-symbols-outlined text-sm mr-1.5" translate="no">update</span>
            Última actualización: {{ lastUpdate }}
          </div>
          <p class="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            Por favor, lee atentamente estos términos antes de utilizar nuestra aplicación. Tu privacidad y confianza son nuestra prioridad.
          </p>
        </div>

        @for (section of sections; track section.id) {
          <section class="mb-10">
            <div class="flex items-center gap-3 mb-4">
              <div class="h-8 w-1 bg-primary rounded-full"></div>
              <h2 class="text-xl font-bold text-slate-900 dark:text-white leading-tight">{{ section.id }}. {{ section.title }}</h2>
            </div>
            <div class="space-y-4 text-slate-600 dark:text-slate-300 leading-relaxed">
              @if (section.content) {
                <div [innerHTML]="section.content"></div>
              }
              @if (section.listItems) {
                <ul class="grid gap-3">
                  @for (item of section.listItems; track item) {
                    <li class="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 shadow-sm">
                      <div class="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                        <span class="material-symbols-outlined text-primary text-sm font-bold" translate="no">check</span>
                      </div>
                      <span class="text-slate-700 dark:text-slate-300 text-sm font-medium">{{ item }}</span>
                    </li>
                  }
                </ul>
              }
              @if (section.additionalContent) {
                <div [innerHTML]="section.additionalContent"></div>
              }
              @if (section.warning) {
                <div class="p-4 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-400 rounded-r-lg">
                  <p class="text-sm text-amber-800 dark:text-amber-200">{{ section.warning }}</p>
                </div>
              }
              @if (section.security) {
                <div class="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                  <div class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-primary" translate="no">security</span>
                    <span class="text-sm font-semibold dark:text-white">{{ section.security }}</span>
                  </div>
                  <span class="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2 py-1 rounded-full font-bold">ACTIVO</span>
                </div>
              }
            </div>
          </section>
        }

        <footer class="pt-6 border-t border-slate-200 dark:border-slate-800 text-center space-y-6 pb-12">
          <p class="text-xs text-slate-500 dark:text-slate-500 italic">
            Al continuar usando la aplicación, confirmas que has leído y aceptas estos términos.
          </p>
          <button class="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98]" (click)="goBack()">
            Entendido y Aceptar
          </button>
        </footer>
      </main>
    </div>
  `,
  styles: [`
    .accordion-content {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease-out, opacity 0.3s ease-out;
      opacity: 0;
    }
    .accordion-item.active .accordion-content,
    .accordion-content.open {
      max-height: 2000px;
      opacity: 1;
      padding-bottom: 1rem;
    }
    .chevron {
      transition: transform 0.3s ease;
    }
    .chevron.rotate-180 {
      transform: rotate(180deg);
    }
  `]
})
export class TermsAndPrivacyComponent {
  activeAccordion = signal<number | null>(null);
  lastUpdate = '24 de Mayo, 2024';

  sections = [
    {
      id: 1,
      title: 'Identificación del Servicio',
      content: `
        <p><span class="font-semibold text-slate-900 dark:text-white">Family Planner</span> (en adelante, "la Aplicación") es una aplicación web progresiva (PWA) destinada a la organización de tareas, actividades, gastos y planificación familiar, accesible desde navegadores web y dispositivos compatibles.</p>
        <p>El acceso y uso de la Aplicación atribuye la condición de Usuario, implicando la aceptación plena y sin reservas de los presentes Términos y Condiciones y de la Política de Privacidad.</p>
      `
    },
    {
      id: 2,
      title: 'Aceptación de los Términos',
      content: `
        <p>El Usuario declara haber leído, comprendido y aceptado expresamente el presente documento.</p>
      `,
      warning: 'En caso de no estar de acuerdo con alguna de las disposiciones aquí establecidas, el Usuario deberá abstenerse de utilizar la Aplicación.'
    },
    {
      id: 3,
      title: 'Objeto del Servicio',
      content: `
        <p class="mb-3">La Aplicación tiene por objeto proporcionar herramientas digitales diseñadas para facilitar la armonía en el hogar:</p>
      `,
      listItems: [
        'Organización de tareas y actividades diarias',
        'Planificación de comidas y menús semanales',
        'Gestión inteligente de listas de compras',
        'Administración centralizada de miembros familiares',
        'Registro, visualización y análisis de gastos familiares y de vacaciones',
        'Visualización de información mediante calendarios y paneles de control'
      ],
      additionalContent: '<p class="mt-4">La Aplicación no constituye un servicio financiero, contable, legal ni de asesoramiento profesional.</p>'
    },
    {
      id: 4,
      title: 'Condiciones de Uso',
      content: `
        <p>El Usuario se compromete a:</p>
      `,
      listItems: [
        'Utilizar la Aplicación de conformidad con la ley vigente',
        'No emplear la Aplicación con fines ilícitos, fraudulentos o no autorizados',
        'Proporcionar información veraz y actualizada',
        'Custodiar de forma diligente sus credenciales de acceso'
      ],
      additionalContent: '<p class="mt-4">La Aplicación no será responsable por daños derivados del uso indebido o negligente por parte del Usuario.</p>'
    },
    {
      id: 5,
      title: 'Registro, Seguridad y Autenticación',
      content: `
        <p>El acceso a determinadas funcionalidades requiere autenticación mediante:</p>
      `,
      listItems: [
        'Correo electrónico y contraseña',
        'PIN de seguridad',
        'Autenticación biométrica, cuando el dispositivo lo permita'
      ],
      additionalContent: '<p class="mt-4">El Usuario es el único responsable del uso de su cuenta y de las acciones realizadas desde la misma.</p>'
    },
    {
      id: 6,
      title: 'Limitaciones del Servicio',
      content: `
        <p>El Usuario reconoce que:</p>
      `,
      listItems: [
        'Algunas funcionalidades requieren conexión a internet',
        'No se garantiza la disponibilidad continua del servicio',
        'La Aplicación puede experimentar interrupciones, actualizaciones o modificaciones',
        'Determinadas funcionalidades pueden estar en desarrollo o ser descontinuadas'
      ]
    },
    {
      id: 7,
      title: 'Datos Personales Tratados',
      content: `
        <p>La Aplicación podrá recopilar y tratar los siguientes datos personales:</p>
      `,
      listItems: [
        'Dirección de correo electrónico',
        'Información básica de miembros familiares',
        'Datos ingresados por el Usuario (tareas, gastos, actividades, etc.)',
        'Preferencias de configuración y seguridad'
      ],
      additionalContent: '<p class="mt-4">No se recopilan datos bancarios, financieros sensibles ni información de pago.</p>'
    },
    {
      id: 8,
      title: 'Finalidad del Tratamiento de Datos',
      content: `
        <p>Los datos personales serán tratados exclusivamente para:</p>
      `,
      listItems: [
        'Permitir el funcionamiento de la Aplicación',
        'Sincronizar información entre dispositivos',
        'Mostrar estadísticas y resúmenes internos',
        'Garantizar la seguridad y autenticación del Usuario'
      ],
      additionalContent: '<p class="mt-4">Los datos no serán cedidos, vendidos ni compartidos con terceros con fines comerciales.</p>'
    },
    {
      id: 9,
      title: 'Base Legal del Tratamiento',
      content: `
        <p>El tratamiento de los datos personales se fundamenta en:</p>
      `,
      listItems: [
        'El consentimiento expreso del Usuario',
        'La necesidad de ejecutar el servicio solicitado'
      ]
    },
    {
      id: 10,
      title: 'Seguridad de la Información',
      content: `
        <p>La Aplicación implementa medidas técnicas y organizativas razonables para proteger los datos personales. No obstante, el Usuario reconoce que ningún sistema es completamente seguro.</p>
      `,
      security: 'Cifrado de extremo a extremo'
    },
    {
      id: 11,
      title: 'Derechos del Usuario',
      content: `
        <p>El Usuario podrá ejercer los derechos de:</p>
      `,
      listItems: [
        'Acceso',
        'Rectificación',
        'Actualización',
        'Supresión de sus datos personales'
      ],
      additionalContent: '<p class="mt-4">Conforme a la legislación vigente en materia de protección de datos.</p>'
    },
    {
      id: 12,
      title: 'Notificaciones',
      content: `
        <p>La Aplicación podrá enviar notificaciones relacionadas con el uso del servicio, siempre que el Usuario haya otorgado su consentimiento explícito desde su dispositivo.</p>
      `
    },
    {
      id: 13,
      title: 'Eliminación de Datos',
      content: `
        <p>El Usuario podrá eliminar datos dentro de la Aplicación. La eliminación total de la cuenta podrá requerir solicitud al soporte técnico.</p>
      `
    },
    {
      id: 14,
      title: 'Modificaciones',
      content: `
        <p>La Aplicación se reserva el derecho de modificar el presente documento. Las modificaciones entrarán en vigencia desde su publicación.</p>
      `
    },
    {
      id: 15,
      title: 'Propiedad Intelectual',
      content: `
        <p>Todos los derechos sobre la Aplicación, su código, diseño y contenido son titularidad del desarrollador.</p>
      `
    },
    {
      id: 16,
      title: 'Limitación de Responsabilidad',
      content: `
        <p>La Aplicación se proporciona "tal cual", sin garantías expresas o implícitas. El desarrollador no será responsable por daños derivados del uso del servicio.</p>
      `
    },
    {
      id: 17,
      title: 'Legislación Aplicable',
      content: `
        <p>El presente documento se rige por la legislación vigente en la República Argentina, sin perjuicio de la aplicación de normas internacionales de protección de datos cuando corresponda.</p>
      `
    },
    {
      id: 18,
      title: 'Contacto',
      content: `
        <p>Para consultas relacionadas con estos Términos o con la privacidad de los datos, el Usuario podrá comunicarse a través de los canales oficiales de soporte de Family Planner.</p>
      `
    },
    {
      id: 19,
      title: 'Aceptación Final',
      content: `
        <p>El uso de la Aplicación implica la aceptación expresa de estos Términos y Condiciones y de la Política de Privacidad.</p>
      `
    }
  ];

  constructor(private router: Router) {}

  goBack() {
    this.router.navigate(['/settings']);
  }

  toggleAccordion(id: number) {
    if (this.activeAccordion() === id) {
      this.activeAccordion.set(null);
    } else {
      this.activeAccordion.set(id);
    }
  }
}
