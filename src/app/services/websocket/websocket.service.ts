import { Injectable, Output } from '@angular/core';
import * as Stomp from 'stompjs';
import * as SockJS from 'sockjs-client';
import { EventEmitter } from 'events';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  webSocketEndPoint = '/release/snomed-release-service-websocket';
  topic = '/topic/snomed-release-service-websocket';

  stompClient: any;

  @Output() messageEvent: EventEmitter = new EventEmitter();

  constructor() { }

  connect() {
      const ws = new SockJS(this.webSocketEndPoint);
      this.stompClient = Stomp.over(ws);

      const _this = this;
      this.stompClient.connect({}, function (frame) {
        _this.stompClient.subscribe(_this.topic, function (message) {
          _this.onMessageReceived(message);
          });
      }, () => {
        setTimeout(() => {
          this.connect();
        }, 5000);
      });
  }

  disconnect() {
      if (this.stompClient !== null) {
          this.stompClient.disconnect();
      }
  }

  onMessageReceived(message) {
      this.messageEvent.emit('build-status-change-event', message);
  }
}
