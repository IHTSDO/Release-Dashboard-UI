import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ReleaseCenter } from '../../models/releaseCenter';
import { CodeSystem } from '../../models/codeSystem';

@Injectable({
    providedIn: 'root'
})
export class ReleaseCenterService {

    constructor() {
    }

    private activeReleaseCenter = new Subject<any>();

    private releaseCenters: ReleaseCenter[];

    private codeSystems: CodeSystem[];

    private releasePackages: object;

    // Setters & Getters: Active Release Center
    setActiveReleaseCenter(releaseCenter) {
        this.activeReleaseCenter.next(releaseCenter);
    }

    getActiveReleaseCenter(): Observable<ReleaseCenter> {
        return this.activeReleaseCenter.asObservable();
    }

    findReleaseCenterByKey(releaseCenterKey) {
        if (this.releaseCenters) {
            return this.releaseCenters.find(releaseCenter => releaseCenter.id === releaseCenterKey);
        }

        return null;
    }

    cacheReleaseCenters(releaseCenters) {
        this.releaseCenters = releaseCenters;
    }

    catchReleasePackages(releasePackages) {
        this.releasePackages = releasePackages;
    }

    clearCachedReleaseCenters() {
        this.releaseCenters = [];
    }

    getCachedReleasePackages() {
        return this.releasePackages;
    }

    getCachedReleaseCenters() {
        return this.releaseCenters;
    }

    getCachedCodeSystems() {
        return this.codeSystems;
    }

    cacheCodeSystems(codeSystems) {
        this.codeSystems = codeSystems;
    }
}
