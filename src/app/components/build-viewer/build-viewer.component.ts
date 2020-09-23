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
import { ExtensionConfig } from '../../models/extensionConfig';
import { BuildStateEnum } from '../../models/buildStateEnum';

@Component({
  selector: 'app-build-viewer',
  templateUrl: './build-viewer.component.html',
  styleUrls: ['./build-viewer.component.scss']
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
    message: string;
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
        this.selectedBuild = new Build();
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
        this.clearMessage();
        this.buildService.getBuilds(this.releaseCenterKey, this.productKey).subscribe(response => {
                this.builds = response;
                // Update Build Status in case the status has been changed
                if (this.activeBuild.id) {
                    const build = this.builds.find(b => b.id === this.activeBuild.id);
                    if (build) {
                        this.activeBuild.status = build.status;
                    }
                }
            },
            errorResponse => {
                this.buildsLoading = false;
                this.message = errorResponse.error.errorMessage;
                this.openErrorModel();
            },
            () => {
                this.buildsLoading = false;
            }
        );
    }

    setActiveBuild(build) {
        this.clearMessage();
        this.activeBuild = build;
    }

    viewRunningLog(build: Build) {
        const url = this.DATA_DOG_URL + '?live=true'
                                        + '&tpl_var_Release_Center=' + this.releaseCenterKey
                                        + '&tpl_var_Product_Key=' + this.productKey
                                        + '&tpl_var_Build_ID=' + build.id;
        window.open(url);
    }

    viewLog(build: Build) {
        this.buildLogLoading = true;
        this.buildLog = '';
        this.clearMessage();
        this.buildService.getBuildLog(this.releaseCenterKey, this.productKey, build.id).subscribe(
            data => {
                const blb = new Blob([data], {type: 'text/plain'});
                const reader = new FileReader();

                // This fires after the blob has been read/loaded.
                reader.addEventListener('loadend', (e) => {
                    this.buildLog = <string> e.target['result'];
                });

                // Start reading the blob as text.
                reader.readAsText(blb);
            },
            errorResponse => {
                this.buildLogLoading = false;
                if (errorResponse.status === 404) {
                    this.message = 'The log file was not found';
                    if (BuildStateEnum.BUILDING === build.status
                        || BuildStateEnum.BEFORE_TRIGGER === build.status) {
                        this.message += ' due to the build is running.';
                    } else if (BuildStateEnum.CANCEL_REQUESTED === build.status) {
                        this.message += ' due to the build is being canceled.';
                    } else {
                        this.message += '.';
                    }
                } else {
                    this.message = errorResponse.error.errorMessage;
                }
                this.closeBuildLogModal();
                this.openErrorModel();
            },
            () => {
                this.buildLogLoading = false;
            }
        );

        this.openBuildLogModal();
    }

    viewBuildConfigurations(build: Build) {
        this.selectedBuild = build;
        if (!this.selectedBuild.configuration.extensionConfig) {
            this.selectedBuild.configuration.extensionConfig = new ExtensionConfig();
        }
        if (this.selectedBuild.configuration.customRefsetCompositeKeys
            && Object.keys(this.selectedBuild.configuration.customRefsetCompositeKeys).length !== 0) {
            const value = this.convertCustomRefsetCompositeKeys(this.selectedBuild.configuration.customRefsetCompositeKeys);
            setTimeout(() => {
                this.customRefsetCompositeKeysInput.nativeElement.value = value;
            }, 0);
        } else {
            setTimeout(() => {
                this.customRefsetCompositeKeysInput.nativeElement.value = '';
            }, 0);
        }
        this.openBuildConfigurationModal();
    }

    downloadBuildLog(build: Build) {
        build.buildDownloadingLog = true;
        this.clearMessage();
        this.buildService.getBuildLog(this.releaseCenterKey, this.productKey, build.id).subscribe(
            data => {
                this.downLoadFile(data, 'text/plain', build.id + '.txt');
                build.buildDownloadingLog = false;
            },
            errorResponse => {
                build.buildDownloadingLog = false;
                if (errorResponse.status === 404) {
                    this.message = 'The build log was not found';
                    if (BuildStateEnum.BUILDING === build.status
                        || BuildStateEnum.BEFORE_TRIGGER === build.status) {
                        this.message += ' due to the build is running.';
                    } else if (BuildStateEnum.CANCEL_REQUESTED === build.status) {
                        this.message += ' due to the build is being canceled.';
                    } else {
                        this.message += '.';
                    }
                } else {
                    this.message = errorResponse.error.errorMessage;
                }
                this.openErrorModel();
            }
        );
    }

    downloadBuildPackage(build: Build) {
        build.buildDownloadingPackage = true;
        this.clearMessage();
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
                    this.message = 'The build package was not found';
                    if (BuildStateEnum.BUILDING === build.status
                        || BuildStateEnum.BEFORE_TRIGGER === build.status) {
                        this.message += ' due to the build is running.';
                    } else if (BuildStateEnum.BUILT !== build.status) {
                        this.message += ' due to the build failed to complete.';
                    } else {
                        this.message += '.';
                    }
                    this.openErrorModel();
                }
            } else {
                build.buildDownloadingPackage = false;
            }
        });
    }

    publishBuild(build: Build) {
        this.clearMessage();
        this.closePublishingBuildConfirmationModal();
        build.buildPublishing = true;
        this.openWaitingModel();
        this.buildService.publishBuild(this.releaseCenterKey, this.productKey, build.id).subscribe(
            () => {
                this.buildService.getBuild(this.releaseCenterKey, this.productKey, build.id).subscribe(response => {
                    build.buildPublishing = false;
                    build.tag = response.tag;
                    this.closeWaitingModel();
                    this.message = 'The build has been published successfully.';
                    this.openSuccessModel();
                });
            },
            errorResponse => {
                build.buildPublishing = false;
                if (errorResponse.status === 504) {
                    this.message = 'Your publish operation is taking longer than expected, but will complete.';
                } else {
                    this.message = errorResponse.error.errorMessage;
                }
                this.closeWaitingModel();
                this.openErrorModel();
            }
        );
    }

    stopBuild(build: Build) {
        build.buildCanceling = true;
        this.closeCancalingBuildConfirmationModal();
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
                    this.message = 'The build has been canceled successfully.';
                    this.openSuccessModel();
                });
            },
            errorResponse => {
                this.message = errorResponse.error.errorMessage;
                build.buildCanceling = false;
                this.closeWaitingModel();
                this.openErrorModel();
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
                                  this.buildParams.buildName,
                                  this.buildParams.branch,
                                  this.buildParams.exportType,
                                  this.buildParams.maxFailureExport,
                                  formattedeffectiveDate).subscribe(
            () => {
                this.closeBuildModal();
                this.buildsLoading = true;
                setTimeout(() => {
                    this.buildService.getBuilds(this.releaseCenterKey, this.productKey).subscribe(response => {
                        this.builds = response;
                        this.buildsLoading = false;
                        this.buildTriggering = false;
                    });
                }, 2000);
                this.message = 'The build has been triggered successfully.';
                this.openSuccessModel();
            },
            errorResponse => {
                this.buildTriggering = false;
                this.saveResponse = errorResponse.error.errorMessage;
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
            this.message = 'The build ' + build.id + ' has been deleted successfully.';
            this.openSuccessModel();
        },
        errorResponse => {
            build.buildDeleting = false;
            this.message = errorResponse.error.errorMessage;
            this.closeWaitingModel();
            this.openErrorModel();
        });
    }

    doOpeningBuildModal(isNewBuild) {
        this.buildParams = new BuildParameters();
        if (isNewBuild) {
            if (this.activeProduct.buildConfiguration) {
                if (this.activeProduct.buildConfiguration.effectiveTime) {
                    this.buildParams.effectiveDate = this.activeProduct.buildConfiguration.effectiveTime;
                } else {
                    this.buildParams.effectiveDate = null;
                }
                if (this.activeProduct.buildConfiguration.defaultBranchPath) {
                    this.buildParams.branch = this.activeProduct.buildConfiguration.defaultBranchPath;
                } else {
                    this.buildParams.branch = 'MAIN';
                }
            } else {
                this.buildParams.effectiveDate = null;
                this.buildParams.branch = 'MAIN';
            }
            this.buildParams.exportType = 'PUBLISHED';
            this.buildParams.maxFailureExport = 100;
        } else {
            const buildConfiguration = this.activeBuild.configuration;
            const qaTestConfig = this.activeBuild.qaTestConfig;
            this.buildParams.effectiveDate = new Date(buildConfiguration.effectiveTime);
            if (buildConfiguration.branchPath) {
                this.buildParams.branch = buildConfiguration.branchPath;
            } else {
                if (this.activeProduct.buildConfiguration.defaultBranchPath) {
                    this.buildParams.branch = this.activeProduct.buildConfiguration.defaultBranchPath;
                } else {
                    this.buildParams.branch = 'MAIN';
                }
            }
            this.buildParams.exportType = buildConfiguration.exportType ? buildConfiguration.exportType : 'PUBLISHED';
            this.buildParams.maxFailureExport = qaTestConfig.maxFailureExport ? qaTestConfig.maxFailureExport : 100;
        }
        this.openBuildModal();
    }

    openRvfReport(build: Build) {
        window.open(build.rvfURL);
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
                || !this.buildParams.exportType || !this.buildParams.maxFailureExport
                || !this.buildParams.buildName;
    }

    private clearMessage() {
        this.message = '';
        this.saveResponse = '';
    }

    private openSuccessModel() {
        this.openModal('build-success-modal');
    }

    private openErrorModel() {
        this.openModal('build-error-modal');
    }

    private closePublishingBuildConfirmationModal() {
        this.closeModal('publish-build-confirmation-modal');
    }

    private closeCancalingBuildConfirmationModal() {
        this.closeModal('stop-build-confirmation-modal');
    }

    private openBuildModal() {
        this.openModal('build-modal');
    }

    private closeBuildModal() {
        this.closeModal('build-modal');
    }

    private openBuildLogModal() {
        this.openModal('view-build-log-modal');
    }

    private closeBuildLogModal() {
        this.closeModal('view-build-log-modal');
    }

    private openBuildConfigurationModal() {
        this.openModal('view-build-configuration-modal');
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
