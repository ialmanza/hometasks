import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AppUpdateService } from '../../services/app-update.service';

@Component({
  selector: 'app-update',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="showUpdateBanner" class="update-banner">
      <div class="update-content">
        <div class="update-info">
          <i class="fas fa-download"></i>
          <span>Nueva versión disponible</span>
        </div>
        <div class="update-actions">
          <button (click)="updateNow()" class="btn-update">
            Actualizar ahora
          </button>
          <button (click)="dismissUpdate()" class="btn-dismiss">
            Más tarde
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .update-banner {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      z-index: 9999;
      padding: 12px 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      animation: slideDown 0.3s ease-out;
    }

    .update-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      max-width: 1200px;
      margin: 0 auto;
    }

    .update-info {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 500;
    }

    .update-actions {
      display: flex;
      gap: 10px;
    }

    .btn-update, .btn-dismiss {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s ease;
    }

    .btn-update {
      background: #4CAF50;
      color: white;
    }

    .btn-update:hover {
      background: #45a049;
      transform: translateY(-1px);
    }

    .btn-dismiss {
      background: rgba(255,255,255,0.2);
      color: white;
    }

    .btn-dismiss:hover {
      background: rgba(255,255,255,0.3);
    }

    @keyframes slideDown {
      from {
        transform: translateY(-100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    @media (max-width: 768px) {
      .update-content {
        flex-direction: column;
        gap: 10px;
        text-align: center;
      }

      .update-actions {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class AppUpdateComponent implements OnInit, OnDestroy {
  showUpdateBanner = false;
  private updateSubscription?: Subscription;

  constructor(private appUpdateService: AppUpdateService) {}

  ngOnInit() {
    this.updateSubscription = this.appUpdateService.updateAvailable$.subscribe(
      updateEvent => {
        if (updateEvent) {
          this.showUpdateBanner = true;
          // Mostrar notificación push también
          this.appUpdateService.showUpdateNotification();
        }
      }
    );
  }

  ngOnDestroy() {
    if (this.updateSubscription) {
      this.updateSubscription.unsubscribe();
    }
  }

  async updateNow() {
    this.showUpdateBanner = false;
    await this.appUpdateService.activateUpdate();
  }

  dismissUpdate() {
    this.showUpdateBanner = false;
    this.appUpdateService.clearUpdateState();
  }
} 