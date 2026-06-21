import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import {
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type ChartConfiguration
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import 'hammerjs';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import type { FinanceTimeline } from '../../models/finance';
import type { AppTheme } from '../../services/theme.service';

type ChartKind = 'monthly' | 'cumulative';

Chart.register(
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
  zoomPlugin
);

@Component({
  selector: 'app-finance-chart',
  standalone: true,
  imports: [ButtonModule, CardModule],
  templateUrl: './finance-chart.component.html',
  styleUrl: './finance-chart.component.scss'
})
export class FinanceChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('monthlyChart') private monthlyCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('cumulativeChart') private cumulativeCanvas?: ElementRef<HTMLCanvasElement>;

  @Input({ required: true }) timeline: FinanceTimeline = {
    openingBalance: 0,
    points: []
  };
  @Input() loading = false;
  @Input() theme: AppTheme = 'dark';

  private monthlyChart?: Chart<'line'>;
  private cumulativeChart?: Chart<'line'>;
  private viewReady = false;

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.renderCharts();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['timeline'] || changes['theme']) this.renderCharts();
  }

  ngOnDestroy(): void {
    this.monthlyChart?.destroy();
    this.cumulativeChart?.destroy();
  }

  protected resetZoom(kind: ChartKind): void {
    (kind === 'monthly' ? this.monthlyChart : this.cumulativeChart)?.resetZoom();
  }

  private renderCharts(): void {
    if (!this.viewReady || !this.monthlyCanvas || !this.cumulativeCanvas) return;

    this.monthlyChart?.destroy();
    this.cumulativeChart?.destroy();
    this.monthlyChart = new Chart(
      this.monthlyCanvas.nativeElement,
      this.createConfiguration('monthly')
    );
    this.cumulativeChart = new Chart(
      this.cumulativeCanvas.nativeElement,
      this.createConfiguration('cumulative')
    );
  }

  private createConfiguration(kind: ChartKind): ChartConfiguration<'line'> {
    const points = this.timeline.points;
    const dark = this.theme === 'dark';
    const tickColor = dark ? '#9aada3' : '#7b8983';
    const gridColor = dark
      ? 'rgba(220, 238, 228, .1)'
      : 'rgba(38, 54, 47, .08)';
    const datasets = kind === 'monthly'
      ? [
          this.createDataset(
            'Monthly income',
            points.map((point) => point.income),
            '#2d7a58'
          ),
          this.createDataset(
            'Monthly expenses',
            points.map((point) => point.expenses),
            '#d46f52'
          ),
          this.createDataset(
            'Monthly savings',
            points.map((point) => point.savings),
            '#536fd1'
          )
        ]
      : [
          this.createDataset(
            'Cumulative balance',
            points.map((point) => point.cumulativeBalance),
            '#8a67d5'
          )
        ];

    return {
      type: 'line',
      data: {
        labels: points.map((point) => this.formatMonth(point.month)),
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        normalized: true,
        interaction: { intersect: false, mode: 'index' },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: tickColor,
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 8
            }
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: tickColor,
              callback: (value) => `${Number(value).toLocaleString('es-ES')} €`
            }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            align: 'center',
            labels: {
              usePointStyle: true,
              color: dark ? '#c2d1c9' : '#506159'
            }
          },
          tooltip: {
            callbacks: {
              label: (context) =>
                `${context.dataset.label}: ${Number(context.parsed.y).toLocaleString('es-ES', {
                  style: 'currency',
                  currency: 'EUR'
                })}`
            }
          },
          zoom: {
            pan: { enabled: true, mode: 'x' },
            zoom: {
              wheel: { enabled: true },
              pinch: { enabled: true },
              mode: 'x'
            },
            limits: { x: { minRange: 3 } }
          }
        }
      }
    };
  }

  private createDataset(label: string, data: number[], color: string) {
    return {
      label,
      data,
      borderColor: color,
      backgroundColor: `${color}1f`,
      pointBackgroundColor: color,
      tension: 0,
      cubicInterpolationMode: 'default' as const,
      borderWidth: 2.5,
      pointRadius: 0,
      pointHitRadius: 8,
      pointHoverRadius: 4
    };
  }

  private formatMonth(month: string): string {
    const [year, monthNumber] = month.split('-').map(Number);
    return new Intl.DateTimeFormat('en', {
      month: 'short',
      year: '2-digit'
    }).format(new Date(year, monthNumber - 1, 1));
  }
}
