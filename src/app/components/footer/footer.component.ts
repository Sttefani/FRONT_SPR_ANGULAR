import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [], // Mantemos vazio se não usar diretivas como ngIf ou ngFor
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit {
  systemName: string = 'SPR-CRIMINALÍSTICA'; // Coloque o nome aqui
  systemVersion: string = '1.0';
  developer: string = 'Perito Criminal Sttefani Ribeiro - Todos os Direitos Reservados';
  year: number = 2025; // Ano fixo do início ou new Date().getFullYear()

  constructor() { }

  ngOnInit(): void {
  }
}
