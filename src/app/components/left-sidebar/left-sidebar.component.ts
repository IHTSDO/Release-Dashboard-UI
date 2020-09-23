import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ReleaseCenterService } from '../../services/releaseCenter/release-center.service';
import { ModalService } from '../../services/modal/modal.service';
import { ReleaseServerService } from '../../services/releaseServer/release-server.service';
import { ReleaseCenter } from '../../models/releaseCenter';
import { ActivatedRoute } from '@angular/router';
import { ProductPaginationService } from '../../services/pagination/product-pagination.service';

@Component({
    selector: 'app-left-sidebar',
    templateUrl: './left-sidebar.component.html',
    styleUrls: ['./left-sidebar.component.scss']
})
export class LeftSidebarComponent implements OnInit {

    private activeReleaseCenterSubscription: Subscription;

    releaseCenters: ReleaseCenter[];
    activeReleaseCenter: ReleaseCenter;

    // animations
    saveResponse: string;
    savingCenter = false;

    message: string;

    constructor(private route: ActivatedRoute,
                private releaseCenterService: ReleaseCenterService,
                private modalService: ModalService,
                private releaseServer: ReleaseServerService,
                private paginationService: ProductPaginationService) {
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

    switchActiveReleaseCenter(center) {
        // Clear the selected page number for previous active release center
        this.paginationService.clearSelectedPage(this.activeReleaseCenter.id);

        // Set current active release center
        this.releaseCenterService.setActiveReleaseCenter(center);
    }

    addReleaseCenter(name, shortName) {
        this.saveResponse = '';
        this.message = '';
        const missingFields = this.missingFieldsCheck(name, shortName);
        if (missingFields.length !== 0) {
            this.saveResponse = 'Missing Fields: ' + missingFields.join(', ') + '.';
            return;
        }
        this.savingCenter = true;
        this.releaseServer.postCenter({name: name, shortName: shortName}).subscribe(
            response => {
                this.savingCenter = false;
                this.releaseCenters.push(response);
                this.releaseCenterService.cacheReleaseCenters(this.releaseCenters);
                this.message = 'The release center ' + response.name + ' has been created successfully.';
                this.modalService.close('add-modal');
                this.openSuccessModel();
            },
            errorResponse => {
                this.savingCenter = false;
                this.saveResponse = errorResponse.error.errorMessage;
            }
        );
    }

    saveReleaseCenter(name, shortName) {
        this.saveResponse = '';
        this.message = '';
        const missingFields = this.missingFieldsCheck(name, shortName);
        if (missingFields.length !== 0) {
            this.saveResponse = 'Missing Fields: ' + missingFields.join(', ') + '.';
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
                this.message = 'The release center ' + response.name + ' has been updated successfully.';
                this.closeModal('edit-modal');
                this.openSuccessModel();
            },
            errorResponse => {
                this.savingCenter = false;
                this.saveResponse = errorResponse.error.errorMessage;
            }
        );
    }

    missingFieldsCheck(name, shortName): Object[] {
        const missingFields = [];
        if (!name) { missingFields.push('Name'); }
        if (!shortName) { missingFields.push('Short Name'); }

        return missingFields;
    }

    openModal(name) {
        this.modalService.open(name);
    }

    closeModal(name) {
        this.modalService.close(name);
    }

    private openSuccessModel() {
        this.openModal('release-center-success-modal');
    }
}
