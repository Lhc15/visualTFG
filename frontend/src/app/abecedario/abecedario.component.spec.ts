import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AbecedarioComponent } from './abecedario.component';

describe('AbecedarioComponent', () => {
  let component: AbecedarioComponent;
  let fixture: ComponentFixture<AbecedarioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AbecedarioComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AbecedarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
