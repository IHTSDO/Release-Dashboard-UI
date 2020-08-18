// FRAMEWORK IMPORTS
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AppComponent } from './app.component';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { HeaderInterceptor } from './interceptors/header.interceptor';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import {NgxPaginationModule} from 'ngx-pagination';

// COMPONENT IMPORTS
import { SnomedNavbarComponent } from './components/snomed-navbar/snomed-navbar.component';
import { SnomedFooterComponent } from './components/snomed-footer/snomed-footer.component';

// PIPE IMPORTS
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

// SERVICE IMPORTS


@NgModule({
    declarations: [
        AppComponent,
        SnomedNavbarComponent,
        SnomedFooterComponent,
        LeftSidebarComponent,
        ProductViewerComponent,
        ModalComponent,
        BuildViewerComponent
    ],
    imports: [
        BrowserModule,
        FormsModule,
        HttpClientModule,
        BrowserAnimationsModule,
        NgbTypeaheadModule,
        AppRoutingModule,
        NgxPaginationModule,
        BsDatepickerModule.forRoot()
    ],
    providers: [
        AuthenticationService,
        AuthoringService,
        ReleaseCenterService,
        ReleaseServerService,
        ProductService,
        ProductDataService,
        ModalService,
        {
            provide: HTTP_INTERCEPTORS,
            useClass: HeaderInterceptor,
            multi: true
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: AuthenticationInterceptor,
            multi: true
        }
    ],
    bootstrap: [AppComponent]
})
export class AppModule {
}
