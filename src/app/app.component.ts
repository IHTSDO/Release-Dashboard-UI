import { Component, OnInit } from '@angular/core';
import 'jquery';
import { Title } from '@angular/platform-browser';
import { AuthoringService } from './services/authoring/authoring.service';
import { BranchingService } from './services/branching/branching.service';
import { ReleaseCenter, ReleaseCenterService } from './services/releaseCenter/release-center.service';
import { ReleaseServerService } from './services/releaseServer/release-server.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

    environment: string;
    activeReleaseCenter: ReleaseCenter;
    activeReleaseCenterSubscription: Subscription;

    constructor(private authoringService: AuthoringService,
                private branchingService: BranchingService,
                private titleService: Title,
                private releaseCenterService: ReleaseCenterService,
                private releaseService: ReleaseServerService) {
        this.activeReleaseCenterSubscription = this.releaseCenterService.getActiveReleaseCenter().subscribe(data => {
            this.activeReleaseCenter = data;
        });
    }

    ngOnInit() {
        this.titleService.setTitle('SNOMED CT Release Dashboard');
        this.environment = window.location.host.split(/[.]/)[0].split(/[-]/)[0];

        this.releaseService.getCenters().subscribe(centers => {
            this.releaseCenterService.setReleaseCenters(centers);
            this.releaseCenterService.setActiveReleaseCenter(centers[0]);


        });

        this.assignFavicon();
    }

    assignFavicon() {
        const favicon = $('#favicon');

        switch (this.environment) {
            case 'local':
                favicon.attr('href', 'favicon_grey.ico');
                break;
            case 'dev':
                favicon.attr('href', 'favicon_red.ico');
                break;
            case 'uat':
                favicon.attr('href', 'favicon_green.ico');
                break;
            case 'training':
                favicon.attr('href', 'favicon_yellow.ico');
                break;
            default:
                favicon.attr('href', 'favicon.ico');
                break;
        }
    }
}
