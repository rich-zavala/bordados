import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MatrixGrid } from './matrix-grid';

describe('MatrixGrid', () => {
  let component: MatrixGrid;
  let fixture: ComponentFixture<MatrixGrid>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatrixGrid]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MatrixGrid);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
