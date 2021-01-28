import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ReleaseCenter } from '../../models/releaseCenter';
import { CodeSystem } from '../../models/codeSystem';

@Injectable({
    providedIn: 'root'
})
export class ReleaseServerService {

    constructor(private http: HttpClient) {

    }

    getCodeSystems(): Observable<CodeSystem[]> {
        return this.http.get<ReleaseCenter[]>('/release/codesystems');
    }

    getCenters(): Observable<ReleaseCenter[]> {
        return this.http.get<ReleaseCenter[]>('/release/centers');
    }

    postCenter(center): Observable<ReleaseCenter> {
        return this.http.post<ReleaseCenter>('/release/centers', center);
    }

    putCenter(id, center): Observable<ReleaseCenter> {
        return this.http.put<ReleaseCenter>('/release/centers/' + id, center);
    }

    getCenter(id): Observable<ReleaseCenter> {
        return this.http.get<ReleaseCenter>('/release/centers/' + id);
    }
}
