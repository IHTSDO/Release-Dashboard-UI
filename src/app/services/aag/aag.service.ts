import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CreateWhitelistItemRequest, WhitelistItem } from '../../models/whitelistItem';

@Injectable({
    providedIn: 'root'
})
export class AagService {

    private readonly baseUrl = '/authoring-acceptance-gateway/whitelist-items';

    constructor(private http: HttpClient) {
    }

    getWhitelistItemsByAssertions(validationRuleIds: string[]): Observable<WhitelistItem[]> {
        if (!validationRuleIds?.length) {
            return of([]);
        }
        const url = `${this.baseUrl}/validation-rules`;
        return this.http.post<WhitelistItem[]>(url, validationRuleIds).pipe(
            map(items => items ?? []),
            catchError(error => {
                if (error.status === 204 || error.status === 404) {
                    return of([]);
                }
                throw error;
            })
        );
    }   

    createWhitelistItem(item: CreateWhitelistItemRequest): Observable<WhitelistItem> {
        return this.http.post<WhitelistItem>(this.baseUrl, item);
    }

    deleteWhitelistItem(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/item/${id}`);
    }
}
