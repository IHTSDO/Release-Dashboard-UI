import { Component, Input, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ReleaseCenter, ReleaseCenterService } from '../../services/releaseCenter/release-center.service';
import { ProductService } from '../../services/product/product.service';
import { ReleaseServerService } from '../../services/releaseServer/release-server.service';

@Component({
    selector: 'app-product-viewer',
    templateUrl: './product-viewer.component.html',
    styleUrls: ['./product-viewer.component.scss']
})
export class ProductViewerComponent implements OnInit {

    @Input() activeReleaseCenter: ReleaseCenter;
    private activeReleaseCenterSubscription: Subscription;
    products: object;
    private productsSubscription: Subscription;

    constructor(private releaseCenterService: ReleaseCenterService,
                private productService: ProductService,
                private releaseService: ReleaseServerService) {
        this.activeReleaseCenterSubscription = this.releaseCenterService.getActiveReleaseCenter().subscribe(data => {
            this.activeReleaseCenter = data;
            this.releaseService.getProducts(this.activeReleaseCenter.id).subscribe(products => {
                this.productService.setProducts(products);
            });
        });
        this.productsSubscription = this.productService.getProducts().subscribe(data => {
            this.products = data;
        });
    }

    ngOnInit(): void {
        this.releaseService.getProducts(this.activeReleaseCenter.id).subscribe(products => {
            this.productService.setProducts(products);
        });
    }

}
