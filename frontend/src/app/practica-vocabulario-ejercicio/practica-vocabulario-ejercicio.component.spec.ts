import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PracticaVocabularioEjercicioComponent } from './practica-vocabulario-ejercicio.component';

describe('PracticaVocabularioEjercicioComponent', () => {
  let component: PracticaVocabularioEjercicioComponent;
  let fixture: ComponentFixture<PracticaVocabularioEjercicioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PracticaVocabularioEjercicioComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PracticaVocabularioEjercicioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
