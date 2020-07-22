import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ReleaseCenter, ReleaseCenterService } from '../../services/releaseCenter/release-center.service';
import { ModalService } from '../../services/modal/modal.service';
import { ReleaseServerService } from '../../services/releaseServer/release-server.service';

@Component({
    selector: 'app-left-sidebar',
    templateUrl: './left-sidebar.component.html',
    styleUrls: ['./left-sidebar.component.scss']
})
export class LeftSidebarComponent implements OnInit {

    releaseCenters: ReleaseCenter[];
    releaseCentersSubscription: Subscription;
    activeReleaseCenter: ReleaseCenter;
    activeReleaseCenterSubscription: Subscription;

    constructor(private releaseCenterService: ReleaseCenterService,
                private modalService: ModalService,
                private releaseServer: ReleaseServerService) {
        this.releaseCentersSubscription = this.releaseCenterService.getReleaseCenters().subscribe(data => this.releaseCenters = data);
        this.activeReleaseCenterSubscription = this.releaseCenterService.getActiveReleaseCenter().subscribe(data => {
            this.activeReleaseCenter = data;
        });
    }

    ngOnInit(): void {
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
        this.modalService.close('add-modal');
        this.releaseServer.postCenter({name: name, shortName: shortName});
    }

    saveReleaseCenter(name, shortName) {
        this.modalService.close('edit-modal');
        this.releaseServer.putCenter(this.activeReleaseCenter.id, {name: name, shortName: shortName});
    }
}
