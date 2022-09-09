import { Component, OnInit, ViewChild, OnDestroy, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Product } from '../../models/product';
import { Build } from '../../models/build';
import { BuildService } from '../../services/build/build.service';
import { ProductService } from '../../services/product/product.service';
import { ProductDataService } from '../../services/product/product-data.service';
import { ModalService } from '../../services/modal/modal.service';
import { formatDate } from '@angular/common';
import { BuildParameters } from '../../models/buildParameters';
import { ExtensionConfig } from '../../models/extensionConfig';
import { BuildStateEnum } from '../../models/buildStateEnum';
import { BuildTagEnum } from '../../models/buildTagEnum';
import { EnvService } from '../../services/environment/env.service';
import { PermissionService } from '../../services/permission/permission.service';
import { ReleaseCenter } from '../../models/releaseCenter';
import { ReleaseCenterService } from '../../services/releaseCenter/release-center.service';
import { ReleaseServerService } from '../../services/releaseServer/release-server.service';
import { WebsocketService } from '../../services/websocket/websocket.service';
import { ProductPaginationService } from '../../services/pagination/product-pagination.service';
import { RVFServerService } from 'src/app/services/rvfServer/rvf-server.service';
import { FailureJiraAssociation } from 'src/app/models/failureJiraAssociation';

@Component({
  selector: 'app-build-viewer',
  templateUrl: './build-viewer.component.html',
  styleUrls: ['./build-viewer.component.scss']
})
export class BuildViewerComponent implements OnInit, OnDestroy {
    @ViewChild('customRefsetCompositeKeys') private customRefsetCompositeKeysInput;
    @ViewChild('uploadInputFilesInput') private uploadInputFilesInput;

    RF2_DATE_FORMAT = 'yyyyMMdd';
    DATA_DOG_URL = 'https://app.datadoghq.com/dashboard/dm6-vs3-bz3/release-dashboard';

    // params map
    releaseCenterKey: string;
    productKey: string;
    roles: Object;

    builds: Build[]; // the builds used by UI
    hiddenBuilds: Build[]; // hold all hidden builds from server
    localInputFiles: FileList;

    activeProduct: Product;
    activeReleaseCenter: ReleaseCenter;
    activeBuild: Build;
    selectedBuild: Build;
    buildLog: string;
    selectedTags: object;
    environment: string;
    view: string;

    // Build properties
    buildParams: BuildParameters;

    interval: any;

    // Control flags and error handling flags
    action: string;
    message: string;
    rvfReportLoading = false;
    buildTriggering = false;
    buildsLoading = false;
    hiddenBuildsLoading = false;
    buildLogLoading = false;
    useLocalInputFiles = false;
    allTags: object;

    // pagination
    pageSize: Number;
    pageNumber: Number;
    totalBuild = Number;

    // RVF report
    rvfFailures: object[];
    failureJiraAssociations: FailureJiraAssociation[];

    constructor(private route: ActivatedRoute,
                private modalService: ModalService,
                private productService: ProductService,
                private productDataService: ProductDataService,
                private releaseCenterService: ReleaseCenterService,
                private releaseServerService: ReleaseServerService,
                private buildService: BuildService,
                private permissionService: PermissionService,
                private envService: EnvService,
                private websocketService: WebsocketService,
                private paginationService: ProductPaginationService,
                private rvfServerService: RVFServerService) {
    }

    ngOnInit(): void {
        this.view = 'DEFAULT';
        this.environment = this.envService.env;
        this.roles = this.permissionService.roles;
        this.activeBuild = new Build();
        this.selectedBuild = new Build();
        this.buildParams = new BuildParameters();
        this.selectedTags = new Object();
        this.pageNumber = this.paginationService.DEFAULT_PAGE_NUMBER;
        this.pageSize = this.paginationService.DEFAULT_PAGE_SIZE;
        this.allTags = Object.keys(BuildTagEnum).map(key => ({ label: BuildTagEnum[key], value: key }));

        this.route.paramMap.subscribe(paramMap => {
            this.productKey = paramMap['params']['productKey'];
            this.releaseCenterKey = paramMap['params']['releaseCenterKey'];

            this.loadProduct(this.productService, this.productDataService, this.releaseCenterKey, this.productKey).then(
                data => this.activeProduct = <Product> data
            );

            this.loadReleaseCenter(this.releaseCenterService, this.releaseServerService, this.releaseCenterKey).then(
                data => this.activeReleaseCenter = <ReleaseCenter> data
            );
            this.loadBuilds();
        });

        this.websocketService.messageEvent.addListener('build-status-change-event', (message) => {
            this.updateBuildStatus(JSON.parse(message.body));
        });
    }

    ngOnDestroy(): void {
        if (this.interval) {
            clearInterval(this.interval);
        }

        this.websocketService.messageEvent.removeListener('build-status-change-event', () => {});
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

    // find release center from cache, other from server
    loadReleaseCenter(releaseCenterService, releaseServerService, releaseCenterKey) {
        const promise = new Promise(function(resolve, reject) {
            const product = releaseCenterService.findReleaseCenterByKey(releaseCenterKey);
            if (product) {
                resolve(product);
                return;
            }
            releaseServerService.getCenter(releaseCenterKey).subscribe(data => resolve(data));
        });

        return promise;
    }

    handlePageChange(event) {
        this.pageNumber = event;
        this.loadBuilds();
    }

    loadBuilds() {
        this.buildsLoading = true;
        this.builds = [];
        this.clearMessage();
        this.buildService.getBuilds(this.releaseCenterKey, this.productKey,
                                    true, true, true, this.view, this.pageNumber, this.pageSize).subscribe(response => {
                this.builds = response['content'];
                this.totalBuild = response['totalElements'];
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
                if (this.message && (this.message.includes('Build configuration file is missing')
                                    || this.message.includes('QA Configuration file is missing'))) {
                    this.message += ' Please contact technical support to get help resolving this.';
                }
                this.openErrorModel();
            },
            () => {
                this.buildsLoading = false;
            }
        );
    }

    loadHiddenBuilds() {
        this.hiddenBuildsLoading = true;
        this.hiddenBuilds = [];
        this.clearMessage();
        this.buildService.getBuilds(this.releaseCenterKey, this.productKey,
                                    true, false, false, 'ALL_RELEASES', 1, 100).subscribe(response => {
                this.hiddenBuilds = response['content'];
            },
            errorResponse => {
                this.buildsLoading = false;
                this.message = errorResponse.error.errorMessage;
                this.openErrorModel();
            },
            () => {
                this.hiddenBuildsLoading = false;
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
                    this.message = 'The log isn\'t available';
                    if (BuildStateEnum.BUILDING === build.status
                        || BuildStateEnum.BEFORE_TRIGGER === build.status
                        || BuildStateEnum.RVF_RUNNING === build.status) {
                            this.message += ' whilst the build is running. Please press View Process button to see the live logging';
                    } else if (BuildStateEnum.CANCEL_REQUESTED === build.status) {
                        this.message += ' due to the build is being canceled. Please wait until the status changes to Cancelled';
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
                    this.message = 'The log file isn\'t available';
                    if (BuildStateEnum.BUILDING === build.status
                        || BuildStateEnum.BEFORE_TRIGGER === build.status
                        || BuildStateEnum.RVF_RUNNING === build.status) {
                        this.message += ' whilst the build is running. Please press View Process button to see the live logging';
                    } else if (BuildStateEnum.CANCEL_REQUESTED === build.status) {
                        this.message += ' due to the build is being canceled. Please wait until the status changes to Cancelled';
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
                    this.message = 'The package isn\'t available';
                    if (BuildStateEnum.BUILDING === build.status
                        || BuildStateEnum.BEFORE_TRIGGER === build.status) {
                        this.message += ' whilst the build is running. Please wait.';
                    } else if (BuildStateEnum.RELEASE_COMPLETE !== build.status &&
                                BuildStateEnum.RELEASE_COMPLETE_WITH_WARNINGS !== build.status) {
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

    downloadMd5(build: Build) {
        this.clearMessage();
        this.buildService.listPackageOutputFiles(this.releaseCenterKey, this.productKey, build.id).subscribe(response  => {
            if (response) {
                const outputFiles = <object[]> response;
                let md5FileFound = false;
                outputFiles.forEach( (element) => {
                    const url = <string> element['url'];
                    if (url.endsWith('.md5')) {
                        md5FileFound = true;
                        const filename = url.split('/').pop();
                        this.buildService.getBuildPackage(this.releaseCenterKey, this.productKey, build.id, filename).subscribe(data => {
                            this.downLoadFile(data, 'application/zip', filename);
                        });
                        return;
                    }
                });

                if (!md5FileFound) {
                    this.message = 'The MD5 file isn\'t available';
                    if (BuildStateEnum.BUILDING === build.status
                        || BuildStateEnum.BEFORE_TRIGGER === build.status) {
                        this.message += ' whilst the build is running. Please wait.';
                    } else if (BuildStateEnum.RELEASE_COMPLETE !== build.status &&
                                BuildStateEnum.RELEASE_COMPLETE_WITH_WARNINGS !== build.status) {
                        this.message += ' due to the build failed to complete.';
                    } else {
                        this.message += '.';
                    }
                    this.openErrorModel();
                }
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
                const interval = setInterval(() => {
                    this.buildService.getPublishingBuildStatus(this.releaseCenterKey, this.productKey, build.id).subscribe(
                        status => {
                            if (status) {
                                if (status['status'] === 'COMPLETED') {
                                    this.buildService.getBuild(this.releaseCenterKey, this.productKey, build.id).subscribe(response => {
                                        build.buildPublishing = false;
                                        build.tags = response.tags;
                                        this.closeWaitingModel();
                                        if (status['message']) {
                                            this.message = status['message'];
                                            this.message += '.\nPlease contact technical support to get help resolving this.';
                                            this.openErrorModel();
                                        } else {
                                            this.message = 'The build has been published successfully.';
                                            this.openSuccessModel();
                                        }
                                    });
                                    clearInterval(interval);
                                } else if (status['status'] === 'FAILED') {
                                    build.buildPublishing = false;
                                    this.message = status['message'];
                                    this.closeWaitingModel();
                                    this.openErrorModel();
                                    clearInterval(interval);
                                } else {
                                    // do nothing
                                }
                            }
                        },
                        errorResponse => {
                            if (errorResponse.status === 404) {
                                this.buildService.getBuild(this.releaseCenterKey, this.productKey, build.id).subscribe(response => {
                                    build.buildPublishing = false;
                                    build.tags = response.tags;
                                    this.closeWaitingModel();
                                });
                            } else {
                                this.message = errorResponse.error.errorMessage;
                                this.closeWaitingModel();
                                this.openErrorModel();
                            }
                            clearInterval(interval);
                        }
                    );
                }, 10000);
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

    selectInputFiles(files: FileList) {
        this.localInputFiles = files;
    }

    runBuild() {
        this.clearMessage();
        const missingFields = this.missingFieldsCheck();
        if (missingFields.length !== 0) {
            this.message = 'Please enter the following fields: ' + missingFields.join(', ') + '.';
            this.openErrorModel();
            return;
        }
        this.clearMessage();
        this.buildTriggering = true;
        const formattedEffectiveDate = formatDate(this.buildParams.effectiveDate, this.RF2_DATE_FORMAT, 'en-US');
        this.closeBuildModal();
        if (this.useLocalInputFiles) {
            this.buildService.createBuild(this.releaseCenterKey,
                        this.productKey,
                        this.buildParams.buildName,
                        formattedEffectiveDate,
                        this.buildParams.replaceExistingEffectiveTime,
                        this.buildParams.maxFailureExport
                        ).subscribe((response) => {
                this.openWaitingModel('Uploading input files');
                this.uploadInputFiles(this.releaseCenterKey,
                    this.productKey,
                    response.id,
                    this.buildService,
                    this.localInputFiles).then(() => {
                    this.buildService.scheduleBuild(this.releaseCenterKey, this.productKey, response.id, ).subscribe(() => {
                        this.buildService.getBuild(this.releaseCenterKey, this.productKey, response.id).subscribe(
                            () => {
                                this.loadBuilds();
                                this.buildTriggering = false;
                                this.message = 'The build has been successfully initiated.';
                                this.closeWaitingModel();
                                this.openSuccessModel();
                            }
                        );
                    });

                },
                errorResponse => {
                    this.loadBuilds();
                    this.buildTriggering = false;
                    if (errorResponse.status === 413 ||
                        (errorResponse.error && errorResponse.error.errorMessage && errorResponse.error.errorMessage.includes('Maximum upload size exceeded'))) {
                        this.message = 'Your local input files are too large. Please delete the newly created build and re-upload files smaller than 500MB.';
                    } else {
                        this.message = errorResponse.message;
                    }
                    this.openErrorModel();
                    this.closeWaitingModel();
                });
            },
            errorResponse => {
                this.message = errorResponse.error.errorMessage;
                if (this.message.includes('No manifest file found for product')) {
                    this.message += '. Please upload it.';
                }
                this.openErrorModel();
            });
        } else {
            this.openWaitingModel('Initiating build');
            this.buildService.runBuild(this.releaseCenterKey,
                                      this.productKey,
                                      this.buildParams.buildName,
                                      this.buildParams.branch,
                                      this.buildParams.exportType,
                                      this.buildParams.maxFailureExport,
                                      formattedEffectiveDate,
                                      this.buildParams.excludedModuleIds,
                                      this.buildParams.enableTraceabilityValidation).subscribe(
                build => {
                    this.buildService.getBuild(this.releaseCenterKey, this.productKey, build.id).subscribe(
                        () => {
                            this.loadBuilds();
                            this.buildTriggering = false;
                            this.message = 'The build has been successfully initiated.';
                            this.closeWaitingModel();
                            this.openSuccessModel();
                        }
                    );
                },
                errorResponse => {
                    this.buildTriggering = false;
                    this.closeWaitingModel();
                    this.message = errorResponse.error.errorMessage;
                    if (this.message.includes('No manifest file found for product')) {
                        this.message += '. Please upload it.';
                    }
                    this.openErrorModel();
                }
            );
        }
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
        this.clearMessage();
        this.buildParams = new BuildParameters();
        this.useLocalInputFiles = false;
        this.localInputFiles = null;
        setTimeout(() => {
            if (this.uploadInputFilesInput && this.uploadInputFilesInput.nativeElement) {
                this.uploadInputFilesInput.nativeElement.value = '';
            }
        }, 0);
        if (isNewBuild) {
            if (this.activeProduct.buildConfiguration) {
                if (this.activeProduct.buildConfiguration.effectiveTime) {
                    this.buildParams.effectiveDate = new Date(this.activeProduct.buildConfiguration.effectiveTime);
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
                this.useLocalInputFiles = true;
                if (this.activeProduct.buildConfiguration.defaultBranchPath) {
                    this.buildParams.branch = this.activeProduct.buildConfiguration.defaultBranchPath;
                } else {
                    this.buildParams.branch = 'MAIN';
                }
            }
            this.buildParams.exportType = buildConfiguration.exportType ? buildConfiguration.exportType : 'PUBLISHED';
            this.buildParams.maxFailureExport = qaTestConfig.maxFailureExport ? qaTestConfig.maxFailureExport : 100;
            this.buildParams.enableTraceabilityValidation = qaTestConfig.enableTraceabilityValidation ?
                                                            qaTestConfig.enableTraceabilityValidation : false;
        }
        this.openBuildModal();
    }

    loadRvfReport(build: Build) {
        this.rvfFailures = [];
        this.rvfReportLoading = true;
        if (build.rvfURL.startsWith('https')) {
            this.rvfServerService.getRVFReport(this.getRVFRunId(build.rvfURL), this.getRVFStorageLocation(build.rvfURL)).subscribe(
            (rvfReport) => {
                if (rvfReport['status'] === 'COMPLETE') {
                    this.rvfFailures = rvfReport['rvfValidationResult']['TestResult']['assertionsFailed']
                                .concat(rvfReport['rvfValidationResult']['TestResult']['assertionsWarning']);
                    this.rvfFailures = this.rvfFailures.filter(item => item['assertionUuid']);
                }
                this.rvfReportLoading = false;
            }, () => {
                this.rvfReportLoading = false;
            });
        } else {
            this.message = build.rvfURL;
            this.rvfReportLoading = false;
            this.openErrorModel();
        }
    }

    openRvfReport(build: Build) {
        if (build.rvfURL.startsWith('https')) {
            window.open(build.rvfURL);
        } else {
            this.message = build.rvfURL;
            this.openErrorModel();
        }
    }

    validateFailuresSelection() {
        const selectedFailures = this.rvfFailures.filter(failure => {
            return failure['checked'];
        });
        if (selectedFailures.length === 0) {
            this.message = 'No selected failures.';
            this.openErrorModel();
        } else {
            this.openModal('jira-generation-confirmation-modal');
        }
    }

    generateJiraTickets() {
        this.closeModal('jira-generation-confirmation-modal');
        const selectedFailures = this.rvfFailures.filter(failure => {
            return failure['checked'];
        });
        if (selectedFailures.length !== 0) {
            this.openWaitingModel('Generating JIRA tickets');
            const assertionIds = [];
            for (let i = 0; i < selectedFailures.length; i++) {
                assertionIds.push(selectedFailures[i]['assertionUuid']);
            }

            this.buildService.generateJiraTickets(this.releaseCenterKey, this.productKey, this.activeBuild.id, assertionIds).subscribe(
                (response) => {
                    this.closeWaitingModel();
                    this.message = response.length + ' JIRA ticket(s) have been created successfully';
                    this.openSuccessModel();
                    this.getFailureJiraAssociations();
                },
                errorResponse => {
                    this.message = errorResponse.error.errorMessage;
                    this.closeWaitingModel();
                    this.openErrorModel();
                }
            );
        }
    }

    getFailureJiraAssociations() {
        this.failureJiraAssociations = [];
        this.buildService.getFailureJiraAssociations(this.releaseCenterKey, this.productKey, this.activeBuild.id).subscribe(
            (response) => {
                this.failureJiraAssociations = response;
            }
        );
    }

    getJiraUrl(buildId: string, assertionId: string) {
        const foundAssociations =  this.failureJiraAssociations.filter(assoc => {
            return assoc.buildId === buildId && assoc.assertionId === assertionId;
        });
        if (foundAssociations.length !== 0) {
            return foundAssociations[0].jiraUrl;
        }

        return '';
    }

    openJiraUrl(url: string) {
        window.open(url);
    }

    openBuildURL(build: Build) {
        window.open(build['url']);
    }

    loadManifestFile(build: Build) {
        window.open(build['manifest_url'] + '/file');
    }

    openBuildVisibilityModal(build: Build) {
        this.selectedBuild = build;
        this.openModal('hide-build-confirmation-modal');
    }

    openUnhideBuildConfirmationModal(build: Build) {
        this.selectedBuild = build;
        this.openModal('unhide-build-confirmation-modal');
    }

    openPublishingBuildConfirmationModal() {
        this.message = 'Are you sure you want to publish this build? Please be aware this is a env_placehoder environment '
                    + 'and the publication of this package will therefore have consequence to env_placehoder systems.';

        switch (this.environment) {
            case 'local':
            case 'dev':
                this.message = this.message.replace(/env_placehoder/g, 'DEVELOPMENT');
                break;
            case 'uat':
                this.message = this.message.replace(/env_placehoder/g, 'UAT');
                break;
            case 'training':
                this.message = this.message.replace(/env_placehoder/g, 'TRAINING');
                break;
            default:
                this.message = this.message.replace(/env_placehoder/g, 'PRODUCTION ');
                break;
        }
        this.openModal('publish-build-confirmation-modal');
    }

    openTaggingModal(build: Build) {
        this.selectedBuild = build;
        this.selectedTags = {};
        if (build.tags) {
            for (let i = 0; i < build.tags.length; i++) {
                this.selectedTags[build.tags[i]] = true;
            }
        }
        this.openModal('build-tagging-modal');
    }

    saveTags() {
        const newTags = [];
        for (const key in this.selectedTags) {
            if (this.selectedTags[key]) {
                newTags.push(key);
            }
        }
        this.openWaitingModel('Saving Tags');
        this.closeModal('build-tagging-modal');
        this.buildService.updateTags(this.releaseCenterKey, this.productKey, this.selectedBuild.id, newTags).subscribe(
            () => {
                this.buildService.getBuild(this.releaseCenterKey, this.productKey, this.selectedBuild.id).subscribe(
                    response => {
                        this.message = 'Tags have been updated successfully.';
                        this.selectedBuild.tags = response.tags;
                        this.closeWaitingModel();
                        this.openSuccessModel();
                    }
                );
            },
            errorResponse => {
                this.message = errorResponse.error.errorMessage;
                this.closeWaitingModel();
                this.openErrorModel();
            }
        );
    }

    hideBuild() {
        this.openWaitingModel('Hiding build');
        this.closeModal('hide-build-confirmation-modal');
        this.buildService.updateBuildVisibility(this.releaseCenterKey, this.productKey, this.selectedBuild.id, false).subscribe(
            () => {
                this.loadBuilds();
                this.message = 'Build \'' + this.selectedBuild.id + '\' has been hidden successfully.';
                this.closeWaitingModel();
                this.openSuccessModel();
            },
            errorResponse => {
                this.message = errorResponse.error.errorMessage;
                this.closeWaitingModel();
                this.openErrorModel();
            }
        );
    }

    unHideBuild() {
        this.openWaitingModel('Un-hiding build');
        this.closeModal('unhide-build-confirmation-modal');
        this.buildService.updateBuildVisibility(this.releaseCenterKey, this.productKey, this.selectedBuild.id, true).subscribe(
            () => {
                this.loadBuilds();
                this.hiddenBuilds = this.hiddenBuilds.filter(build => {
                    return build.id !== this.selectedBuild.id;
                });
                this.message = 'Build \'' + this.selectedBuild.id + '\' has been made visible successfully.';
                this.closeWaitingModel();
                this.openSuccessModel();
            },
            errorResponse => {
                this.message = errorResponse.error.errorMessage;
                this.closeWaitingModel();
                this.openErrorModel();
            }
        );
    }

    canDownloadBuild() {
        const codeSystem = this.activeReleaseCenter && this.activeReleaseCenter.codeSystem ? this.activeReleaseCenter.codeSystem : '';
        return this.roles && codeSystem && (
            (this.roles.hasOwnProperty('GLOBAL') && (
                    (<Array<String>> this.roles['GLOBAL']).indexOf('RELEASE_ADMIN') !== -1
                ||  (<Array<String>> this.roles['GLOBAL']).indexOf('RELEASE_MANAGER') !== -1
                ||  (<Array<String>> this.roles['GLOBAL']).indexOf('RELEASE_LEAD') !== -1)
                )
            || (this.roles.hasOwnProperty(codeSystem) && (
                    (<Array<String>> this.roles[codeSystem]).indexOf('RELEASE_ADMIN') !== -1
                ||  (<Array<String>> this.roles[codeSystem]).indexOf('RELEASE_MANAGER') !== -1
                ||  (<Array<String>> this.roles[codeSystem]).indexOf('RELEASE_LEAD') !== -1)
                )
        );
    }

    canTriggerBuild() {
        const codeSystem = this.activeReleaseCenter && this.activeReleaseCenter.codeSystem ? this.activeReleaseCenter.codeSystem : '';
        return this.roles && codeSystem && (
            (this.roles.hasOwnProperty('GLOBAL') && (
                    (<Array<String>> this.roles['GLOBAL']).indexOf('RELEASE_ADMIN') !== -1
                ||  (<Array<String>> this.roles['GLOBAL']).indexOf('RELEASE_MANAGER') !== -1
                ||  (<Array<String>> this.roles['GLOBAL']).indexOf('RELEASE_LEAD') !== -1
                    )
                )
            || (this.roles.hasOwnProperty(codeSystem) && (
                    (<Array<String>> this.roles[codeSystem]).indexOf('RELEASE_ADMIN') !== -1
                ||  (<Array<String>> this.roles[codeSystem]).indexOf('RELEASE_MANAGER') !== -1
                ||  (<Array<String>> this.roles[codeSystem]).indexOf('RELEASE_LEAD') !== -1
                    )
                )
        );
    }

    canPublishBuild() {
        const codeSystem = this.activeReleaseCenter && this.activeReleaseCenter.codeSystem ? this.activeReleaseCenter.codeSystem : '';
        return this.roles && codeSystem && this.activeBuild &&
            (!this.activeBuild.tags || this.activeBuild.tags.indexOf('PUBLISHED') === -1) && (
                (this.roles.hasOwnProperty('GLOBAL') && (
                        (<Array<String>> this.roles['GLOBAL']).indexOf('RELEASE_ADMIN') !== -1
                    || (<Array<String>> this.roles['GLOBAL']).indexOf('RELEASE_MANAGER') !== -1
                    )
                )
            );
    }

    canDeleteBuild() {
        const codeSystem = this.activeReleaseCenter && this.activeReleaseCenter.codeSystem ? this.activeReleaseCenter.codeSystem : '';
        return this.roles && codeSystem && this.activeBuild &&
            (!this.activeBuild.tags || this.activeBuild.tags.indexOf('PUBLISHED') === -1) && (
                (this.roles.hasOwnProperty('GLOBAL') && (
                        (<Array<String>> this.roles['GLOBAL']).indexOf('RELEASE_ADMIN') !== -1
                    ||  (<Array<String>> this.roles['GLOBAL']).indexOf('RELEASE_MANAGER') !== -1
                    ||  (<Array<String>> this.roles['GLOBAL']).indexOf('RELEASE_LEAD') !== -1
                    )
                )
                || (this.roles.hasOwnProperty(codeSystem) && (
                        (<Array<String>> this.roles[codeSystem]).indexOf('RELEASE_ADMIN') !== -1
                    ||  (<Array<String>> this.roles[codeSystem]).indexOf('RELEASE_MANAGER') !== -1
                    ||  (<Array<String>> this.roles[codeSystem]).indexOf('RELEASE_LEAD') !== -1
                    )
                )
            );
    }

    canGenerateJiraTicket() {
        const codeSystem = this.activeReleaseCenter && this.activeReleaseCenter.codeSystem ? this.activeReleaseCenter.codeSystem : '';
        return this.roles && codeSystem
             && (
                (this.roles.hasOwnProperty('GLOBAL') && (
                        (<Array<String>> this.roles['GLOBAL']).indexOf('RELEASE_ADMIN') !== -1
                    ||  (<Array<String>> this.roles['GLOBAL']).indexOf('RELEASE_MANAGER') !== -1
                    ||  (<Array<String>> this.roles['GLOBAL']).indexOf('RELEASE_LEAD') !== -1
                    )
                )
                || (this.roles.hasOwnProperty(codeSystem) && (
                        (<Array<String>> this.roles[codeSystem]).indexOf('RELEASE_ADMIN') !== -1
                    ||  (<Array<String>> this.roles[codeSystem]).indexOf('RELEASE_MANAGER') !== -1
                    ||  (<Array<String>> this.roles[codeSystem]).indexOf('RELEASE_LEAD') !== -1
                    )
                )
            );
    }

    private uploadInputFiles(releaseCenterKey, productKey, buildId, buildService, localInputFiles) {
        const promise = new Promise(function(resolve, reject) {
            const upload = function(inputFiles, index) {
                const formData = new FormData();
                formData.append('file', localInputFiles[index]) ;
                buildService.uploadInputFile(releaseCenterKey, productKey, buildId, formData).subscribe(() => {
                    index++;
                    if (index === inputFiles.length) {
                        resolve(null);
                    } else {
                        upload(inputFiles, index);
                    }
                },
                errorResponse => {
                    console.log(errorResponse);
                    reject(errorResponse);
                });
            };
            upload(localInputFiles, 0);
        });

        return promise;
    }

    private updateBuildStatus(message) {
        if (this.builds && this.builds.length !== 0) {
            const latestBuild = this.builds.filter(build => {
                return this.releaseCenterKey === message.releaseCenterKey
                    && this.productKey === message.productKey
                    && build.id === message.buildId;
            })[0];

            if (latestBuild) {
                if (BuildStateEnum.RVF_QUEUED === message.buildStatus
                    || BuildStateEnum.RVF_RUNNING === message.buildStatus) {
                    this.buildService.getBuild(this.releaseCenterKey, this.productKey, latestBuild.id).subscribe(
                        response => {
                            this.transferNewChangesIfAny(latestBuild, response);
                            if (this.activeBuild && response.id === this.activeBuild.id) {
                                this.transferNewChangesIfAny(this.activeBuild, response);
                            }
                        }
                    );
                } else {
                    latestBuild.status = message.buildStatus;
                    if (this.activeBuild && message.buildId === this.activeBuild.id) {
                        this.activeBuild.status = message.buildStatus;
                    }
                }
            }
        }
    }

    private getRVFRunId(url: string) {
        return url.substring(url.indexOf('result') + 7, url.indexOf('storageLocation') - 1);
    }

    private getRVFStorageLocation(url: string) {
        return url.substring(url.indexOf('=') + 1);
    }

    private transferNewChangesIfAny(oldBuild: Build, newBuild: Build) {
        if (oldBuild && newBuild) {
            if (oldBuild.status !== newBuild.status) {
                oldBuild.status = newBuild.status;
            }
            if (oldBuild.rvfURL !== newBuild.rvfURL) {
                oldBuild.rvfURL = newBuild.rvfURL;
            }
        }
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

    private missingFieldsCheck(): Object[] {
        const missingFields = [];
        if (!this.buildParams.buildName) { missingFields.push('Build Name'); }
        if (!this.buildParams.effectiveDate) { missingFields.push('Effective Date'); }
        if (this.useLocalInputFiles) {
            if (!this.localInputFiles || this.localInputFiles.length === 0) {
                missingFields.push('Local Input Files');
            }
        } else {
            if (!this.buildParams.branch) { missingFields.push('Branch'); }
            if (!this.buildParams.exportType) { missingFields.push('Export Type'); }
        }

        if (!this.buildParams.maxFailureExport) { missingFields.push('Failure Max'); }

        return missingFields;
    }

    private clearMessage() {
        this.message = '';
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

    private openWaitingModel(defaultMsg?: string) {
        if (this.activeBuild.buildDeleting) {
            this.action = 'Deleting Build';
        } else if (this.activeBuild.buildCanceling) {
            this.action = 'Canceling Build';
        } else if (this.activeBuild.buildPublishing) {
            this.action = 'Publishing Build';
        } else {
            this.action = defaultMsg;
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
