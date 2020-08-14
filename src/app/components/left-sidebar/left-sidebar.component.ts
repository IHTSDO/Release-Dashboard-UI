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

    releaseCenters: ReleaseCenter[];
    releaseCentersSubscription: Subscription;
    activeReleaseCenter: ReleaseCenter;
    activeReleaseCenterSubscription: Subscription;

    // animations
    saved = 'start';
    saveResponse: string;
    savingCenter = false;

    constructor(private route: ActivatedRoute,
                private releaseCenterService: ReleaseCenterService,
                private modalService: ModalService,
                private releaseServer: ReleaseServerService) {
        this.releaseCentersSubscription = this.releaseCenterService.getReleaseCenters().subscribe(data => this.releaseCenters = data);
        this.activeReleaseCenterSubscription = this.releaseCenterService.getActiveReleaseCenter().subscribe(data => {
            this.activeReleaseCenter = data;
        });
    }

    ngOnInit(): void {
        let releaseCenterKey;
        this.route.paramMap.subscribe(paramMap => {
            releaseCenterKey = paramMap['params']['releaseCenterKey'];
        });

        this.releaseServer.getCenters().subscribe(centers => {
            this.releaseCenterService.setReleaseCenters(centers);
            if (releaseCenterKey) {
                const activeReleaseCenter = centers.find(releaseCenter => releaseCenter.id === releaseCenterKey);
                if (activeReleaseCenter) {
                    this.releaseCenterService.setActiveReleaseCenter(activeReleaseCenter);
                } else {
                    this.releaseCenterService.setActiveReleaseCenter(centers[0]);
                }
            } else {
                this.releaseCenterService.setActiveReleaseCenter(centers[0]);
            }
        });
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
        this.savingCenter = true;
        this.releaseServer.postCenter({name: name, shortName: shortName}).subscribe(
            response => {
                this.savingCenter = false;
                this.releaseCenters.push(response);
                this.modalService.close('add-modal');
            },
            errorResponse => {
                this.savingCenter = false;
                this.saveResponse = errorResponse.error.errorMessage;
                this.saved = (this.saved === 'start' ? 'end' : 'start');
            });
    }

    saveReleaseCenter(name, shortName) {
        this.savingCenter = true;
        this.releaseServer.putCenter(this.activeReleaseCenter.id, {name: name, shortName: shortName}).subscribe(
            response => {
                this.savingCenter = false;
                const currentIndex = this.releaseCenters.indexOf(this.activeReleaseCenter);
                this.releaseCenters[currentIndex] = response;
                this.activeReleaseCenter = response;
                this.modalService.close('edit-modal');
            },
            errorResponse => {
                this.savingCenter = false;
                this.saveResponse = errorResponse.error.errorMessage;
                this.saved = (this.saved === 'start' ? 'end' : 'start');
            });
    }
}
