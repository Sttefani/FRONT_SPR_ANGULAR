import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CidadesFormComponent } from './cidades-form.component';

describe('CidadesFormComponent', () => {
  let component: CidadesFormComponent;
  let fixture: ComponentFixture<CidadesFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CidadesFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CidadesFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
