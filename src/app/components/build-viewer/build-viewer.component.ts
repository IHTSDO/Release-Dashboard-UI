import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Product } from '../../models/product';
import { Build } from '../../models/build';
import { BuildService } from '../../services/build/build.service';
import { ProductService } from '../../services/product/product.service';
import { forkJoin } from 'rxjs';
import { ProductDataService } from '../../services/product/product-data.service';
import { ModalService } from '../../services/modal/modal.service';
import { formatDate } from '@angular/common';
import { BuildParameters } from '../../models/buildParameters';
import { trigger, state, style, transition, animate, keyframes } from '@angular/animations';

@Component({
  selector: 'app-build-viewer',
  templateUrl: './build-viewer.component.html',
  styleUrls: ['./build-viewer.component.scss'],
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
export class BuildViewerComponent implements OnInit {
    @ViewChild('customRefsetCompositeKeys') private customRefsetCompositeKeysInput;

    RF2_DATE_FORMAT = 'yyyyMMdd';
    DATA_DOG_URL = 'https://app.datadoghq.com/dashboard/dm6-vs3-bz3/release-dashboard';

    // params map
    releaseCenterKey: string;
    productKey: string;

    builds: Build[];

    activeProduct: Product;
    activeBuild: Build;
    selectedBuild: Build;
    buildLog: string;

    // animations
    saved = 'start';
    saveResponse: string;

    // Build properties
    buildParams: BuildParameters;

    // Control flags and error handling flags
    action: string;
    errorMsg: string;
    buildLogErrorMsg: string;
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
                // Update Build Status in case the status has been changed
                if (this.activeBuild.id) {
                    const build = this.builds.find(b => b.id === this.activeBuild.id);
                    if (build) {
                        this.activeBuild.status = build.status;
                    }
                }
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

    viewRunningLog(build: Build) {
        const url = this.DATA_DOG_URL + '?live=true&from_ts=' + new Date(build.id).getTime()
                                        + '&tpl_var_Release_Center=' + this.releaseCenterKey;
        window.open(url);
    }

    viewLog(build: Build) {
        this.buildLogLoading = true;
        this.buildLog = '';
        this.buildLogErrorMsg = '';
        this.buildService.getBuildLog(this.releaseCenterKey, this.productKey, build.id).subscribe(
            data => {
                const blb = new Blob([data], {type: 'text/plain'});
                const reader = new FileReader();

                // This fires after the blob has been read/loaded.
                reader.addEventListener('loadend', (e) => {
                    this.buildLogLoading = false;
                    this.buildLog = <string> e.target['result'];
                });

                // Start reading the blob as text.
                reader.readAsText(blb);
            },
            errorResponse => {
                if (errorResponse.status === 404) {
                    this.buildLogErrorMsg = 'The build log not found.';
                } else {
                    this.buildLogErrorMsg = errorResponse.error.errorMessage;
                }
                this.buildLogLoading = false;
            }
        );
        this.openModal('view-build-log-modal');
    }

    viewBuildConfigurations(build: Build) {
        this.selectedBuild = build;
        forkJoin([this.buildService.getBuildConfiguration(this.releaseCenterKey, this.productKey, build.id),
            this.buildService.getQAConfiguration(this.releaseCenterKey, this.productKey, build.id)])
            .subscribe((response) => {
                this.selectedBuild.configuration = response[0];
                this.selectedBuild.qaTestConfig = response[1];
                if (response[0].customRefsetCompositeKeys) {
                    const value = this.convertCustomRefsetCompositeKeys(response[0].customRefsetCompositeKeys);
                    this.customRefsetCompositeKeysInput.nativeElement.value = value;
                } else {
                    this.customRefsetCompositeKeysInput.nativeElement.value = '';
                }
                this.openModal('view-build-configuration-modal');
            }
        );
    }

    downloadBuildLog(build: Build) {
        build.buildDownloadingLog = true;
        this.buildService.getBuildLog(this.releaseCenterKey, this.productKey, build.id).subscribe(
            data => {
                this.downLoadFile(data, 'text/plain', build.id + '.txt');
                build.buildDownloadingLog = false;
            },
            errorResponse => {
                if (errorResponse.status === 404) {
                    this.errorMsg = 'The build log not found.';
                } else {
                    this.errorMsg = errorResponse.error.errorMessage;
                }
                build.buildDownloadingLog = false;
            }
        );
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
                    this.errorMsg = 'The build package not found.';
                }
            } else {
                build.buildDownloadingPackage = false;
            }
        });
    }

    publishBuild(build: Build) {
        this.clearMessage();
        this.closeModal('publish-build-confirmation-modal');
        build.buildPublishing = true;
        this.openWaitingModel();
        this.buildService.publishBuild(this.releaseCenterKey, this.productKey, build.id).subscribe(
            () => {
                this.buildService.getBuild(this.releaseCenterKey, this.productKey, build.id).subscribe(response => {
                    build.tag = response.tag;
                    build.buildPublishing = false;
                    this.closeWaitingModel();
                });
            },
            errorResponse => {
                if (errorResponse.error.HTTPStatus === 504) {
                    this.errorMsg = 'Your publish operation is taking longer than expected, but will complete.';
                } else {
                    this.errorMsg = errorResponse.error.errorMessage;
                }
                build.buildPublishing = false;
                this.closeWaitingModel();
            }
        );
    }

    stopBuild(build: Build) {
        build.buildCanceling = true;
        this.closeModal('stop-build-confirmation-modal');
        this.openWaitingModel();
        this.buildService.stopBuild(this.releaseCenterKey, this.productKey, build.id).subscribe(
            () => {
                this.buildService.getBuild(this.releaseCenterKey, this.productKey, build.id).subscribe(response => {
                    build.buildCanceling = false;
                    const updatedBuild = this.builds.find(b => b.id === this.activeBuild.id);
                    if (updatedBuild) {
                        updatedBuild.status = response.status;
                        this.activeBuild.status = response.status;
                    }
                    this.closeWaitingModel();
                });
            },
            errorResponse => {
                this.errorMsg = errorResponse.error.errorMessage;
                build.buildCanceling = false;
                this.closeWaitingModel();
            }
        );
    }

    runBuild() {
        const missingFields = this.missingFieldsCheck();
        if (missingFields) {
            this.saveResponse = 'Missing Fields';
            this.saved = (this.saved === 'start' ? 'end' : 'start');
            return;
        }
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
        build.buildDeleting = true;
        this.openWaitingModel();
        this.closeModal('delete-confirmation-modal');
        this.buildService.deleteBuild(this.releaseCenterKey, this.productKey, build.id).subscribe(() => {
            this.activeBuild = new Build();
            this.loadBuilds();
            this.closeWaitingModel();
        },
        errorResponse => {
            build.buildDeleting = false;
            this.errorMsg = errorResponse.error.errorMessage;
            this.closeWaitingModel();
        });
    }

    openBuildModel(isNewBuild) {
        this.buildParams = new BuildParameters();
        if (isNewBuild) {
            this.buildParams.effectiveDate = null;
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

    private convertCustomRefsetCompositeKeys(customRefsetCompositeKeys) {
        let result = '';
        if (customRefsetCompositeKeys
            && Object.keys(customRefsetCompositeKeys).length !== 0) {
            const keys = Object.keys(customRefsetCompositeKeys);
            for (let index = 0; index < keys.length; index++) {
                if (index !== 0) {
                    result += '|';
                }
                result += keys[index] + '=' + customRefsetCompositeKeys[keys[index]].join();
            }
        }

        return result;
    }
    /**
     * Method is use to download file.
     * @param data - Array Buffer data
     * @param type - type of the document.
     */
    private downLoadFile(data: any, type: string, fileName: string) {
        const blob = new Blob([data], { type: type});
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
    }

    private missingFieldsCheck(): boolean {
        return !this.buildParams.effectiveDate || !this.buildParams.branch
                || !this.buildParams.exportType || !this.buildParams.maxFailureExport;
    }

    private clearMessage() {
        this.errorMsg = '';
    }

    private openWaitingModel() {
        if (this.activeBuild.buildDeleting) {
            this.action = 'Deleting Build';
        } else if (this.activeBuild.buildCanceling) {
            this.action = 'Canceling Build';
        } else if (this.activeBuild.buildPublishing) {
            this.action = 'Publishing Build';
        } else {
            this.action = '';
        }
        this.openModal('waiting-modal');
    }

    private closeWaitingModel() {
        this.closeModal('waiting-modal');
    }

    openModal(name) {
        this.modalService.open(name);
    }

    closeModal(name) {
        this.modalService.close(name);
    }
}
