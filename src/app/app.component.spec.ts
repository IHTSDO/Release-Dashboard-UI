import { TestBed, waitForAsync } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { AppComponent } from './app.component';

// FRAMEWORK IMPORTS
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { HeaderInterceptor } from './interceptors/header.interceptor';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { NgxPaginationModule } from 'ngx-pagination';

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


describe('AppComponent', () => {
    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [
                HttpClientTestingModule,
                BrowserModule,
                FormsModule,
                HttpClientModule,
                BrowserAnimationsModule,
                NgbTypeaheadModule,
                AppRoutingModule,
                NgxPaginationModule,
                BsDatepickerModule.forRoot(),
                RouterTestingModule
            ],
            declarations: [
                AppComponent,
                SnomedNavbarComponent,
                SnomedFooterComponent,
                LeftSidebarComponent,
                ProductViewerComponent,
                ModalComponent,
                BuildViewerComponent
            ],
        }).compileComponents();
    }));
    it('should create the app', waitForAsync(() => {
        const fixture = TestBed.createComponent(AppComponent);
        const app = fixture.debugElement.componentInstance;
        expect(app).toBeTruthy();
    }));
});
