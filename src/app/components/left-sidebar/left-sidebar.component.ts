import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ReleaseCenterService } from '../../services/releaseCenter/release-center.service';
import { ModalService } from '../../services/modal/modal.service';
import { ReleaseServerService } from '../../services/releaseServer/release-server.service';
import { trigger, state, style, transition, animate, keyframes } from '@angular/animations';
import { ReleaseCenter } from '../../models/releaseCenter';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-left-sidebar',
    templateUrl: './left-sidebar.component.html',
    styleUrls: ['./left-sidebar.component.scss'],
    animations: [
        trigger('slide', [
            state('start', style({ opacity: 0, transform: 'translateY(200%)'})),
            state('end', style({ opacity: 0, transform: 'translateY(-200%)'})),
            transition('start <=> end', [
                animate('2000ms ease-in', keyframes([
                    style({opacity: 0, transform: 'translateY(200%)', offset: 0}),
                    style({opacity: 1, transform: 'translateY(0)', offset: 0.1}),
                    style({opacity: 1, transform: 'translateY(0)', offset: .8}),
                    style({opacity: 0, transform: 'translateY(-200%)', offset: 1.0})
                ]))
            ])
        ])
    ]
})
export class LeftSidebarComponent implements OnInit {

    private activeReleaseCenterSubscription: Subscription;

    releaseCenters: ReleaseCenter[];
    activeReleaseCenter: ReleaseCenter;

    // animations
    saved = 'start';
    saveResponse: string;
    savingCenter = false;

    constructor(private route: ActivatedRoute,
                private releaseCenterService: ReleaseCenterService,
                private modalService: ModalService,
                private releaseServer: ReleaseServerService) {
        this.activeReleaseCenterSubscription = this.releaseCenterService.getActiveReleaseCenter().subscribe(data => {
            this.activeReleaseCenter = data;
        });
    }

    ngOnInit(): void {
        let releaseCenterKey;
        this.route.paramMap.subscribe(paramMap => {
            releaseCenterKey = paramMap['params']['releaseCenterKey'];
        });

        this.loadReleaseCenters(this.releaseCenterService, this.releaseServer).then(data => {
            this.releaseCenters = <ReleaseCenter[]> data;
            this.releaseCenterService.cacheReleaseCenters(this.releaseCenters);
            if (releaseCenterKey) {
                const activeReleaseCenter = this.releaseCenters.find(releaseCenter => releaseCenter.id === releaseCenterKey);
                if (activeReleaseCenter) {
                    this.releaseCenterService.setActiveReleaseCenter(activeReleaseCenter);
                } else {
                    this.releaseCenterService.setActiveReleaseCenter(this.releaseCenters[0]);
                }
            } else {
                this.releaseCenterService.setActiveReleaseCenter(this.releaseCenters[0]);
            }
        });
    }

    // load release centers from cache, other from server
    loadReleaseCenters(releaseCenterService, releaseServer) {
        const promise = new Promise(function(resolve, reject) {
            const releaseCenters = releaseCenterService.getCachedReleaseCenters();
            if (releaseCenters && releaseCenters.length !== 0) {
                resolve(releaseCenters);
                return;
            }
            releaseServer.getCenters().subscribe(data => resolve(data));
        });

        return promise;
    }

    openModal(name) {
        this.modalService.open(name);
    }

    closeModal(name) {
        this.modalService.close(name);
    }

    switchActiveReleaseCenter(center) {
        this.releaseCenterService.setActiveReleaseCenter(center);
    }

    addReleaseCenter(name, shortName) {
        const missingFields = this.missingFieldsCheck(name, shortName);
        if (missingFields) {
            this.saveResponse = 'Missing Fields';
            this.saved = (this.saved === 'start' ? 'end' : 'start');
            return;
        }
        this.savingCenter = true;
        this.releaseServer.postCenter({name: name, shortName: shortName}).subscribe(
            response => {
                this.savingCenter = false;
                this.releaseCenters.push(response);
                this.releaseCenterService.cacheReleaseCenters(this.releaseCenters);
                this.modalService.close('add-modal');
            },
            errorResponse => {
                this.savingCenter = false;
                this.saveResponse = errorResponse.error.errorMessage;
                this.saved = (this.saved === 'start' ? 'end' : 'start');
            }
        );
    }

    saveReleaseCenter(name, shortName) {
        const missingFields = this.missingFieldsCheck(name, shortName);
        if (missingFields) {
            this.saveResponse = 'Missing Fields';
            this.saved = (this.saved === 'start' ? 'end' : 'start');
            return;
        }

        this.savingCenter = true;
        this.releaseServer.putCenter(this.activeReleaseCenter.id, {name: name, shortName: shortName}).subscribe(
            response => {
                this.savingCenter = false;
                const currentIndex = this.releaseCenters.indexOf(this.activeReleaseCenter);
                this.releaseCenters[currentIndex] = response;
                this.activeReleaseCenter = response;
                this.releaseCenterService.cacheReleaseCenters(this.releaseCenters);
                this.modalService.close('edit-modal');
            },
            errorResponse => {
                this.savingCenter = false;
                this.saveResponse = errorResponse.error.errorMessage;
                this.saved = (this.saved === 'start' ? 'end' : 'start');
            }
        );
    }

    missingFieldsCheck(name, shortName): boolean {
        return !name || !shortName;
    }
}
