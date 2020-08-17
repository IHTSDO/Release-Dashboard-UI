import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ReleaseCenterService } from '../../services/releaseCenter/release-center.service';
import { ProductService } from '../../services/product/product.service';
import { ReleaseCenter } from '../../models/releaseCenter';
import { ProductDataService } from '../../services/product/product-data.service';
import { ModalService } from '../../services/modal/modal.service';
import { trigger, state, style, keyframes, transition, animate } from '@angular/animations';
import { Product } from 'src/app/models/product';

@Component({
    selector: 'app-product-viewer',
    templateUrl: './product-viewer.component.html',
    styleUrls: ['./product-viewer.component.scss'],
    animations: [
        trigger('slide', [
            state('start', style({ opacity: 0, transform: 'translateY(200%)'})),
            state('end', style({ opacity: 0, transform: 'translateY(-200%)'})),
            transition('start <=> end', [
                animate('2000ms ease-in', keyframes([
                    style({opacity: 0, transform: 'translateY(200%)', offset: 0}),
                    style({opacity: 1, transform: 'translateY(0)', offset: 0.1}),
                    style({opacity: 1, transform: 'translateY(0)', offset: .8}),
                    style({opacity: 0, transform: 'translateY(-200%)', offset: 1.0})
                ]))
            ])
        ])
    ]
})
export class ProductViewerComponent implements OnInit, OnDestroy {

    private activeReleaseCenterSubscription: Subscription;

    activeReleaseCenter: ReleaseCenter;
    products: Product[];

    constructor(private releaseCenterService: ReleaseCenterService,
                private modalService: ModalService,
                private productService: ProductService,
                private productDataService: ProductDataService) {
        this.activeReleaseCenterSubscription = this.releaseCenterService.getActiveReleaseCenter().subscribe(data => {
            this.activeReleaseCenter = data;
            this.products = [];
            this.productDataService.clearCachedProducts();
            this.productService.getProducts(this.activeReleaseCenter.id).subscribe(products => {
                this.products = products;
                this.productDataService.cacheProducts(products);
            });
        });
    }

    ngOnInit(): void {
    }

    ngOnDestroy() {
        this.activeReleaseCenterSubscription.unsubscribe();
    }

    openModal(name) {
        this.modalService.open(name);
    }

    closeModal(name) {
        this.modalService.close(name);
    }
}
