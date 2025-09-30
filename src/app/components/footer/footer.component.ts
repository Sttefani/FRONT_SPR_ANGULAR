import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit {
  currentYear: number;
  systemVersion: string = '1.0.1';
  developer: string = 'Perito Criminal Sttefani Ribeiro';

  constructor() {
    this.currentYear = new Date().getFullYear();
  }

  ngOnInit(): void {
  }
}
