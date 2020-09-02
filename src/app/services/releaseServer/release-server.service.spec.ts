import { TestBed } from '@angular/core/testing';

import { HttpClientTestingModule } from '@angular/common/http/testing';

import { ReleaseServerService } from './release-server.service';

describe('ReleaseServerService', () => {
  let service: ReleaseServerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
        imports: [HttpClientTestingModule]
      });
    service = TestBed.inject(ReleaseServerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
