import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss']
})
export class PaginationComponent {
  @Input() totalItens = 0;
  @Input() paginaAtual = 1;
  @Input() itensPorPagina = 25;
  @Input() quantidadeOptions = [10, 25, 50, 100];

  @Output() mudouPagina = new EventEmitter<number>();
  @Output() mudouQuantidade = new EventEmitter<number>();

  paginaInput = 1;

  ngOnChanges() {
    this.paginaInput = this.paginaAtual;
  }

  get totalPaginas(): number {
    return Math.ceil(this.totalItens / this.itensPorPagina);
  }

  get indicePrimeiro(): number {
    return (this.paginaAtual - 1) * this.itensPorPagina + 1;
  }

  get indiceUltimo(): number {
    return Math.min(this.paginaAtual * this.itensPorPagina, this.totalItens);
  }

  irParaPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas && pagina !== this.paginaAtual) {
      this.mudouPagina.emit(pagina);
    }
  }

  irParaPaginaDigitada(): void {
    const pagina = parseInt(this.paginaInput.toString(), 10);
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.irParaPagina(pagina);
    } else {
      this.paginaInput = this.paginaAtual;
    }
  }

  getPaginas(): number[] {
    const paginas: number[] = [];
    const inicio = Math.max(1, this.paginaAtual - 2);
    const fim = Math.min(this.totalPaginas, this.paginaAtual + 2);
    for (let i = inicio; i <= fim; i++) {
      paginas.push(i);
    }
    return paginas;
  }

  mudarQuantidade(): void {
    this.mudouQuantidade.emit(this.itensPorPagina);
  }
}
