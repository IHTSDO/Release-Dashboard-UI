import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class EnvService {

  // Environment: local, dev, uat, prod
  public env = '';

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) { 
            this.env = window.location.host.split(/[.]/)[0].split(/[-]/)[0];
        }
  }

}
