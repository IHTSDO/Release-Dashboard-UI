import { TestBed } from '@angular/core/testing';

import { TerminologyServerService } from './terminology-server.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserDynamicTestingModule } from '@angular/platform-browser-dynamic/testing';

describe('TerminologyServerService', () => {
  let service: TerminologyServerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
        imports: [
            HttpClientTestingModule,
            BrowserDynamicTestingModule,
            RouterTestingModule
        ],
        providers: [TerminologyServerService]
    });
    service = TestBed.inject(TerminologyServerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
