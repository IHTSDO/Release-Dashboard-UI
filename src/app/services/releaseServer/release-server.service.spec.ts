import { TestBed } from '@angular/core/testing';

import { ReleaseServerService } from './release-server.service';

describe('ReleaseServerService', () => {
  let service: ReleaseServerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReleaseServerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
