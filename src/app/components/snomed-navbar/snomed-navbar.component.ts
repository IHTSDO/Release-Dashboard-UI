import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { EnvService } from '../../services/environment/env.service';
import { User } from '../../models/user';
import { AuthenticationService } from '../../services/authentication/authentication.service';
import {ModalService} from '../../services/modal/modal.service';

@Component({
    selector: 'app-snomed-navbar',
    templateUrl: './snomed-navbar.component.html',
    styleUrls: ['./snomed-navbar.component.scss']
})
export class SnomedNavbarComponent implements OnInit {

    environment: string;
    user: User;
    userSubscription: Subscription;

    constructor(private authenticationService: AuthenticationService,
                private envService: EnvService,
                private modalService: ModalService) {
        this.userSubscription = this.authenticationService.getUser().subscribe(data => this.user = data);
    }

    ngOnInit() {
        this.environment = this.envService.env;
        this.authenticationService.setUser();
    }

    openModal(name) {
        this.modalService.open(name);
    }

    closeModal(name) {
        this.modalService.close(name);
    }

    logout() {
        this.authenticationService.logout();
    }
}
