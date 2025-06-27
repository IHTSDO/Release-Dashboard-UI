import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { EnvService } from '../../services/environment/env.service';
import { User } from '../../models/user';
import { AuthenticationService } from '../../services/authentication/authentication.service';
import { ModalService } from '../../services/modal/modal.service';
import { WebsocketService } from '../../services/websocket/websocket.service';
import { NotificationService } from '../../services/notification/notification.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-snomed-navbar',
    imports: [ReactiveFormsModule, FormsModule, CommonModule, MatMenuModule, RouterLink],
    templateUrl: './snomed-navbar.component.html',
    styleUrls: ['./snomed-navbar.component.scss']
})
export class SnomedNavbarComponent implements OnInit {

    environment: string;
    user: User;
    userSubscription: Subscription;
    notfications: any[];
    totalUnreadNotification: number;
    pageSize = 10;
    pageNumber: number;
    loadingNotfications = false;
    loadMoreNotficationsEnable = false;

    constructor(private authenticationService: AuthenticationService,
                private envService: EnvService,
                private websocketService: WebsocketService,
                private notificationService: NotificationService,
                private modalService: ModalService) {
        this.notfications = [];
        this.totalUnreadNotification = 0;
        this.userSubscription = this.authenticationService.getUser().subscribe(data => {
            this.user = data;
            this.countUnreadNotification();
        });
    }

    ngOnInit() {
        this.environment = this.envService.env;
        this.authenticationService.setUser();

        this.websocketService.messageEvent.addListener('notfication-event', (message) => {
            this.countUnreadNotification();
        });
    }

    countUnreadNotification() {
        this.notificationService.countUnreadNotification().subscribe(data => {
            this.totalUnreadNotification = data['total'];
        });
    }

    retriveNotifications(pageNumber) {
        this.loadingNotfications = true;
        this.loadMoreNotficationsEnable = false;
        this.notificationService.retrieveNotifications(pageNumber, this.pageSize).subscribe(data => {
            this.loadingNotfications = false;
            this.loadMoreNotficationsEnable = data['totalElements'] > pageNumber * this.pageSize;
            if (!data['empty']) {
                const unreadNotifications = [];
                data['content'].forEach(function (item) {
                    if (!item.read) {
                        unreadNotifications.push(item.id);
                    }
                    item.details = JSON.parse(item.details);
                });
                if (unreadNotifications.length !== 0) {
                    this.notificationService.markNotificationAsRead(unreadNotifications).subscribe(() => {
                        // Do nothing
                    });
                }
                this.notfications = this.notfications.concat(data['content']);
            }
        });
    }

    toggleNotificationsPane() {
        const selector = document.querySelectorAll("div.cdk-overlay-backdrop.notification");
        if (selector) {
            this.notfications = [];
            this.pageNumber = 1;
            this.retriveNotifications(this.pageNumber);
        }
    }

    clearNotifications() {
        this.notificationService.clearNotifications().subscribe(data => {
            this.notfications = [];
            this.loadMoreNotficationsEnable = false;
        });
    }

    loadMoreNotifications () {
        this.pageNumber += 1;
        this.retriveNotifications(this.pageNumber);
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
