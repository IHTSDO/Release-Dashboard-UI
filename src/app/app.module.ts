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
        AppRoutingModule
    ],
    providers: [
        AuthenticationService,
        AuthoringService,
        ReleaseCenterService,
        ReleaseServerService,
        ModalService,
        {
            provide: HTTP_INTERCEPTORS,
            useClass: HeaderInterceptor,
            multi: true
        }
    ],
    bootstrap: [AppComponent]
})
export class AppModule {
}
