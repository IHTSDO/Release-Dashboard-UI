import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ReleaseCenterService } from '../../services/releaseCenter/release-center.service';

@Component({
    selector: 'app-left-sidebar',
    templateUrl: './left-sidebar.component.html',
    styleUrls: ['./left-sidebar.component.scss']
})
export class LeftSidebarComponent implements OnInit {

    releaseCenters: object;
    private releaseCentersSubscription: Subscription;
    private activeReleaseCenter: object;
    private activeReleaseCenterSubscription: Subscription;

    constructor(private releaseCenterService: ReleaseCenterService) {
        this.releaseCentersSubscription = this.releaseCenterService.getReleaseCenters().subscribe(data => this.releaseCenters = data);
        this.activeReleaseCenterSubscription = this.releaseCenterService.getActiveReleaseCenter().subscribe(data => {
            this.activeReleaseCenter = data;
        });
    }

    ngOnInit(): void {
    }

    switchActiveReleaseCenter(center) {
        this.releaseCenterService.setActiveReleaseCenter(center);
    }
}
