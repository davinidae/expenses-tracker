import { Component } from '@angular/core';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-dialog-layer',
  standalone: true,
  imports: [ConfirmDialogModule, ToastModule],
  template: `
    <p-toast />
    <p-confirmdialog />
  `
})
export class DialogLayerComponent {}
