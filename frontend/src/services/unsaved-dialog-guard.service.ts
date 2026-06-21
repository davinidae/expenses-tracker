import { Injectable, inject } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { DynamicDialogRef } from 'primeng/dynamicdialog';

@Injectable({ providedIn: 'root' })
export class UnsavedDialogGuardService {
  private readonly confirmationService = inject(ConfirmationService);
  private confirmationOpen = false;

  confirmDiscard(ref: DynamicDialogRef): void {
    if (this.confirmationOpen) return;
    this.confirmationOpen = true;

    this.confirmationService.confirm({
      header: 'Close without saving?',
      message: 'Your unsaved changes will be lost. Are you sure you want to close?',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: {
        label: 'Close without saving',
        severity: 'danger'
      },
      rejectButtonProps: {
        label: 'Keep editing',
        severity: 'secondary',
        outlined: true
      },
      accept: () => {
        this.confirmationOpen = false;
        ref.close();
      },
      reject: () => {
        this.confirmationOpen = false;
      }
    });
  }
}
