import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  // A 'lista de ingredientes' da nossa aplicação vive aqui
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),

    // Esta é a única linha necessária para configurar o HttpClient E o Interceptor
    provideHttpClient(withInterceptors([authInterceptor]))
  ]
};
