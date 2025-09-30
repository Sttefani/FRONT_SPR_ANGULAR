import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  currentDateTime: string = '';
  currentUser: any = null;
  isLoggedIn: boolean = false;
  private userSubscription: Subscription = new Subscription();

  constructor(private authService: AuthService) { }

  ngOnInit(): void {
    this.updateDateTime();
    // Atualiza a data/hora a cada segundo
    setInterval(() => {
      this.updateDateTime();
    }, 1000);

    // Assina as mudanças do usuário atual
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isLoggedIn = !!user;
    });
  }

  ngOnDestroy(): void {
    this.userSubscription.unsubscribe();
  }

  updateDateTime(): void {
    const now = new Date();
    this.currentDateTime = now.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
