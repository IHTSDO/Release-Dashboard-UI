import { ApplicationConfig, importProvidersFrom, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideClientHydration } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from "@angular/common/http";
import { provideAnimations } from "@angular/platform-browser/animations";
import { provideToastr, ToastrModule } from "ngx-toastr";
import { headerInterceptor } from './interceptors/header.interceptor';
import { authenticationInterceptor } from './interceptors/authentication.interceptor';
import { routes } from './app.routes';
import { PermissionService } from './services/permission/permission.service';

export const appConfig: ApplicationConfig = {
    providers: [
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideRouter(routes),
        provideClientHydration(),
        provideHttpClient(withFetch(), withInterceptors([headerInterceptor, authenticationInterceptor])),
        provideAnimations(),
        provideToastr(),
        provideAppInitializer(() => {
            const permissionService = inject(PermissionService);
            return permissionService.getRoles();
        }),
        importProvidersFrom(
            ToastrModule.forRoot()
        )
    ]
};
