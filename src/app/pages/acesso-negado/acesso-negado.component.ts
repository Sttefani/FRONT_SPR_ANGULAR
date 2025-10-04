import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-acesso-negado',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './acesso-negado.component.html',
  styleUrls: ['./acesso-negado.component.scss']
})
export class AcessoNegadoComponent {
  constructor(private router: Router) {}

  voltar(): void {
    this.router.navigate(['/dashboard']);
  }
}
