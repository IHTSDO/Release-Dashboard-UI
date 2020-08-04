import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ReleaseServerService {

    constructor(private http: HttpClient) {

    }

    getCenters(): Observable<object> {
        return this.http.get<object>('/release/centers');
    }

    postCenter(center) {
        return this.http.post('/release/centers', center);
    }

    putCenter(id, center) {
        return this.http.put('/release/centers/' + id, center);
    }

    getCenter(id): Observable<object> {
        return this.http.get<object>('/release/centers/' + id);
    }

    getProducts(id): Observable<object> {
        return this.http.get<object>('/release/centers/' + id + '/products');
    }
}
