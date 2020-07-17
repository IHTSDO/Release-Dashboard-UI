import { TestBed } from '@angular/core/testing';

import { ReleaseCenterService } from './release-center.service';

describe('ReleaseCenterService', () => {
  let service: ReleaseCenterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReleaseCenterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
