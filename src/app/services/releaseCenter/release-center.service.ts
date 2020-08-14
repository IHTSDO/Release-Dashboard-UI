import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ReleaseCenter } from '../../models/releaseCenter';

@Injectable({
    providedIn: 'root'
})
export class ReleaseCenterService {

    constructor() {
    }

    private releaseCenters = new Subject<any>();
    private activeReleaseCenter = new Subject<any>();

    // Setters & Getters: Release Centers
    setReleaseCenters(releaseCenters) {
        this.releaseCenters.next(releaseCenters);
    }

    clearReleaseCenters() {
        this.releaseCenters.next();
    }

    getReleaseCenters(): Observable<ReleaseCenter[]> {
        return this.releaseCenters.asObservable();
    }

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
}
