import { HttpEvent, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, map } from 'rxjs';
import { AuthoringService } from '../services/authoring/authoring.service';

export const authenticationInterceptor: HttpInterceptorFn = (req, next) => {
    const authoringService = inject(AuthoringService);
    return next(req).pipe(
        map((event: HttpEvent<any>) => {
            return event;
        }),
        catchError(err => {
            if (err.status === 403) {
                let config: any = {};
                authoringService.getUIConfiguration().subscribe(data => {
                    config = data;
                    window.location.href =
                        config.endpoints.imsEndpoint
                        + 'login?serviceReferer='
                        + window.location.href;
                });
            }
            throw err;
        })
    );
}
