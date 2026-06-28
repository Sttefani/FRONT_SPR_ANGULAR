import { Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit {
  systemName: string = 'SPR-CRIMINALÍSTICA';
  systemVersion: string = '2.0';
  developerTitle: string = 'Perito Criminal';
  developer: string = 'STTEFANI PINHEIRO RIBEIRO'; // nome completo em caixa alta
  year: number = 2025;

  constructor() { }

  ngOnInit(): void {
  }

  /** Abre o modal com o aviso legal / direitos autorais (declaração do autor). */
  abrirAvisoLegal(): void {
    Swal.fire({
      title: 'Aviso Legal — Direitos Autorais e Propriedade Intelectual',
      html: `
        <div style="text-align:left; font-size:0.9rem; line-height:1.65; color:#334155;">
          <p>O sistema <strong>SPR-Criminalística</strong> é obra autoral protegida, registrada no
          <strong>INPI — Instituto Nacional da Propriedade Industrial</strong>
          (Registro de Programa de Computador — Lei n.º 9.609/1998).</p>
          <ul style="margin:0.6rem 0 0; padding-left:1.2rem;">
            <li>Os <strong>direitos autorais</strong> do autor são <strong>irrenunciáveis e inalienáveis</strong>,
            não podendo ser removidos, ocultados ou suprimidos.</li>
            <li style="margin-top:0.5rem;">A <strong>manutenção da denominação “SPR-Criminalística”</strong>
            é <strong>obrigatória</strong> em qualquer cópia, versão ou derivação, sob pena de
            <strong>multa de 300 (trezentos) salários mínimos</strong>.</li>
            <li style="margin-top:0.5rem;">A <strong>cessão, distribuição ou qualquer alteração</strong> do
            sistema fica condicionada à <strong>consulta e autorização prévia do autor</strong>.</li>
          </ul>
          <p style="margin-top:1rem; border-top:1px solid #e2e8f0; padding-top:0.8rem;">
            Autoria: <strong>STTEFANI PINHEIRO RIBEIRO</strong> — Perito Criminal.
          </p>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Entendi',
      confirmButtonColor: '#b8860b',
      width: 640,
    });
  }
}
