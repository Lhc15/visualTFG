import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LearningObjectComponent } from './learning-object.component';

describe('LearningObjectComponent', () => {
  let component: LearningObjectComponent;
  let fixture: ComponentFixture<LearningObjectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LearningObjectComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LearningObjectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
