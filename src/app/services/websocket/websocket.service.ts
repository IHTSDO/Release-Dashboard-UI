import { Injectable, Output } from '@angular/core';
import * as Stomp from 'stompjs';
import * as SockJS from 'sockjs-client';
import { EventEmitter } from 'events';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  webSocketEndPoint = '/release/snomed-release-service-websocket';
  buildStatusTopic = '/topic/build-status-change';
  userNotificationTopic = '/topic/user/';

  stompClient: any;

  @Output() messageEvent: EventEmitter = new EventEmitter();

  constructor() { }

  connect(username: string) {
      const ws = new SockJS(this.webSocketEndPoint);
      this.stompClient = Stomp.over(ws);

      const _this = this;
      this.stompClient.connect({}, function (frame) {
        _this.stompClient.subscribe(_this.buildStatusTopic, function (message) {
            _this.onStatusMessageReceived(message);
        });

        _this.stompClient.subscribe(_this.userNotificationTopic + username + '/notification', function (message) {
          _this.onNotificationMessageReceived(message);
      });
      }, () => {
        setTimeout(() => {
          this.connect(username);
        }, 5000);
      });
  }

  disconnect() {
      if (this.stompClient !== null) {
          this.stompClient.disconnect();
      }
  }

  onStatusMessageReceived(message) {
      this.messageEvent.emit('build-status-change-event', message);
  }

  onNotificationMessageReceived(message) {
    this.messageEvent.emit('notfication-event', message);
  }
}
