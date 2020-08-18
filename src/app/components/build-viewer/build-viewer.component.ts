import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Product } from '../../models/product';
import { Build } from '../../models/build';
import { BuildService } from '../../services/build/build.service';
import { ProductService } from '../../services/product/product.service';
import { Observable, forkJoin } from 'rxjs';
import { ProductDataService } from '../../services/product/product-data.service';
import { ModalService } from '../../services/modal/modal.service';
import { formatDate } from '@angular/common';
import { BuildParameters } from '../../models/buildParameters';

@Component({
  selector: 'app-build-viewer',
  templateUrl: './build-viewer.component.html',
  styleUrls: ['./build-viewer.component.scss']
})
export class BuildViewerComponent implements OnInit {
    RF2_DATE_FORMAT = 'yyyyMMdd';

    // params map
    releaseCenterKey: string;
    productKey: string;

    builds: Build[];

    activeProduct: Product;
    activeBuild: Build;
    buildLog: string;

    // Build properties
    buildParams: BuildParameters;

    errorMsg: string;
    buildTriggering = false;
    buildsLoading = false;
    buildLogLoading = false;

    constructor(private route: ActivatedRoute,
                private modalService: ModalService,
                private productService: ProductService,
                private productDataService: ProductDataService,
                private buildService: BuildService) {
    }

    ngOnInit(): void {
        this.activeBuild = new Build();
        this.buildParams = new BuildParameters();

        this.route.paramMap.subscribe(paramMap => {
            this.productKey = paramMap['params']['productKey'];
            this.releaseCenterKey = paramMap['params']['releaseCenterKey'];

            this.loadProduct(this.productService, this.productDataService, this.releaseCenterKey, this.productKey).then(
                data => this.activeProduct = <Product> data
            );
            this.loadBuilds();
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

    loadBuilds() {
        this.buildsLoading = true;
        this.buildService.getBuilds(this.releaseCenterKey, this.productKey).subscribe(response => {
                this.builds = response;
                this.buildsLoading = false;
            },
            errorResponse => {
                this.errorMsg = errorResponse.error.errorMessage;
                this.buildsLoading = false;
            }
        );
    }

    setActiveBuild(build) {
        this.clearMessage();
        this.activeBuild = build;
        this.activeBuild.buildLoading = true;
        forkJoin([this.buildService.getBuildConfiguration(this.releaseCenterKey, this.productKey, build.id),
                  this.buildService.getQAConfiguration(this.releaseCenterKey, this.productKey, build.id)])
          .subscribe((response) => {
                this.activeBuild.buildLoading = false;
                this.activeBuild.configuration = response[0];
                this.activeBuild.qaTestConfig = response[1];
            }
        );
    }

    viewLog(build: Build) {
        this.buildLogLoading = true;
        this.buildLog = '';
        this.buildService.getBuildLog(this.releaseCenterKey, this.productKey, build.id).subscribe(data => {
            const blb = new Blob([data], {type: 'text/plain'});
            const reader = new FileReader();

            // This fires after the blob has been read/loaded.
            reader.addEventListener('loadend', (e) => {
                this.buildLogLoading = false;
                this.buildLog = <string> e.target['result'];
            });

            // Start reading the blob as text.
            reader.readAsText(blb);
        });
        this.openModal('view-build-log-modal');
    }

    downloadBuildLog(build: Build) {
        build.buildDownloadingLog = true;
        this.buildService.getBuildLog(this.releaseCenterKey, this.productKey, build.id).subscribe(data => {
            this.downLoadFile(data, 'text/plain', build.id + '.txt');
            build.buildDownloadingLog = false;
        });
    }

    downloadBuildPackage(build: Build) {
        build.buildDownloadingPackage = true;
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
                            build.buildDownloadingPackage = false;
                        });
                        return;
                    }
                });

                if (!buildPackageFound) {
                    build.buildDownloadingPackage = false;
                }
            } else {
                build.buildDownloadingPackage = false;
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

    clearMessage() {
        this.errorMsg = '';
    }

    publishBuild(build: Build) {
        this.clearMessage();
        this.closeModal('publish-build-confirmation-modal');
        build.buildPublishing = true;
        this.buildService.publishBuild(this.releaseCenterKey, this.productKey, build.id).subscribe(
          () => {
              build.tag = 'PUBLISHED';
              build.buildPublishing = false;
          },
          errorResponse => {
              this.errorMsg = errorResponse.error.errorMessage;
              build.buildPublishing = false;
          }
        );
    }

    stopBuild(build: Build) {
        this.closeModal('stop-build-confirmation-modal');
        build.buildCanceling = true;
        this.buildService.stopBuild(this.releaseCenterKey, this.productKey, build.id).subscribe(
            () => {
                build.buildCanceling = false;
                this.buildsLoading = true;
                this.buildService.getBuilds(this.releaseCenterKey, this.productKey).subscribe(response => {
                    this.builds = response;
                    this.buildsLoading = false;
                    const updatedBuild = this.builds.find(b => b.id = this.activeBuild.id);
                    if (updatedBuild) {
                        this.activeBuild.status = updatedBuild.status;
                    }
                });
            },
            errorResponse => {
                this.errorMsg = errorResponse.error.errorMessage;
                build.buildCanceling = false;
            }
        );
    }

    runBuild() {
        this.clearMessage();
        this.buildTriggering = true;
        const formattedeffectiveDate = formatDate(this.buildParams.effectiveDate, this.RF2_DATE_FORMAT, 'en-US');
        this.buildService.runBuild(this.releaseCenterKey,
                                  this.productKey,
                                  this.buildParams.branch,
                                  this.buildParams.exportType,
                                  this.buildParams.maxFailureExport,
                                  formattedeffectiveDate).subscribe(
            () => {
                this.closeModal('build-modal');
                this.buildsLoading = true;
                this.buildService.getBuilds(this.releaseCenterKey, this.productKey).subscribe(response => {
                    this.builds = response;
                    this.buildsLoading = false;
                    this.buildTriggering = false;
                });
            },
            errorResponse => {
                this.buildTriggering = false;
                this.errorMsg = errorResponse.error.errorMessage;
            }
        );
    }

    deleteBuild(build: Build) {
        this.clearMessage();
        this.closeModal('delete-confirmation-modal');
        build.buildDeleting = true;
        this.buildService.deleteBuild(this.releaseCenterKey, this.productKey, build.id).subscribe(() => {
            this.activeBuild = new Build();
            this.loadBuilds();
        },
        errorResponse => {
            build.buildDeleting = false;
            this.errorMsg = errorResponse.error.errorMessage;
        });
    }

    openBuildModel(isNewBuild) {
        this.buildParams = new BuildParameters();
        if (isNewBuild) {
            this.buildParams.branch = 'MAIN';
            this.buildParams.exportType = 'PUBLISHED';
            this.buildParams.maxFailureExport = 100;
        } else {
            const buildConfiguration = this.activeBuild.configuration;
            const qaTestConfig = this.activeBuild.qaTestConfig;
            this.buildParams.effectiveDate = new Date(buildConfiguration.effectiveTime);
            this.buildParams.branch = buildConfiguration.branchPath ? buildConfiguration.branchPath : 'MAIN';
            this.buildParams.exportType = buildConfiguration.exportType ? buildConfiguration.exportType : 'PUBLISHED';
            this.buildParams.maxFailureExport = qaTestConfig.maxFailureExport ? qaTestConfig.maxFailureExport : 100;
        }
        this.openModal('build-modal');
    }

    openModal(name) {
        this.modalService.open(name);
    }

    closeModal(name) {
        this.modalService.close(name);
    }
}
