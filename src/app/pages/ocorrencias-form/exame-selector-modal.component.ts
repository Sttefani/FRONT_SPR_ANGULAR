import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Exame {
  id: number;
  codigo: string;
  nome: string;
}

@Component({
  selector: 'app-exame-selector-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen) {
      <div class="modal-overlay" (click)="fechar()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <h3>Selecionar Exames</h3>

          <div class="exames-lista">
            @for (exame of examesDisponiveis; track exame.id) {
              <label class="exame-item">
                <input
                  type="checkbox"
                  [checked]="isSelected(exame.id)"
                  (change)="toggleExame(exame)"
                >
                <span><strong>{{ exame.codigo }}</strong> - {{ exame.nome }}</span>
              </label>
            }
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-cancelar" (click)="fechar()">Cancelar</button>
            <button type="button" class="btn-confirmar" (click)="confirmar()">
              Confirmar ({{ examesSelecionados.length }})
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
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    }

    h3 {
      margin: 0 0 1rem 0;
      color: #1a202c;
    }

    .exames-lista {
      flex: 1;
      overflow-y: auto;
      margin: 1rem 0;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }

    .exame-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #e2e8f0;
      cursor: pointer;
      transition: background 0.2s;
    }

    .exame-item:hover {
      background: #f7fafc;
    }

    .exame-item:last-child {
      border-bottom: none;
    }

    input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .modal-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      margin-top: 1rem;
    }

    button {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.9rem;
      transition: all 0.2s;
    }

    .btn-cancelar {
      background: #e2e8f0;
      color: #1a202c;
    }

    .btn-cancelar:hover {
      background: #cbd5e0;
    }

    .btn-confirmar {
      background: #DAA520;
      color: #000;
    }

    .btn-confirmar:hover {
      background: #B8860B;
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

  ngOnChanges() {
    if (this.isOpen) {
      this.examesSelecionados = [...this.examesPreSelecionados];
    }
  }

  isSelected(id: number): boolean {
    return this.examesSelecionados.some(e => e.id === id);
  }

  toggleExame(exame: Exame) {
    const index = this.examesSelecionados.findIndex(e => e.id === exame.id);
    if (index > -1) {
      this.examesSelecionados.splice(index, 1);
    } else {
      this.examesSelecionados.push(exame);
    }
  }

  confirmar() {
    this.onConfirm.emit(this.examesSelecionados);
    this.fechar();
  }

  fechar() {
    this.onClose.emit();
  }
}
