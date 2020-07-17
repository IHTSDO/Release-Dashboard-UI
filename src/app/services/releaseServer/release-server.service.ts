import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subscription } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ReleaseServerService {

    constructor(private http: HttpClient) {

    }

    getCenters(): Observable<object> {
        return this.http.get<object>('/release/centers');
    }

    getCenter(id): Observable<object> {
        return this.http.get<object>('/release/centers/' + id);
    }

    getProducts(id): Observable<object> {
        return this.http.get<object>('/release/centers/' + id + '/products');
    }
}
