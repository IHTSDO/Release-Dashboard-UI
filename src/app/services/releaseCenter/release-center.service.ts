import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ReleaseCenter } from '../../models/releaseCenter';

@Injectable({
    providedIn: 'root'
})
export class ReleaseCenterService {

    constructor() {
    }

    private activeReleaseCenter = new Subject<any>();

    private releaseCenters: ReleaseCenter[];

    // Setters & Getters: Active Release Center
    setActiveReleaseCenter(releaseCenter) {
        this.activeReleaseCenter.next(releaseCenter);
    }

    clearActiveReleaseCenter() {
        this.activeReleaseCenter.next();
    }

    getActiveReleaseCenter(): Observable<ReleaseCenter> {
        return this.activeReleaseCenter.asObservable();
    }

    cacheReleaseCenters(releaseCenters) {
        this.releaseCenters = releaseCenters;
    }

    clearCachedReleaseCenters() {
        this.releaseCenters = [];
    }

    getCachedReleaseCenters() {
        return this.releaseCenters;
    }
}
