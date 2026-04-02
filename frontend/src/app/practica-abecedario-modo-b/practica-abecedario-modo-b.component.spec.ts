import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PracticaAbecedarioModoBComponent } from './practica-abecedario-modo-b.component';

describe('PracticaAbecedarioModoBComponent', () => {
  let component: PracticaAbecedarioModoBComponent;
  let fixture: ComponentFixture<PracticaAbecedarioModoBComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PracticaAbecedarioModoBComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PracticaAbecedarioModoBComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
