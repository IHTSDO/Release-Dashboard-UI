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

    errorMsg: string;

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

    downloadBuildLog(build: Build) {
        build.downloadingBuildLog = true;
        this.buildService.getBuildLog(this.releaseCenterKey, this.productKey, build.id).subscribe(data => {
            this.downLoadFile(data, 'text/plain', build.id + '.txt');
            build.downloadingBuildLog = false;
        });
    }

    downloadBuildPackage(build: Build) {
        build.downloadingBuildPackage = true;
        this.buildService.listPackageOutputFiles(this.releaseCenterKey, this.productKey, build.id).subscribe(response  => {
            if (response) {
                const outputFiles = <object[]> response;
                let buildPackageFound = false;
                outputFiles.forEach( (element) => {
                    const url = <string> element['url'];
                    if (url.endsWith('.zip')) {
                        buildPackageFound = true;
                        const filename = url.split('/').pop();
                        this.buildService.getBuildPackage(this.releaseCenterKey, this.productKey, build.id, filename).subscribe(data => {
                            this.downLoadFile(data, 'application/zip', filename);
                            build.downloadingBuildPackage = false;
                        });
                        return;
                    }
                });

                if (!buildPackageFound) {
                    build.downloadingBuildPackage = false;
                }
            } else {
                build.downloadingBuildPackage = false;
            }
        });
    }

    /**
     * Method is use to download file.
     * @param data - Array Buffer data
     * @param type - type of the document.
     */
    downLoadFile(data: any, type: string, fileName: string) {
        const blob = new Blob([data], { type: type});
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
    }

    publishBuild(build: Build) {
        build.publishingBuild = true;
        this.errorMsg = '';
        this.buildService.publishBuild(this.releaseCenterKey, this.productKey, build.id).subscribe(
          () => {
              build.tag = 'PUBLISHED';
              build.publishingBuild = false;
          },
          errorResponse => {
              this.errorMsg = errorResponse.error.errorMessage;
              build.publishingBuild = false;
          }
        );
    }
}
