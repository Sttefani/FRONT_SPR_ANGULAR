import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// 1. ATUALIZADO: Interface agora aceita quantidade
interface Exame {
  id: number;
  codigo: string;
  nome: string;
  quantidade?: number; // Campo opcional adicionado
}

@Component({
  selector: 'app-exame-selector-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen) {
      <div class="modal-overlay" (click)="fechar()">
        <div class="modal-content" (click)="$event.stopPropagation()">

          <!-- Header fixo -->
          <div class="modal-header">
            <h3><i class="bi bi-clipboard-pulse"></i> Selecionar Exames</h3>
            <button class="btn-close" (click)="fechar()">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <!-- Campo de busca fixo -->
          <div class="search-container">
            <i class="bi bi-search"></i>
            <input
              type="text"
              class="search-input"
              placeholder="Buscar por código ou nome..."
              [(ngModel)]="termoBusca"
              (input)="filtrarExames()"
            >
            @if (termoBusca) {
              <button class="btn-clear-search" (click)="limparBusca()">
                <i class="bi bi-x-circle-fill"></i>
              </button>
            }
          </div>

          <!-- Contador -->
          <div class="contador">
            <span class="badge-contador">
              {{ examesSelecionados.length }} de {{ examesFiltrados.length }} selecionados
            </span>
          </div>

          <!-- Lista de exames com scroll -->
          <div class="exames-lista">
            @if (examesFiltrados.length > 0) {
              @for (exame of examesFiltrados; track exame.id) {
                <div class="exame-row" [class.selected]="isSelected(exame.id)">
                  <!-- Área clicável para marcar/desmarcar -->
                  <label class="exame-label">
                    <input
                      type="checkbox"
                      [checked]="isSelected(exame.id)"
                      (change)="toggleExame(exame)"
                    >
                    <div class="exame-info">
                      <span class="exame-codigo">{{ exame.codigo }}</span>
                      <span class="exame-nome">{{ exame.nome }}</span>
                    </div>
                  </label>

                  <!-- 2. NOVO: Campo de Quantidade (só aparece se selecionado) -->
                  @if (isSelected(exame.id)) {
                    <div class="qtd-wrapper">
                      <label>Qtd:</label>
                      <input
                        type="number"
                        min="1"
                        class="qtd-input"
                        [ngModel]="getQuantidade(exame.id)"
                        (ngModelChange)="updateQuantidade(exame.id, $event)"
                        (click)="$event.stopPropagation()"
                      >
                    </div>
                  }
                </div>
              }
            } @else {
              <div class="empty-state">
                <i class="bi bi-search"></i>
                <p>Nenhum exame encontrado com "{{ termoBusca }}"</p>
              </div>
            }
          </div>

          <!-- Footer fixo -->
          <div class="modal-footer">
            <button type="button" class="btn-cancelar" (click)="fechar()">
              <i class="bi bi-x-circle"></i> Cancelar
            </button>
            <button type="button" class="btn-confirmar" (click)="confirmar()">
              <i class="bi bi-check-circle"></i> Confirmar ({{ examesSelecionados.length }})
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(9, 30, 66, 0.54);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-content {
      background: white;
      border-radius: 20px;
      max-width: 693px !important;
      width: 90% !important;
      max-height: 65vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      border: 1px solid rgba(218, 165, 32, 0.2);
      animation: slideUp 0.4s ease-out;
      overflow: hidden;
    }

    @keyframes slideUp {
      from { transform: translateY(30px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    /* ===== HEADER FIXO ===== */
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem 2rem;
      border-bottom: 2px solid #f7fafc;
      background: linear-gradient(135deg, #f7fafc, #fff);
      flex-shrink: 0;

      h3 {
        margin: 0;
        color: #1a202c;
        font-size: 1.3rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;

        i {
          color: #DAA520;
          font-size: 1.5rem;
        }
      }

      .btn-close {
        background: transparent;
        border: 2px solid transparent;
        width: 36px;
        height: 36px;
        border-radius: 8px;
        cursor: pointer;
        color: #4a5568;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover {
          background: #fee2e2;
          border-color: #dc3545;
          color: #dc3545;
          transform: rotate(90deg);
        }
      }
    }

    /* ===== BUSCA FIXA ===== */
    .search-container {
      padding: 1rem 2rem;
      background: white;
      border-bottom: 2px solid #f7fafc;
      flex-shrink: 0;
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.5rem;

      i.bi-search {
        position: absolute;
        left: 2.8rem;
        color: #DAA520;
        font-size: 1.1rem;
      }

      .search-input {
        width: 100%;
        padding: 0.8rem 1rem 0.8rem 2.5rem;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
      }

      .btn-clear-search {
        position: absolute;
        right: 2.5rem;
        background: transparent;
        border: none;
        color: #a0aec0;
        cursor: pointer;
        font-size: 1.2rem;
        transition: all 0.2s ease;

        &:hover { color: #dc3545; transform: scale(1.2); }
      }
    }

    /* ===== CONTADOR ===== */
    .contador {
      padding: 0.8rem 2rem;
      background: linear-gradient(135deg, rgba(218, 165, 32, 0.05), rgba(248, 249, 250, 0.5));
      border-bottom: 2px solid #f7fafc;
      flex-shrink: 0;

      .badge-contador {
        display: inline-block;
        padding: 0.4rem 1rem;
        background: linear-gradient(135deg, #DAA520, #B8860B);
        color: #000;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        box-shadow: 0 2px 8px rgba(218, 165, 32, 0.3);
      }
    }

    /* ===== LISTA COM SCROLL ===== */
    .exames-lista {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      align-content: start;

      &::-webkit-scrollbar { width: 10px; }
      &::-webkit-scrollbar-track { background: #f7fafc; border-radius: 10px; margin: 0.5rem 0; }
      &::-webkit-scrollbar-thumb {
        background: linear-gradient(135deg, #DAA520, #B8860B);
        border-radius: 10px;
        border: 2px solid #f7fafc;
        &:hover { background: #B8860B; }
      }
    }

    /* ===== ITEM DE EXAME (Linha) ===== */
    .exame-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.8rem 1rem;
      border: 2px solid #e2e8f0;
      border-radius: 10px;
      background: white;
      transition: all 0.3s ease;

      &:hover {
        border-color: #DAA520;
        box-shadow: 0 4px 12px rgba(218, 165, 32, 0.2);
        transform: translateY(-2px);
      }

      &.selected {
        background: linear-gradient(135deg, rgba(218, 165, 32, 0.1), rgba(248, 249, 250, 0.5));
        border-color: #DAA520;
        box-shadow: 0 0 0 1px #DAA520;
      }
    }

    /* Label clicável (checkbox + texto) */
    .exame-label {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex: 1;
      cursor: pointer;
      min-width: 0;

      input[type="checkbox"] {
        width: 22px;
        height: 22px;
        cursor: pointer;
        accent-color: #DAA520;
        flex-shrink: 0;
      }

      .exame-info {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;

        .exame-codigo {
          font-weight: 700;
          color: #DAA520;
          font-size: 0.8rem;
          font-family: 'Courier New', monospace;
        }

        .exame-nome {
          color: #1a202c;
          font-size: 0.9rem;
          font-weight: 500;
          line-height: 1.2;
        }
      }
    }

    /* ===== INPUT DE QUANTIDADE NOVO ===== */
    .qtd-wrapper {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #fff;
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      border: 1px solid #DAA520;
      animation: fadeIn 0.3s ease;

      label {
        font-size: 0.8rem;
        font-weight: bold;
        color: #555;
      }

      .qtd-input {
        width: 60px;
        padding: 0.3rem;
        border: 1px solid #ccc;
        border-radius: 4px;
        text-align: center;
        font-weight: bold;

        &:focus {
          outline: none;
          border-color: #DAA520;
          box-shadow: 0 0 0 2px rgba(218, 165, 32, 0.2);
        }
      }
    }

    /* ===== ESTADO VAZIO ===== */
    .empty-state {
      text-align: center;
      padding: 3rem;
      color: #a0aec0;
      i { font-size: 3rem; margin-bottom: 1rem; opacity: 0.5; }
      p { font-size: 0.95rem; font-weight: 500; margin: 0; }
    }

    /* ===== FOOTER FIXO ===== */
    .modal-footer {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      padding: 1.5rem 2rem;
      border-top: 2px solid #f7fafc;
      background: linear-gradient(135deg, #fff, #f7fafc);
      flex-shrink: 0;

      button {
        padding: 0.8rem 1.5rem;
        border: 2px solid;
        border-radius: 10px;
        cursor: pointer;
        font-weight: 700;
        font-size: 0.85rem;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        &:hover { transform: translateY(-2px); }
        &:active { transform: translateY(0); }
      }

      .btn-cancelar {
        background: white;
        border-color: #e2e8f0;
        color: #1a202c;
        &:hover { border-color: #1a202c; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
      }

      .btn-confirmar {
        background: linear-gradient(135deg, #28a745, #1e7e34);
        border-color: #28a745;
        color: white;
        box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
        &:hover { box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4); }
      }
    }

    @media (max-width: 768px) {
      .modal-content { max-width: 100%; width: 100%; max-height: 100vh; border-radius: 0; }
      .modal-footer { flex-direction: column-reverse; button { width: 100%; justify-content: center; } }
    }
  `]
})
export class ExameSelectorModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() examesDisponiveis: Exame[] = [];
  @Input() examesPreSelecionados: Exame[] = [];
  @Output() onConfirm = new EventEmitter<Exame[]>();
  @Output() onClose = new EventEmitter<void>();

  examesSelecionados: Exame[] = [];
  examesFiltrados: Exame[] = [];
  termoBusca: string = '';

  ngOnChanges() {
    if (this.isOpen) {
      // Clona para não afetar referência original e garante qtd se vier vazia
      this.examesSelecionados = this.examesPreSelecionados.map(e => ({
        ...e,
        quantidade: e.quantidade || 1
      }));
      this.examesFiltrados = [...this.examesDisponiveis];
      this.termoBusca = '';
    }
  }

  filtrarExames() {
    const termo = this.termoBusca.toLowerCase().trim();
    if (!termo) {
      this.examesFiltrados = [...this.examesDisponiveis];
      return;
    }
    this.examesFiltrados = this.examesDisponiveis.filter(exame =>
      exame.codigo.toLowerCase().includes(termo) ||
      exame.nome.toLowerCase().includes(termo)
    );
  }

  limparBusca() {
    this.termoBusca = '';
    this.filtrarExames();
  }

  isSelected(id: number): boolean {
    return this.examesSelecionados.some(e => e.id === id);
  }

  // 3. LÓGICA ATUALIZADA: Adiciona com quantidade padrão 1
  toggleExame(exame: Exame) {
    const index = this.examesSelecionados.findIndex(e => e.id === exame.id);
    if (index > -1) {
      this.examesSelecionados.splice(index, 1);
    } else {
      // Adiciona o exame com quantidade 1
      this.examesSelecionados.push({ ...exame, quantidade: 1 });
    }
  }

  // 4. LÓGICA NOVA: Atualiza a quantidade quando o usuário digita
  getQuantidade(id: number): number {
    const exame = this.examesSelecionados.find(e => e.id === id);
    return exame ? (exame.quantidade || 1) : 1;
  }

  updateQuantidade(id: number, novaQtd: any) {
    const exame = this.examesSelecionados.find(e => e.id === id);
    if (exame) {
      let qtd = parseInt(novaQtd);
      if (!qtd || qtd < 1) qtd = 1; // Validação simples
      exame.quantidade = qtd;
    }
  }

  confirmar() {
    // Emite a lista de objetos COM a quantidade
    this.onConfirm.emit(this.examesSelecionados);
    this.fechar();
  }

  fechar() {
    this.onClose.emit();
  }
}
