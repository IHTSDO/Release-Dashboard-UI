import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { AuthenticationService } from './services/authentication/authentication.service';
import { AuthoringService } from './services/authoring/authoring.service';
import { EnvService } from './services/environment/env.service';
import { WebsocketService } from './services/websocket/websocket.service';
import { BuildService } from './services/build/build.service';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { ReleaseServerService } from './services/releaseServer/release-server.service';
import { ReleaseCenterService } from './services/releaseCenter/release-center.service';
import { SnomedFooterComponent } from './components/snomed-footer/snomed-footer.component';
import { RouterOutlet } from '@angular/router';
import { SnomedNavbarComponent } from './components/snomed-navbar/snomed-navbar.component';

@Component({
    selector: 'app-root',
    imports: [SnomedFooterComponent, SnomedNavbarComponent, RouterOutlet],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

    environment: string = '';

    constructor(private authoringService: AuthoringService,
                private titleService: Title,
                private authenticationService: AuthenticationService,
                private buildService: BuildService,
                private websocketService: WebsocketService,
                private releaseServerService: ReleaseServerService,
                private releaseCenterService: ReleaseCenterService,
                @Inject(DOCUMENT) private document: Document,
                @Inject(PLATFORM_ID) private platformId: Object) {
                this.authenticationService.getUser().subscribe(data => {
                    this.websocketService.connect(data.login);
                });
    }

    ngOnInit() {
         if (!isPlatformBrowser(this.platformId)) {
            return;
         }
        this.titleService.setTitle('SNOMED CT Release Dashboard');
        this.buildService.initialiseBuild().subscribe();
        this.environment = window.location.host.split(/[.]/)[0].split(/[-]/)[0];
        this.getUIConfiguration();
        this.assignFavicon();
        this.getAllReleasePackages();
    }
    
    getAllReleasePackages() {
        this.releaseServerService.getAllReleasePackages().subscribe(
            data => {
                this.releaseServerService.setReleases(data);                
                this.releaseCenterService.catchReleasePackages(data);
            },
            error => {
                console.error('ERROR: Release Packages failed to load');
            }
        );
    }

    getUIConfiguration() {
        this.authoringService.getUIConfiguration().subscribe(
            data => {
                this.authoringService.uiConfiguration = data;
            },
            error => {
                console.error('ERROR: UI Config failed to load');
            }
        );
    }

    assignFavicon() {
        switch (this.environment) {
            case 'local':
                this.document.getElementById('favicon').setAttribute('href', 'favicon_grey.ico');
                break;
            case 'dev':
                this.document.getElementById('favicon').setAttribute('href', 'favicon_red.ico');
                break;
            case 'uat':
                this.document.getElementById('favicon').setAttribute('href', 'favicon_green.ico');
                break;
            case 'training':
                this.document.getElementById('favicon').setAttribute('href', 'favicon_yellow.ico');
                break;
            default:
                this.document.getElementById('favicon').setAttribute('href', 'favicon.ico');
                break;
        }
    }
}
