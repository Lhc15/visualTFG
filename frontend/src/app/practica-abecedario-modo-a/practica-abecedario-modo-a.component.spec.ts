import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PracticaAbecedarioModoAComponent } from './practica-abecedario-modo-a.component';

describe('PracticaAbecedarioModoAComponent', () => {
  let component: PracticaAbecedarioModoAComponent;
  let fixture: ComponentFixture<PracticaAbecedarioModoAComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PracticaAbecedarioModoAComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PracticaAbecedarioModoAComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
