import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// A única responsabilidade do main.ts é iniciar a aplicação
// usando o AppComponent como base e o appConfig como configuração.
bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
