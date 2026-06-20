import { Component } from '@angular/core';
import { DialogLayerComponent } from '../layers/dialog-layer/dialog-layer.component';
import { DashboardScreenComponent } from '../screens/dashboard-screen/dashboard-screen.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DashboardScreenComponent, DialogLayerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {}
