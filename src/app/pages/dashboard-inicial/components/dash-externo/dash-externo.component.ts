// src/app/pages/dashboard-inicial/components/dash-externo/dash-externo.component.ts

import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { CustodiaService } from '../../../../services/custodia.service';

@Component({
  selector: 'app-dash-externo',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dash-externo.component.html',
  styleUrls: ['../../dashboard-inicial.component.scss'] // Reutiliza a folha de estilos dourado/escuro pai
})
export class DashExternoComponent implements OnInit {
  @Input() user: any = null;

  // Telemetria de Vestígios da Delegacia
  totalVestigiosUnidade = 0;
  vestigiosEmAnaliseUnidade = 0;
  vestigiosLiberadosUnidade = 0;

  // Telemetria de DNA da Delegacia
  totalDnasUnidade = 0;

  isLoading = true;

  constructor(
    private custodiaService: CustodiaService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.carregarDadosDemandante();
  }

  carregarDadosDemandante(): void {
    this.isLoading = true;

    // O backend já filtra automaticamente por Unidade Demandante com base no token do usuário Externo
    Promise.all([
      this.custodiaService.getVestigios({ page_size: 1 }).toPromise(),
      this.custodiaService.getVestigios({ status: 'ANDAMENTO', page_size: 1 }).toPromise(),
      this.custodiaService.getVestigios({ status: 'FINALIZADO', page_size: 1 }).toPromise(),
      this.custodiaService.getDnasPaginado({ page_size: 1 }).toPromise()
    ]).then(([totalVest, emAnaliseVest, liberadosVest, dnas]) => {
      this.totalVestigiosUnidade = totalVest?.count || 0;
      this.vestigiosEmAnaliseUnidade = emAnaliseVest?.count || 0;
      this.vestigiosLiberadosUnidade = liberadosVest?.count || 0;
      this.totalDnasUnidade = dnas?.count || 0;

      this.isLoading = false;
    }).catch((err) => {
      console.error('Erro ao carregar dados do demandante externo:', err);
      this.isLoading = false;
    });
  }

  // Navegações seguras com rotas existentes
  irParaMeusVestigios(): void {
    this.router.navigate(['/gabinete-virtual/custodia/vestigios']);
  }

  irParaMeusDnas(): void {
    this.router.navigate(['/gabinete-virtual/custodia/dnas']);
  }

  irParaNovoDna(): void {
    this.router.navigate(['/gabinete-virtual/custodia/dna/novo']);
  }

  getFirstName(fullName?: string): string {
    if (!fullName) return 'Autoridade';
    return fullName.split(' ')[0];
  }
}
