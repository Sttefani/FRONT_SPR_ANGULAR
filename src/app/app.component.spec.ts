// src/app/app.component.spec.ts

import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
// 1. IMPORTE O MÓDULO DE TESTE DO HTTPCLIENT
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('AppComponent', () => {

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AppComponent,
        // 2. ADICIONE O MÓDULO AOS IMPORTS DO NOSSO AMBIENTE DE TESTE
        HttpClientTestingModule
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

});
