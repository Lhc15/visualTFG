import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConversamosComponent } from './conversamos.component';

describe('ConversamosComponent', () => {
  let component: ConversamosComponent;
  let fixture: ComponentFixture<ConversamosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConversamosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConversamosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});