import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { ReleaseCenter } from '../../models/releaseCenter';
import { CodeSystem } from '../../models/codeSystem';

@Injectable({
    providedIn: 'root'
})
export class ReleaseServerService {

    private releases = new Subject<any>();

    constructor(private http: HttpClient) {

    }

    setReleases(releases) {
        this.releases.next(releases);
    }

    getReleases() {
        return this.releases.asObservable();
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

    getAllReleasePackages() {
        return this.http.get<string[]>('/release/releases');
    }
}
