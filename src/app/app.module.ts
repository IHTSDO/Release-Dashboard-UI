import { BrowserModule } from '@angular/platform-browser';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { AppComponent } from './app.component';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { HeaderInterceptor } from './interceptors/header.interceptor';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import { SnomedNavbarComponent } from './components/snomed-navbar/snomed-navbar.component';
import { SnomedFooterComponent } from './components/snomed-footer/snomed-footer.component';
import { AuthenticationService } from './services/authentication/authentication.service';
import { AuthoringService } from './services/authoring/authoring.service';
import { LeftSidebarComponent } from './components/left-sidebar/left-sidebar.component';
import { ProductViewerComponent } from './components/product-viewer/product-viewer.component';
import { ModalComponent } from './components/modal/modal.component';
import { ModalService } from './services/modal/modal.service';
import { ReleaseCenterService } from './services/releaseCenter/release-center.service';
import { ReleaseServerService } from './services/releaseServer/release-server.service';
import { AppRoutingModule } from './app-routing.module';
import { BuildViewerComponent } from './components/build-viewer/build-viewer.component';
import { ProductService } from './services/product/product.service';
import { ProductDataService } from './services/product/product-data.service';
import { AuthenticationInterceptor } from './interceptors/authentication.interceptor';
import { EnvServiceProvider } from './providers/env.service.provider';
import { PermissionService } from './services/permission/permission.service';
import { WebsocketService } from './services/websocket/websocket.service';
import { SortDirective } from './directive/sort.directive';
import { RVFServerService } from './services/rvfServer/rvf-server.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotificationService } from './services/notification/notification.service';
import { MAT_DATE_FORMATS, MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';

export function startupServiceFactory(permissionService: PermissionService): Function {
    return () => permissionService.getRoles();
}

export const DATE_FORMATS = {
    parse: {
        dateInput: 'YYYY-MM-DD',
    },
    display: {
        dateInput: 'YYYY-MM-DD',
        monthYearLabel: 'MMM YYYY',
        dateA11yLabel: 'LL',
        monthYearA11yLabel: 'MMMM YYYY'
    }
}
  
@NgModule({
    declarations: [
        AppComponent,
        SnomedNavbarComponent,
        SnomedFooterComponent,
        LeftSidebarComponent,
        ProductViewerComponent,
        ModalComponent,
        BuildViewerComponent,
        SortDirective
    ],
    imports: [
        BrowserModule,
        FormsModule,
        HttpClientModule,
        BrowserAnimationsModule,
        NgbTypeaheadModule,
        AppRoutingModule,
        MatTooltipModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatIconModule,
        MatMomentDateModule,
        MatPaginatorModule,
        MatInputModule
        ],
    providers: [
        AuthenticationService,
        AuthoringService,
        ReleaseCenterService,
        ReleaseServerService,
        RVFServerService,
        ProductService,
        ProductDataService,
        ModalService,
        PermissionService,
        WebsocketService,
        NotificationService,
        EnvServiceProvider,
        {
            provide: HTTP_INTERCEPTORS,
            useClass: HeaderInterceptor,
            multi: true
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: AuthenticationInterceptor,
            multi: true
        },
        {
            provide: APP_INITIALIZER,
            useFactory: startupServiceFactory,
            deps: [PermissionService],
            multi: true
        },
        { 
            provide: MAT_DATE_FORMATS, 
            useValue: DATE_FORMATS 
        }
    ],
    bootstrap: [AppComponent]
})

export class AppModule {
}
