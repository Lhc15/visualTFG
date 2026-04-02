import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PracticaAbecedarioComponent } from './practica-abecedario.component';

describe('PracticaAbecedarioComponent', () => {
  let component: PracticaAbecedarioComponent;
  let fixture: ComponentFixture<PracticaAbecedarioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PracticaAbecedarioComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PracticaAbecedarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
