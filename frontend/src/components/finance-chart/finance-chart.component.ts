import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from "@angular/core";
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
  type ChartConfiguration,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import "hammerjs";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import type { FinanceTimeline } from "../../models/finance";
import type { AppTheme } from "../../services/theme.service";

type SavingsMode = "monthly" | "cumulative";

Chart.register(
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
  zoomPlugin,
);

@Component({
  selector: "app-finance-chart",
  standalone: true,
  imports: [ButtonModule, CardModule],
  templateUrl: "./finance-chart.component.html",
  styleUrl: "./finance-chart.component.scss",
})
export class FinanceChartComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @ViewChild("financeChart")
  private chartCanvas?: ElementRef<HTMLCanvasElement>;
  @Input({ required: true }) timeline: FinanceTimeline = {
    openingBalance: 0,
    points: [],
  };
  @Input() loading = false;
  @Input() theme: AppTheme = "dark";

  protected savingsMode: SavingsMode = "monthly";
  private chart?: Chart<"line">;
  private viewReady = false;

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.renderChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["timeline"] || changes["theme"]) this.renderChart();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  protected setSavingsMode(mode: SavingsMode): void {
    this.savingsMode = mode;
    this.renderChart();
  }

  protected resetZoom(): void {
    this.chart?.resetZoom();
  }

  private renderChart(): void {
    if (!this.viewReady || !this.chartCanvas) return;
    this.chart?.destroy();

    const points = this.timeline.points;
    const dark = this.theme === "dark";
    const tickColor = dark ? "#9aada3" : "#7b8983";
    const gridColor = dark
      ? "rgba(220, 238, 228, .1)"
      : "rgba(38, 54, 47, .08)";
    const savingsValues = points.map((point) => {
      return this.savingsMode === "monthly"
        ? point.savings
        : point.cumulativeBalance;
    });
    const config: ChartConfiguration<"line"> = {
      type: "line",
      data: {
        labels: points.map((point) => {
          return this.formatMonth(point.month);
        }),
        datasets: [
          this.createDataset(
            "Monthly income",
            points.map((point) => {
              return point.income;
            }),
            "#2d7a58",
          ),
          this.createDataset(
            "Monthly expenses",
            points.map((point) => {
              return point.expenses;
            }),
            "#d46f52",
          ),
          this.createDataset(
            this.savingsMode === "monthly"
              ? "Monthly savings"
              : "Cumulative balance",
            savingsValues,
            "#536fd1",
          ),
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: "index" },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: tickColor,
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 12,
            },
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: tickColor,
              callback: (value) => {
                return `${Number(value).toLocaleString("es-ES")} €`;
              },
            },
          },
        },
        plugins: {
          legend: {
            position: "bottom",
            align: "center",
            labels: {
              usePointStyle: true,
              color: dark ? "#c2d1c9" : "#506159",
            },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                return `${context.dataset.label}: ${Number(
                  context.parsed.y,
                ).toLocaleString("es-ES", {
                  style: "currency",
                  currency: "EUR",
                })}`;
              },
            },
          },
          zoom: {
            pan: { enabled: true, mode: "x" },
            zoom: {
              wheel: { enabled: true },
              pinch: { enabled: true },
              mode: "x",
            },
            limits: { x: { minRange: 3 } },
          },
        },
      },
    };

    this.chart = new Chart(this.chartCanvas.nativeElement, config);
  }

  private createDataset(label: string, data: number[], color: string) {
    return {
      label,
      data,
      borderColor: color,
      backgroundColor: `${color}1f`,
      pointBackgroundColor: color,
      tension: 0.35,
      borderWidth: 2.5,
      pointRadius: 2,
      pointHoverRadius: 5,
    };
  }

  private formatMonth(month: string): string {
    const [year, monthNumber] = month.split("-").map(Number);
    return new Intl.DateTimeFormat("en", {
      month: "short",
      year: "2-digit",
    }).format(new Date(year, monthNumber - 1, 1));
  }
}
