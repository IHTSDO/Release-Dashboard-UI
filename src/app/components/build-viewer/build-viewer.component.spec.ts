import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { BuildViewerComponent } from './build-viewer.component';

import { ProductViewerComponent } from '../../components/product-viewer/product-viewer.component';
import { ModalComponent } from '../../components/modal/modal.component';
import { LeftSidebarComponent } from '../../components/left-sidebar/left-sidebar.component';

import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgxPaginationModule } from 'ngx-pagination';
import { AppRoutingModule } from '../../app-routing.module';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { FormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('BuildViewerComponent', () => {
  let component: BuildViewerComponent;
  let fixture: ComponentFixture<BuildViewerComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [
        BuildViewerComponent,
        ProductViewerComponent,
        ModalComponent,
        LeftSidebarComponent
      ],
      imports: [
        BrowserAnimationsModule,
        AppRoutingModule,
        NgxPaginationModule,
        NgbTypeaheadModule,
        BsDatepickerModule.forRoot(),
        FormsModule,
        RouterTestingModule,
        HttpClientTestingModule
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BuildViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
