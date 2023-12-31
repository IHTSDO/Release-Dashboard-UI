import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Pipe } from '@angular/core';

import { LeftSidebarComponent } from '../../components/left-sidebar/left-sidebar.component';
import { BuildViewerComponent } from '../../components/build-viewer/build-viewer.component';
import { ProductViewerComponent } from './product-viewer.component';
import { ModalComponent } from '../../components/modal/modal.component';

import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from '../../app-routing.module';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ProductViewerComponent', () => {
  let component: ProductViewerComponent;
  let fixture: ComponentFixture<ProductViewerComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [
        ProductViewerComponent,
        LeftSidebarComponent,
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
    fixture = TestBed.createComponent(ProductViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
