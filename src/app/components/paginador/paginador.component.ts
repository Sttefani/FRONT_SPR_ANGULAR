import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-paginador',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './paginador.component.html',
  styles: [`
    :host {
      --primary-color: #DAA520;
      --primary-color-dark: #B8860B;
      --text-color-dark: #1a202c;
      --text-color-light: #4a5568;
      --background-color: #f7fafc;
      --card-background-color: #ffffff;
      --border-color: #cbd5e0;
      --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.08);
      width: 100%;
    }

    .paginacao-container {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-wrap: wrap;
      gap: 1.5rem;
      padding: 1rem 0;
      margin-top: 1.5rem;
      border-top: 3px solid var(--border-color);
      font-size: 0.875rem;
      width: 100%;

      .pagination {
        margin-bottom: 0;
        flex-shrink: 0;
        display: flex;
        list-style: none;
        padding-left: 0;

        li {
          margin: 0 2px;

          a {
            background: var(--card-background-color);
            border: 2px solid var(--border-color);
            color: var(--text-color-light);
            padding: 0.4rem 0.8rem;
            border-radius: 8px;
            font-weight: 700;
            transition: all 0.2s ease;
            cursor: pointer;
            user-select: none;
            display: block;
            text-decoration: none;

            &:hover {
              background-color: var(--background-color);
              border-color: var(--primary-color);
              color: var(--primary-color-dark);
              transform: translateY(-2px);
              box-shadow: var(--shadow-sm);
            }
          }

          &.active a {
            background: var(--primary-color);
            border-color: var(--primary-color-dark);
            color: #000;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(218, 165, 32, 0.4);
          }

          &.disabled a {
            opacity: 0.5;
            background-color: transparent;
            border-color: var(--border-color);
            cursor: not-allowed;
            pointer-events: none;
          }
        }
      }

      .ir-para-pagina {
        margin-left: auto;
        font-size: 0.85rem;

        .form-control-sm {
          border: 2px solid var(--border-color);
          border-radius: 8px;
          text-align: center;
          font-weight: 700;
          color: var(--text-color-dark);
          height: auto;
          width: 70px;
          padding: 0.4rem 0.5rem;
          transition: all 0.2s ease;

          &:focus {
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(218, 165, 32, 0.15);
            outline: none;
          }
        }

        .btn-sm.btn-outline-primary {
          border: 2px solid var(--primary-color);
          color: var(--primary-color);
          background: transparent;
          padding: 0.4rem 0.6rem;
          border-radius: 8px;
          transition: all 0.2s ease;
          font-weight: 700;
          text-transform: uppercase;
          cursor: pointer;

          &:hover {
            background: var(--primary-color);
            color: #000;
            box-shadow: 0 2px 8px rgba(218, 165, 32, 0.3);
          }
        }

        .d-flex {
          display: flex !important;
          align-items: center !important;
          gap: 0.5rem !important;
          justify-content: center !important;
        }

        .small.text-muted {
          font-style: normal;
          font-weight: 600;
          color: var(--text-color-light);
        }
      }
    }

    @media (max-width: 768px) {
      .paginacao-container {
        flex-direction: column;
        gap: 1rem;

        .ir-para-pagina {
          margin-left: 0;
          width: 100%;
        }
      }
    }
  `]
})
export class PaginadorComponent implements OnChanges {
  @Input() currentPage: number = 1;
  @Input() totalPages: number = 1;
  @Input() totalItems: number = 0;
  @Input() itemName: string = 'itens';

  @Output() pageChange = new EventEmitter<number>();

  paginaInput: number = 1;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentPage']) {
      this.paginaInput = this.currentPage;
    }
  }

  getPaginas(): number[] {
    const paginas: number[] = [];
    const inicio = Math.max(1, this.currentPage - 2);
    const fim = Math.min(this.totalPages, this.currentPage + 2);
    for (let i = inicio; i <= fim; i++) {
      paginas.push(i);
    }
    return paginas;
  }

  irParaPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPages && pagina !== this.currentPage) {
      this.pageChange.emit(pagina);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  irParaPaginaDigitada(): void {
    const pagina = parseInt(this.paginaInput.toString(), 10);
    if (pagina >= 1 && pagina <= this.totalPages) {
      this.irParaPagina(pagina);
    } else {
      Swal.fire({
        title: 'Página inválida!',
        text: `Digite um número entre 1 e ${this.totalPages}`,
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      this.paginaInput = this.currentPage;
    }
  }
}
