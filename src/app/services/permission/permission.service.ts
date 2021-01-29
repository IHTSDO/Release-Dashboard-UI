import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {

  constructor(private http: HttpClient) { }

  public roles: Object;

  getRoles(): Promise<any> {
      const promise = this.http.get('/release/permissions/roles').toPromise().then(response => {
        return Promise.resolve(response);
      })
      .catch(() => {
        return Promise.resolve(null);
      });
      return promise.then(response => {
        this.roles = response;
      });
  }
}
