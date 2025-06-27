import { HttpInterceptorFn } from '@angular/common/http';

export const headerInterceptor: HttpInterceptorFn = (req, next) => {

    const ignore = typeof req.body === 'undefined'
        || req.body === null
        || req.body.toString() === '[object FormData]'
        || req.headers.has('Content-Type');

    if (ignore) {
        return next(req);
    }

    const cloned = req.clone({
        headers: req.headers.set('Content-Type', 'application/json')
    });
    return next(cloned);

}
