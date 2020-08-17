import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Product } from '../../models/product';
import { Build } from '../../models/build';
import { BuildService } from '../../services/build/build.service';
import { ProductService } from '../../services/product/product.service';
import { Observable, forkJoin } from 'rxjs';
import { ProductDataService } from '../../services/product/product-data.service';

@Component({
  selector: 'app-build-viewer',
  templateUrl: './build-viewer.component.html',
  styleUrls: ['./build-viewer.component.scss']
})
export class BuildViewerComponent implements OnInit {

    // params map
    releaseCenterKey: string;
    productKey: string;

    builds: Build[];

    activeProduct: Product;
    activeBuild: Build;

    // control properties
    buildLoading = false;

    constructor(private route: ActivatedRoute,
                private productService: ProductService,
                private productDataService: ProductDataService,
                private buildService: BuildService) {
    }

    ngOnInit(): void {
        this.activeBuild = new Build();

        this.route.paramMap.subscribe(paramMap => {
            this.productKey = paramMap['params']['productKey'];
            this.releaseCenterKey = paramMap['params']['releaseCenterKey'];

            this.loadProduct(this.productService, this.productDataService, this.releaseCenterKey, this.productKey).then(
                data => this.activeProduct = <Product> data
            );

            this.buildLoading = true;
            this.buildService.getBuilds(this.releaseCenterKey, this.productKey).subscribe(response => {
                this.builds = response;
                if (this.builds.length !== 0) {
                    this.setActiveBuild(this.builds[0]);
                } else {
                    this.buildLoading = false;
                }
            });
        });
    }

    setActiveBuild(build) {
        this.buildLoading = true;
        this.activeBuild = build;
        forkJoin([this.buildService.getBuildConfiguration(this.releaseCenterKey, this.productKey, build.id),
                  this.buildService.getQAConfiguration(this.releaseCenterKey, this.productKey, build.id)])
          .subscribe((response) => {
                this.buildLoading = false;
                this.activeBuild.configuration = response[0];
                this.activeBuild.qaTestConfig = response[1];
            }
        );
    }

    // find product from cache, other from server
    loadProduct(productService, productDataService, releaseCenterKey, productKey) {
        const promise = new Promise(function(resolve, reject) {
            const product = productDataService.findByKey(productKey);
            if (product) {
                resolve(product);
                return;
            }
            productService.getProduct(releaseCenterKey, productKey).subscribe(data => resolve(data));
        });

        return promise;
    }
}
