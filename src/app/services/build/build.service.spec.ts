import { TestBed } from '@angular/core/testing';

import { BuildService } from './build.service';

import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('BuildService', () => {
  let service: BuildService;

  beforeEach(() => {
    TestBed.configureTestingModule({imports: [HttpClientTestingModule]});
    service = TestBed.inject(BuildService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
