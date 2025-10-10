import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { OrdemServicoService } from '../../services/ordem-servico.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-banner-os-pendentes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './banner-os-pendentes.component.html',
  styleUrls: ['./banner-os-pendentes.component.scss']
})
export class BannerOsPendentesComponent implements OnInit {
  osPendentes = 0;
  mostrarBanner = false;

  constructor(
    private ordemServicoService: OrdemServicoService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
  console.log('🔍 Banner iniciado!');

  const user = this.authService.getCurrentUser();
  console.log('👤 Usuário:', user);
  console.log('🎭 Perfil:', user?.perfil);

  if (user && user.perfil !== 'ADMINISTRATIVO') {
    console.log('✅ É perito! Verificando OS pendentes...');
    this.verificarOsPendentes();

    // Atualiza a cada 5 minutos
    setInterval(() => {
      this.verificarOsPendentes();
    }, 5 * 60 * 1000);
  } else {
    console.log('❌ É administrativo ou sem usuário. Banner não será exibido.');
  }
}

  verificarOsPendentes(): void {
  console.log('🔎 Buscando OS pendentes...');

  this.ordemServicoService.getOsPendentesCiencia().subscribe({
    next: (response) => {
      console.log('📊 Resposta do backend:', response);
      this.osPendentes = response.count;
      this.mostrarBanner = this.osPendentes > 0;
      console.log('📢 Mostrar banner?', this.mostrarBanner);
      console.log('📝 Quantidade:', this.osPendentes);
    },
    error: (err) => {
      console.error('❌ Erro ao buscar OS pendentes:', err);
    }
  });
}

  verOrdens(): void {
    this.router.navigate(['/gabinete-virtual/operacional/ordens-servico'], {
      queryParams: { filtro_status: 'AGUARDANDO_CIENCIA' }
    });
  }
}
