import { TestBed } from '@angular/core/testing';

import { HttpClientTestingModule } from '@angular/common/http/testing';

import { RVFServerService } from './rvf-server.service';

describe('RVFServerService', () => {
  let service: RVFServerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
        imports: [HttpClientTestingModule]
      });
    service = TestBed.inject(RVFServerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
