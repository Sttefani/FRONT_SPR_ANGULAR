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
  setInterval(() => {
    this.updateDateTime();
  }, 1000);

  // DEBUG - Verificar estado inicial
  console.log('=== HEADER INICIOU ===');
  console.log('Token existe:', !!localStorage.getItem('access_token'));
  console.log('Usuário logado (service):', this.authService.isLoggedIn());

  this.userSubscription = this.authService.currentUser$.subscribe(user => {
    console.log('Observable currentUser$ emitiu:', user);
    this.currentUser = user;
    this.isLoggedIn = !!user;
    console.log('isLoggedIn agora é:', this.isLoggedIn);
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
