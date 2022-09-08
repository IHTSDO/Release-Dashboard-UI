import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class RVFServerService {

    constructor(private http: HttpClient) {
    }

    getRVFReport(runId: string, storageLocation: string): Observable<any> {
        return this.http.get('/rvf-api/result/' + runId + '?storageLocation=' + storageLocation);
    }
}
