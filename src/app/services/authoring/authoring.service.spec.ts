import { TestBed } from '@angular/core/testing';

import { AuthoringService } from './authoring.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('AuthoringService', () => {
  let service: AuthoringService;

  beforeEach(() => {
    TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [AuthoringService]
    });
    service = TestBed.inject(AuthoringService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
