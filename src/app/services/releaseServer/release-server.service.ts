import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ReleaseCenter } from '../releaseCenter/release-center.service';

@Injectable({
    providedIn: 'root'
})
export class ReleaseServerService {

    constructor(private http: HttpClient) {

    }

    getCenters(): Observable<object> {
        return this.http.get<object>('/release/centers');
    }

    postCenter(center): Observable<ReleaseCenter> {
        return this.http.post<ReleaseCenter>('/release/centers', center);
    }

    putCenter(id, center): Observable<ReleaseCenter> {
        return this.http.put<ReleaseCenter>('/release/centers/' + id, center);
    }

    getCenter(id): Observable<object> {
        return this.http.get<object>('/release/centers/' + id);
    }

    getProducts(id): Observable<object> {
        return this.http.get<object>('/release/centers/' + id + '/products');
    }
}
