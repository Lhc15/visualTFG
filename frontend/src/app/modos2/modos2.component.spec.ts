import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Modos2Component } from './modos2.component';

describe('Modos2Component', () => {
  let component: Modos2Component;
  let fixture: ComponentFixture<Modos2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Modos2Component],
    }).compileComponents();

    fixture = TestBed.createComponent(Modos2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});