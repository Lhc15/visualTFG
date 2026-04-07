import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnmOverlayComponent } from './enm-overlay.component';

describe('EnmOverlayComponent', () => {
  let component: EnmOverlayComponent;
  let fixture: ComponentFixture<EnmOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnmOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EnmOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
