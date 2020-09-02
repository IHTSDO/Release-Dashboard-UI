import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalComponent } from './modal.component';

import { ProductViewerComponent } from '../../components/product-viewer/product-viewer.component';
import { BuildViewerComponent } from '../../components/build-viewer/build-viewer.component';
import { LeftSidebarComponent } from '../../components/left-sidebar/left-sidebar.component';

import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgxPaginationModule } from 'ngx-pagination';
import { AppRoutingModule } from '../../app-routing.module';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { FormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ModalComponent', () => {
  let component: ModalComponent;
  let fixture: ComponentFixture<ModalComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ 
        ModalComponent, 
        ProductViewerComponent, 
        BuildViewerComponent,
        LeftSidebarComponent
      ],
      imports: [ 
        BrowserAnimationsModule, 
        AppRoutingModule,
        NgxPaginationModule,
        NgbTypeaheadModule,
        BsDatepickerModule,
        FormsModule,
        RouterTestingModule,
        HttpClientTestingModule
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
