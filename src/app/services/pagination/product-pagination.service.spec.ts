import { TestBed } from '@angular/core/testing';

import { ProductPaginationService } from './product-pagination.service';

describe('ProductPaginationService', () => {
  let service: ProductPaginationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProductPaginationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
