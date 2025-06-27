import {Injectable, Output} from '@angular/core';
import SockJS from 'sockjs-client';
import { EventEmitter } from 'events';
import { Client } from '@stomp/stompjs';

@Injectable({
    providedIn: 'root'
})
export class WebsocketService {
    webSocketEndPoint = '/release/snomed-release-service-websocket';
    buildStatusTopic = '/topic/build-status-change';
    userNotificationTopic = '/topic/user/';

    client: any;

    @Output() messageEvent: EventEmitter = new EventEmitter();

    constructor() {
    }

    connect(username: string) {
        const _this = this;
        const stompClient = new Client({
            webSocketFactory: () => {
                return new SockJS(this.webSocketEndPoint);
            },
            onConnect: () => {
                stompClient.subscribe(_this.buildStatusTopic, message =>
                    _this.onStatusMessageReceived(message)
                );
                stompClient.subscribe(_this.userNotificationTopic + username + '/notification', message =>
                    _this.onNotificationMessageReceived(message)
                );
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000
        });
        stompClient.activate();
    }

    disconnect() {
        if (this.client !== null) {
            this.client.forceDisconnect();
        }
    }

    onStatusMessageReceived(message) {
        this.messageEvent.emit('build-status-change-event', message);
    }

    onNotificationMessageReceived(message) {
        this.messageEvent.emit('notfication-event', message);
    }
}
