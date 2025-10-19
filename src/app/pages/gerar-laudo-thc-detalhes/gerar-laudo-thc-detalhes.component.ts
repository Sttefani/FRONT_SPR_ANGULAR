import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LaudoService } from '../../services/laudo.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-gerar-laudo-thc-detalhes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gerar-laudo-thc-detalhes.component.html',
  styleUrls: ['./gerar-laudo-thc-detalhes.component.scss']
})
export class GerarLaudoThcDetalhesComponent implements OnInit {
  laudoId!: number;
  laudo: any = null;
  carregando = false;
  erro: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private laudoService: LaudoService
  ) {}

  ngOnInit(): void {
    // Pega o ID da URL
    this.laudoId = Number(this.route.snapshot.paramMap.get('id'));

    if (this.laudoId) {
      this.carregarLaudo();
    } else {
      this.erro = 'ID do laudo não encontrado';
    }
  }

  carregarLaudo(): void {
    this.carregando = true;
    this.erro = null;

    this.laudoService.obterLaudo(this.laudoId).subscribe({
      next: (response) => {
        if (response.sucesso) {
          this.laudo = response.laudo;
        } else {
          this.erro = 'Laudo não encontrado';
        }
        this.carregando = false;
      },
      error: (err) => {
        console.error('Erro ao carregar laudo:', err);
        this.erro = 'Erro ao carregar laudo';
        this.carregando = false;
      }
    });
  }

  voltar(): void {
  this.router.navigate(['/gabinete-virtual/gerar-laudo-thc']); // ✅ CORRETO
}

  baixarPDF(): void {
    this.carregando = true;

    this.laudoService.baixarLaudoPDF(this.laudoId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `laudo_${this.laudoId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        this.carregando = false;
      },
      error: (err) => {
        console.error('Erro ao baixar PDF:', err);
        this.erro = 'Erro ao baixar PDF';
        this.carregando = false;
      }
    });
  }

  copiarLaudo(): void {
  if (this.laudo?.laudo_texto) {
    navigator.clipboard.writeText(this.laudo.laudo_texto).then(() => {
      Swal.fire({
        icon: 'success',
        title: 'Copiado!',
        text: 'Laudo copiado para área de transferência',
        timer: 2000,
        showConfirmButton: false
      });
    }).catch(() => {
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'Não foi possível copiar o laudo',
        confirmButtonColor: '#DAA520'
      });
    });
  }
  }
}
