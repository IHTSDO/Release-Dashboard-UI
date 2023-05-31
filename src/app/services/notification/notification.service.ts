import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class NotificationService {

    constructor(private http: HttpClient) {
    }

    retrieveNotifications(pageNumber, pageSize) {
        const params = new HttpParams()
                    .set('pageNumber', (pageNumber - 1).toString())
                    .set('pageSize', pageSize);
        return this.http.get<object>('/release/notifications', {params: params});
    }

    countUnreadNotification() {
        return this.http.get<object>('/release/notifications/un-read/count', {});
    }

    clearNotifications() {
        return this.http.delete<object>('/release/notifications', {});
    }

    markNotificationAsRead(notificationIds) {
        let params = '';
        notificationIds.forEach(function (value) {
            params += (params.length !== 0 ? '&' : '') + 'notificationIds=' + value;
        });
        return this.http.put<object>('/release/notifications/bulk-mark-as-read?' + params, {});
    }
}
