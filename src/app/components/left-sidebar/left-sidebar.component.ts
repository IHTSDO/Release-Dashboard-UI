import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ReleaseCenterService } from '../../services/releaseCenter/release-center.service';
import { ModalService } from '../../services/modal/modal.service';
import { ReleaseServerService } from '../../services/releaseServer/release-server.service';
import { ReleaseCenter } from '../../models/releaseCenter';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductPaginationService } from '../../services/pagination/product-pagination.service';
import { CodeSystem } from '../../models/codeSystem';
import { PermissionService } from '../../services/permission/permission.service';

@Component({
    selector: 'app-left-sidebar',
    templateUrl: './left-sidebar.component.html',
    styleUrls: ['./left-sidebar.component.scss']
})
export class LeftSidebarComponent implements OnInit {

    private activeReleaseCenterSubscription: Subscription;

    releaseCenters: ReleaseCenter[];
    codeSystems: CodeSystem[];
    roles: Object;
    activeReleaseCenter: ReleaseCenter;

    // animations
    savingCenter = false;

    message: string;

    constructor(private route: ActivatedRoute,
                private router: Router,
                private releaseCenterService: ReleaseCenterService,
                private modalService: ModalService,
                private releaseServer: ReleaseServerService,
                private permissionService: PermissionService,
                private paginationService: ProductPaginationService) {
        this.activeReleaseCenterSubscription = this.releaseCenterService.getActiveReleaseCenter().subscribe(data => {
            this.activeReleaseCenter = data;
        });
    }

    ngOnInit(): void {
        this.activeReleaseCenter = new ReleaseCenter();
        let releaseCenterKey;
        this.roles = this.permissionService.roles;
        this.route.paramMap.subscribe(paramMap => {
            releaseCenterKey = paramMap['params']['releaseCenterKey'];
        });
        this.loadReleaseCenters(this.releaseCenterService, this.releaseServer).then(data => {
            this.releaseCenters = <ReleaseCenter[]> data;
            this.releaseCenters.sort((a, b) => {
                if (b['id'] === 'international') {
                    return 1;
                } else {
                    return a['name'].localeCompare(b['name']);
                }
            });
            this.releaseCenterService.cacheReleaseCenters(this.releaseCenters);
            if (this.releaseCenters.length !== 0) {
                if (releaseCenterKey) {
                    const activeReleaseCenter = this.releaseCenters.find(releaseCenter => releaseCenter.id === releaseCenterKey);
                    if (activeReleaseCenter) {
                        this.releaseCenterService.setActiveReleaseCenter(activeReleaseCenter);
                    } else {
                        this.releaseCenterService.setActiveReleaseCenter(this.releaseCenters[0]);
                        this.router.navigate(['/', this.releaseCenters[0].id], {skipLocationChange: false});
                    }
                } else {
                    this.releaseCenterService.setActiveReleaseCenter(this.releaseCenters[0]);
                    this.router.navigate(['/', this.releaseCenters[0].id], {skipLocationChange: false});
                }
            }
        });

        this.loadCodeSystems(this.releaseCenterService, this.releaseServer).then(data => {
            this.codeSystems = <CodeSystem[]> data;
            this.releaseCenterService.cacheCodeSystems(this.codeSystems);
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

    // load code systems from cache, other from server
    loadCodeSystems(releaseCenterService, releaseServer) {
        const promise = new Promise(function(resolve, reject) {
            const codeSystems = releaseCenterService.getCachedCodeSystems();
            if (codeSystems && codeSystems.length !== 0) {
                resolve(codeSystems);
                return;
            }
            releaseServer.getCodeSystems().subscribe(data => resolve(data));
        });

        return promise;
    }
    switchActiveReleaseCenter(center) {
        // Clear the selected page number for previous active release center
        this.paginationService.clearSelectedPage(this.activeReleaseCenter.id);

        // Set current active release center
        this.releaseCenterService.setActiveReleaseCenter(center);
    }

    addReleaseCenter(name, shortName, codeSystem, snomedCtProduct) {
        this.message = '';
        const missingFields = this.missingFieldsCheck(name, shortName, codeSystem);
        if (missingFields.length !== 0) {
            this.message = 'Please enter the following fields: ' + missingFields.join(', ') + '.';
            this.openErrorModel();
            return;
        }
        this.savingCenter = true;
        this.releaseServer.postCenter({name: name,
                                        shortName: shortName,
                                        codeSystem: codeSystem,
                                        snomedCtProduct: snomedCtProduct}).subscribe(
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
                if (errorResponse.status === 409) {
                    this.message = 'There was already a release center with short name \'' + shortName + '\'. Please select another one.';
                } else {
                    this.message = errorResponse.error.errorMessage;
                }

                this.openErrorModel();
            }
        );
    }

    saveReleaseCenter(name, shortName, codeSystem, snomedCtProduct) {
        this.message = '';
        const missingFields = this.missingFieldsCheck(name, shortName, codeSystem);
        if (missingFields.length !== 0) {
            this.message = 'Please enter the following fields: ' + missingFields.join(', ') + '.';
            this.openErrorModel();
            return;
        }

        this.savingCenter = true;
        this.releaseServer.putCenter(this.activeReleaseCenter.id, {name: name,
                                                                    shortName: shortName,
                                                                    codeSystem: codeSystem,
                                                                    snomedCtProduct : snomedCtProduct}).subscribe(
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
                this.message = errorResponse.error.errorMessage;
                this.openErrorModel();
            }
        );
    }

    removeReleaseCenter() {
        if (!this.activeReleaseCenter) {
            return;
        }
        this.releaseServer.putCenter(this.activeReleaseCenter.id, {name: this.activeReleaseCenter.name,
                                                                shortName: this.activeReleaseCenter.shortName,
                                                                codeSystem: this.activeReleaseCenter.codeSystem,
                                                                removed: true}).subscribe(
            response => {
                this.releaseCenterService.clearCachedReleaseCenters();
                this.ngOnInit();
                this.message = 'The release center ' + response.name + ' has been removed successfully.';
                this.closeModal('remove-release-center-confirmation-modal');
                this.openSuccessModel();
            },
            errorResponse => {
                this.closeModal('remove-release-center-confirmation-modal');
                this.message = errorResponse.error.errorMessage;
                this.openErrorModel();
            }
        );
    }

    missingFieldsCheck(name, shortName, codeSystem): Object[] {
        const missingFields = [];
        if (!name) { missingFields.push('Name'); }
        if (!shortName) { missingFields.push('Short Name'); }
        if (!codeSystem) { missingFields.push('Code System'); }
        return missingFields;
    }

    openModal(name) {
        this.modalService.open(name);
    }

    closeModal(name) {
        this.modalService.close(name);
    }

    canAddReleaseCenter() {
        return this.roles && this.roles.hasOwnProperty('GLOBAL') && (<Array<String>> this.roles['GLOBAL']).indexOf('RELEASE_ADMIN') !== -1;
    }

    private openSuccessModel() {
        this.openModal('release-center-success-modal');
    }

    private openErrorModel() {
        this.openModal('release-center-error-modal');
    }
}
