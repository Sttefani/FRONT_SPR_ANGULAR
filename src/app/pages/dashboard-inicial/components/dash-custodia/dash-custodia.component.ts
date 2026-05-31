// src/app/pages/dashboard-inicial/components/dash-custodia/dash-custodia.component.ts

import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { CustodiaService, DashboardCustodia } from '../../../../services/custodia.service';

@Component({
  selector: 'app-dash-custodia',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dash-custodia.component.html',
  styleUrls: ['../../dashboard-inicial.component.scss'] // Reutiliza a folha de estilos dourado/escuro pai
})
export class DashCustodiaComponent implements OnInit {
  @Input() user: any = null;

  sinalizadores: DashboardCustodia | null = null;
  isLoading = true;

  constructor(
    private custodiaService: CustodiaService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.carregarDadosForense();
  }

  carregarDadosForense(): void {
    this.isLoading = true;
    this.custodiaService.getDashboard().subscribe({
      next: (data) => {
        this.sinalizadores = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar telemetria da Central de Custódia:', err);
        this.isLoading = false;
      }
    });
  }

  // Navegadores rápidos com filtros prontos para a listagem técnica de vestígios
  irParaVestigiosStatus(statusFiltrado: string): void {
    this.router.navigate(['/gabinete-virtual/custodia/vestigios'], {
      queryParams: { status: statusFiltrado }
    });
  }

  irParaVestigiosBiologicos(): void {
    this.router.navigate(['/gabinete-virtual/custodia/vestigios'], {
      queryParams: { biologico: true }
    });
  }

  irParaListaCompleta(): void {
    this.router.navigate(['/gabinete-virtual/custodia/vestigios']);
  }

  getFirstName(fullName?: string): string {
    if (!fullName) return 'Custodiante';
    return fullName.split(' ')[0];
  }

  calcularPorcentagem(valor: number, total: number): number {
    if (!total) return 0;
    return Math.round((valor / total) * 100);
  }
}
