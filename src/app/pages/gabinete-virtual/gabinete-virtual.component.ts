import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../components/header/header.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { AuthService } from '../../services/auth.service';
import { OcorrenciaService } from '../../services/ocorrencia.service';
import { interval, Subscription } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-gabinete-virtual',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    HeaderComponent,
    FooterComponent
  ],
  templateUrl: './gabinete-virtual.component.html',
  styleUrls: ['./gabinete-virtual.component.scss']
})
export class GabineteVirtualComponent implements OnInit, OnDestroy {
  laudosPendentesCount = 0;
  private pollingSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private ocorrenciaService: OcorrenciaService
  ) {}

  ngOnInit(): void {
    if (this.isGerencial()) {
      // Consulta imediata + refresca a cada 3 minutos
      this.pollingSubscription = interval(180000).pipe(
        startWith(0),
        switchMap(() => this.ocorrenciaService.getAguardandoFinalizacaoCount())
      ).subscribe({
        next: (res) => { this.laudosPendentesCount = res.count; },
        error: () => { this.laudosPendentesCount = 0; }
      });
    }
  }

  ngOnDestroy(): void {
    this.pollingSubscription?.unsubscribe();
  }

  isSuperAdmin(): boolean {
    return this.authService.isSuperAdmin();
  }

  isGerencial(): boolean {
    const user = this.authService.getCurrentUser();
    return this.authService.isSuperAdmin() || user?.perfil === 'ADMINISTRATIVO';
  }

  isCustodia(): boolean {
    return this.authService.isLoggedIn();
  }
}
