import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { LeftSidebarComponent } from './left-sidebar.component';
import { ProductViewerComponent } from '../../components/product-viewer/product-viewer.component';
import { BuildViewerComponent } from '../../components/build-viewer/build-viewer.component';
import { ModalComponent } from '../../components/modal/modal.component';

import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from '../../app-routing.module';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('LeftSidebarComponent', () => {
  let component: LeftSidebarComponent;
  let fixture: ComponentFixture<LeftSidebarComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [
          LeftSidebarComponent,
          ProductViewerComponent,
          BuildViewerComponent,
          ModalComponent
        ],
      imports: [
        BrowserAnimationsModule,
        AppRoutingModule,
        NgbTypeaheadModule,
        FormsModule,
        RouterTestingModule,
        HttpClientTestingModule
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LeftSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
