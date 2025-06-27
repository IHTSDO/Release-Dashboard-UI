import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {

  constructor(private http: HttpClient) { }

  public roles: Object;

  public getRoles(): Promise<any> {
    const promise = firstValueFrom(this.http.get('/release/permissions/roles')).then(response => {
      return Promise.resolve(response);
    }).catch(error => {
      console.error('Error fetching roles:', error);
      return Promise.resolve(null);
    });

    return promise.then(response => {
      this.roles = response;
      return response;
    });
  }
}
