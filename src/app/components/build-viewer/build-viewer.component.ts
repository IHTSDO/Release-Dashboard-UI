import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Product } from '../../models/product';
import { Build } from '../../models/build';
import { BuildService } from '../../services/build/build.service';
import { ProductService } from '../../services/product/product.service';
import { ProductDataService } from '../../services/product/product-data.service';
import { ModalService } from '../../services/modal/modal.service';
import { CommonModule, formatDate } from '@angular/common';
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
import { Sort } from 'src/app/util/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { ModalComponent } from '../modal/modal.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSortModule } from '@angular/material/sort';
import { SortDirective } from 'src/app/directive/sort.directive';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatMenuModule } from '@angular/material/menu';
import { MatNativeDateModule } from '@angular/material/core';
import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { TextFieldModule } from '@angular/cdk/text-field';

@Component({
  selector: 'app-build-viewer',
  imports: [TextFieldModule, ReactiveFormsModule, FormsModule, CommonModule, RouterLink, ModalComponent, MatSortModule, SortDirective, MatSelectModule, MatAutocompleteModule, MatPaginatorModule, MatDatepickerModule, MatNativeDateModule, MatMomentDateModule, MatMenuModule],
  templateUrl: './build-viewer.component.html',
  styleUrls: ['./build-viewer.component.scss']
})
export class BuildViewerComponent implements OnInit, OnDestroy {
    @ViewChild('customRefsetCompositeKeys') private customRefsetCompositeKeysInput;
    @ViewChild('uploadInputFilesInput') private uploadInputFilesInput;
    @ViewChild('buildPaginator') buildPaginator: MatPaginator;
    @ViewChild('hiddenBuildPaginator') hiddenBuildPaginator: MatPaginator;


    RF2_DATE_FORMAT = 'yyyyMMdd';
    DATA_DOG_URL = 'https://app.datadoghq.com/dashboard/dm6-vs3-bz3/release-dashboard';

    dangerInput: string;

    // params map
    releaseCenterKey: string;
    productKey: string;
    roles: any;

    builds: Build[]; // the builds used by UI
    hiddenBuilds: Build[]; // hold all hidden builds from server
    localInputFiles: FileList;

    activeProduct: Product;
    activeReleaseCenter: ReleaseCenter;
    activeBuild: Build;
    selectedBuild: Build;
    buildLog: string;
    selectedTags: any;
    environment: string;
    view: string;
    newBuildName: string;

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
    selectAllError = false;
    selectAllWarning = false;
    allTags: any;

    // pagination for build table
    pageSizeOnBuildTalbe = 10;
    pageNumberOnBuildTable: Number;
    totalBuild = 0;

    // pagination for hidden build table
    pageSizeOnHiddenBuildTable = 10;
    pageNumberOnHiddenHiddenTable: Number;
    totalHiddenBuild = 0;

    // RVF report
    assertionsFailed: any[];
    assertionsWarning: any[];
    failureJiraAssociations: FailureJiraAssociation[];
    newFailureJiraAssociations: FailureJiraAssociation[];
    duplicatedFailureJiraAssociations: FailureJiraAssociation[];

    // Sorting
    errorTableSortingObj: any;
    warningTableSortingObj: any;
    buildTableSortingObj: any;

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
        this.errorTableSortingObj = new Object();
        this.warningTableSortingObj = new Object();
        this.pageNumberOnBuildTable = this.paginationService.DEFAULT_PAGE_NUMBER;
        this.pageNumberOnHiddenHiddenTable = this.paginationService.DEFAULT_PAGE_NUMBER;
        this.allTags = Object.keys(BuildTagEnum).map(key => ({ label: BuildTagEnum[key], value: key }));
        this.constructBuildTableSortingObj();

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

    constructBuildTableSortingObj(): void {
        this.buildTableSortingObj = new Object();
        this.buildTableSortingObj['buildName'] = new Object();
        this.buildTableSortingObj['creationTime'] = new Object();
        this.buildTableSortingObj['status'] = new Object();
        this.buildTableSortingObj['buildUser'] = new Object();
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
        if (event.pageSize !== this.pageSizeOnBuildTalbe) {
            this.pageSizeOnBuildTalbe = event.pageSize;
            this.pageNumberOnBuildTable = this.paginationService.DEFAULT_PAGE_NUMBER;
        } else {
            this.pageNumberOnBuildTable = event.pageIndex + 1;
        }
        this.loadBuilds();
    }

    handlePageChangeOnHiddenBuildTable(event) {
        if (event.pageSize !== this.pageSizeOnHiddenBuildTable) {
            this.pageSizeOnHiddenBuildTable = event.pageSize;
            this.pageNumberOnHiddenHiddenTable = this.paginationService.DEFAULT_PAGE_NUMBER;
        } else {
            this.pageNumberOnHiddenHiddenTable = event.pageIndex + 1;
        }
        this.loadHiddenBuilds();
    }

    getStatusColumnWidth() {
        // FAILED_INPUT_PREPARE_REPORT_VALIDATION
        // FAILED_INPUT_GATHER_REPORT_VALIDATION
        // RELEASE_COMPLETE_WITH_WARNINGS
        // FAILED_POST_CONDITIONS
        // FAILED_PRE_CONDITIONS
        // CANCEL_REQUESTED
        // RELEASE_COMPLETE
        // BEFORE_TRIGGER
        // RVF_RUNNING
        // RVF_QUEUED
        // RVF_FAILED
        // CANCELLED
        // BUILDING
        // UNKNOWN
        // PENDING
        // FAILED
        // QUEUED
        // BUILT
        const codeSystem = this.activeReleaseCenter && this.activeReleaseCenter.codeSystem ? this.activeReleaseCenter.codeSystem : '';
        const isReleaseAdminOrManagerOrLead = this.roles && codeSystem && (
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

        if (isReleaseAdminOrManagerOrLead && this.builds.length !== 0) {
            if (this.builds.filter(item => item.status === 'FAILED_INPUT_PREPARE_REPORT_VALIDATION').length !== 0) {
                return '132px';
            } else if (this.builds.filter(item => item.status === 'FAILED_INPUT_GATHER_REPORT_VALIDATION').length !== 0) {
                return '126px';
            } else if (this.builds.filter(item => item.status === 'RELEASE_COMPLETE_WITH_WARNINGS').length !== 0) {
                return '121px';
            } else if (this.builds.filter(item => item.status === 'FAILED_POST_CONDITIONS').length !== 0) {
                return '81px';
            } else if (this.builds.filter(item => item.status === 'FAILED_PRE_CONDITIONS').length !== 0) {
                return '78px';
            } else if (this.builds.filter(item => item.status === 'CANCEL_REQUESTED').length !== 0) {
                return '77px';
            } else if (this.builds.filter(item => item.status === 'RELEASE_COMPLETE').length !== 0) {
                return '71px';
            } else if (this.builds.filter(item => item.status === 'BEFORE_TRIGGER').length !== 0) {
                return '57px';
            } else if (this.builds.filter(item => item.status === 'RVF_RUNNING').length !== 0) {
                return '87px';
            } else if (this.builds.filter(item => item.status === 'RVF_QUEUED').length !== 0) {
                return '83px';
            } else if (this.builds.filter(item => item.status === 'RVF_FAILED').length !== 0) {
                return '74px';
            } else if (this.builds.filter(item => item.status === 'CANCELLED').length !== 0) {
                return '73px';
            } else if (this.builds.filter(item => item.status === 'BUILDING').length !== 0
                        || this.builds.filter(item => item.status === 'UNKNOWN').length !== 0
                        || this.builds.filter(item => item.status === 'PENDING').length !== 0) {
                return '63px';
            } else if (this.builds.filter(item => item.status === 'FAILED').length !== 0
                        || this.builds.filter(item => item.status === 'QUEUED').length !== 0
                        || this.builds.filter(item => item.status === 'BUILT').length !== 0) {
                return '50px';
            }
        }

        return 'unset';
    }

    loadBuilds() {
        this.buildsLoading = true;
        this.builds = [];
        this.clearMessage();
        const sorting = this.getSorting();
        this.buildService.getBuilds(this.releaseCenterKey, this.productKey,
                                    true, true, true, this.view, this.pageNumberOnBuildTable, this.pageSizeOnBuildTalbe, sorting).subscribe(response => {
                this.builds = response['content'];
                this.totalBuild = parseInt(response['totalElements']);
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
        const sorting = ['creationTime,desc'];
        this.buildService.getBuilds(this.releaseCenterKey, this.productKey,
                                    true, false, false, 'ALL_RELEASES', this.pageNumberOnHiddenHiddenTable, this.pageSizeOnHiddenBuildTable, sorting).subscribe(response => {
                this.hiddenBuilds = response['content'];
                this.totalHiddenBuild = parseInt(response['totalElements']);
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

    resetHiddenBuildTable() {
        this.hiddenBuilds = [];
        this.totalHiddenBuild = this.paginationService.EMPTY_ITEMS;
        this.pageNumberOnHiddenHiddenTable = this.paginationService.DEFAULT_PAGE_NUMBER;
        if (this.hiddenBuildPaginator) {
            this.hiddenBuildPaginator.firstPage();
        }
    }

    refreshBuilds() {
        this.buildPaginator.firstPage()
        this.totalBuild = this.paginationService.EMPTY_ITEMS;
        this.pageNumberOnBuildTable = this.paginationService.DEFAULT_PAGE_NUMBER;
        this.loadBuilds();
    }

    setActiveBuild(build) {
        this.clearMessage();
        this.activeBuild = build;
    }

    switchView(view) {
        this.view = view;
        this.buildPaginator.firstPage()
        this.totalBuild = this.paginationService.EMPTY_ITEMS;
        this.pageNumberOnBuildTable = this.paginationService.DEFAULT_PAGE_NUMBER;
        this.loadBuilds();
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
                        || BuildStateEnum.RVF_RUNNING === build.status
                        || BuildStateEnum.QUEUED === build.status) {
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
        this.setSelectedBuild(build);
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
                        || BuildStateEnum.RVF_RUNNING === build.status
                        || BuildStateEnum.QUEUED === build.status) {
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
                        || BuildStateEnum.BEFORE_TRIGGER === build.status
                        || BuildStateEnum.QUEUED === build.status) {
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
                        || BuildStateEnum.BEFORE_TRIGGER === build.status
                        || BuildStateEnum.QUEUED === build.status) {
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

    selectInputFiles(e: any) {
        this.localInputFiles = e.target.files;
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

    doOpeningBuildModal(isNewBuild?) {
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
            this.buildParams.buildName = this.activeBuild.configuration.buildName ? this.activeBuild.configuration.buildName + '' : '';
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
        this.assertionsFailed = [];
        this.assertionsWarning = [];
        this.rvfReportLoading = true;
        this.selectAllError = false;
        this.selectAllWarning = false;
        if (build.rvfURL.startsWith('https')) {
            this.rvfServerService.getRVFReport(this.getRVFRunId(build.rvfURL), this.getRVFStorageLocation(build.rvfURL)).subscribe(
            (rvfReport) => {
                if (rvfReport['status'] === 'COMPLETE') {
                    this.assertionsFailed = rvfReport['rvfValidationResult']['TestResult']['assertionsFailed'];
                    this.assertionsWarning = rvfReport['rvfValidationResult']['TestResult']['assertionsWarning'];
                    this.assertionsFailed = this.assertionsFailed.filter(item => item['assertionUuid']);
                    this.assertionsWarning = this.assertionsWarning.filter(item => item['assertionUuid']);

                    // sorting
                    const sort = new Sort();
                    const defaultSortColumn = 'testType';
                    const defaultSortDirection =  'asc';
                    this.assertionsFailed.sort(sort.startSort(defaultSortColumn, defaultSortDirection));
                    this.assertionsWarning.sort(sort.startSort(defaultSortColumn, defaultSortDirection));
                    this.errorTableSortingObj = new Object();
                    this.warningTableSortingObj = new Object();
                    this.errorTableSortingObj[defaultSortColumn] = defaultSortDirection;
                    this.warningTableSortingObj[defaultSortColumn] = defaultSortDirection;
                    this.populateJiraUrlToFailures();
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

    handleSortClickOnBuildTable(direction: string, column: string) {
        let priority = 0;
        let existing = false;
        for (const prop of Object.keys(this.buildTableSortingObj)) {
            if (prop !== column && this.buildTableSortingObj[prop]['priority'] >= priority) {
                priority =  this.buildTableSortingObj[prop]['priority'] + 1;
            }
            if (prop === column && this.buildTableSortingObj[prop]['priority'] >= 0) {
                existing = true;
            }
        }
        if (priority > 1 && !existing) {
            this.constructBuildTableSortingObj();
            this.buildTableSortingObj[column]['priority'] = 0;
        } else if (!existing) {
            this.buildTableSortingObj[column]['priority'] = priority;
        } else {
            // do nothing
        }
        this.buildTableSortingObj[column]['direction'] = direction;
        this.loadBuilds();
    }

    handleSortClickOnJiraGenerationTable(direction: string, column: string, type: string) {
        if (type === 'error') {
            this.errorTableSortingObj = new Object();
            this.errorTableSortingObj[column] = direction;
        }
        if (type === 'warning') {
            this.warningTableSortingObj = new Object();
            this.warningTableSortingObj[column] = direction;
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
        const selectedFailures = this.assertionsFailed.filter(failure => {
            return failure['checked'] && !failure['jiraUrl'];
        }).concat(this.assertionsWarning.filter(failure => {
            return failure['checked'] && !failure['jiraUrl'];
        }));
        if (selectedFailures.length === 0) {
            this.message = 'No selected failures.';
            this.openErrorModel();
        } else {
            this.openModal('jira-generation-confirmation-modal');
        }
    }

    toggleSelectAllFailures(type: string) {
        if (type === 'error') {
            this.selectAllError = !this.selectAllError;
            for (let i = 0; i < this.assertionsFailed.length; i++) {
                if (!this.assertionsFailed[i]['jiraUrl']) {
                    this.assertionsFailed[i]['checked'] = this.selectAllError ? true : false;
                }
            }
        }
        if (type === 'warning') {
            this.selectAllWarning = !this.selectAllWarning;
            for (let i = 0; i < this.assertionsWarning.length; i++) {
                if (!this.assertionsWarning[i]['jiraUrl']) {
                    this.assertionsWarning[i]['checked'] = this.selectAllWarning ? true : false;
                }
            }
        }
    }

    toggleSelectFailure(type: string) {
        if (type === 'error') {
            setTimeout(() => {
                const selectedFailures = this.assertionsFailed.filter(failure => {
                    return !failure['jiraUrl'] && failure['checked'];
                });
                const failuresWithoutLink = this.assertionsFailed.filter(failure => {
                    return !failure['jiraUrl'];
                });
                this.selectAllError = failuresWithoutLink.length !== 0 && selectedFailures.length === failuresWithoutLink.length;
            }, 0);
        }
        if (type === 'warning') {
            setTimeout(() => {
                const selectedFailures = this.assertionsWarning.filter(failure => {
                    return !failure['jiraUrl'] && failure['checked'];
                });
                const failuresWithoutLink = this.assertionsWarning.filter(failure => {
                    return !failure['jiraUrl'];
                });
                this.selectAllWarning = failuresWithoutLink.length !== 0 && selectedFailures.length === failuresWithoutLink.length;
            }, 0);
        }
    }

    generateJiraTickets() {
        this.newFailureJiraAssociations = [];
        this.duplicatedFailureJiraAssociations = [];
        this.closeModal('jira-generation-confirmation-modal');
        const selectedFailures = this.assertionsFailed.filter(failure => {
            return failure['checked'] && !failure['jiraUrl'];
        }).concat(this.assertionsWarning.filter(failure => {
            return failure['checked'] && !failure['jiraUrl'];
        }));
        if (selectedFailures.length !== 0) {
            this.openWaitingModel('Generating JIRA tickets');
            const assertionIds = [];
            for (let i = 0; i < selectedFailures.length; i++) {
                assertionIds.push(selectedFailures[i]['assertionUuid']);
            }

            this.buildService.generateJiraTickets(this.releaseCenterKey, this.productKey, this.activeBuild.id, assertionIds).subscribe(
                (response) => {
                    this.closeWaitingModel();
                    this.newFailureJiraAssociations = response['newlyCreatedRVFFailureJiraAssociations'];
                    this.message = this.newFailureJiraAssociations.length + ' JIRA ticket(s) have been created successfully';
                    this.duplicatedFailureJiraAssociations = response['duplicatedRVFFailureJiraAssociations'];
                    this.openModal('jira-generation-summary-modal');
                    this.getFailureJiraAssociations();
                },
                errorResponse => {
                    this.message = errorResponse.error.errorMessage;
                    if (this.message.includes('Connection timed out')) {
                        this.message = this.message.replace('(Connection timed out)', '').trim();
                        this.message += '. Please contact technical support to get help resolving this.';
                    }
                    this.closeWaitingModel();
                    this.openErrorModel();
                    this.getFailureJiraAssociations();
                }
            );
        }
    }

    getFailureJiraAssociations() {
        this.failureJiraAssociations = [];
        this.buildService.getFailureJiraAssociations(this.releaseCenterKey, this.productKey, this.activeBuild.id).subscribe(
            (response) => {
                this.failureJiraAssociations = response;
                this.populateJiraUrlToFailures();
            }
        );
    }

    populateJiraUrlToFailures() {
        if (this.failureJiraAssociations.length !== 0) {
            if (this.assertionsFailed.length !== 0) {
                for (let i = 0; i < this.assertionsFailed.length; i++) {
                    for (let j = 0; j < this.failureJiraAssociations.length; j++) {
                        if (this.assertionsFailed[i]['assertionUuid'] === this.failureJiraAssociations[j]['assertionId']) {
                            this.assertionsFailed[i]['jiraUrl'] = this.failureJiraAssociations[j]['jiraUrl'];
                            break;
                        }
                    }
                }
            }
            if (this.assertionsWarning.length !== 0) {
                for (let i = 0; i < this.assertionsWarning.length; i++) {
                    for (let j = 0; j < this.failureJiraAssociations.length; j++) {
                        if (this.assertionsWarning[i]['assertionUuid'] === this.failureJiraAssociations[j]['assertionId']) {
                            this.assertionsWarning[i]['jiraUrl'] = this.failureJiraAssociations[j]['jiraUrl'];
                            break;
                        }
                    }
                }
            }
        }
    }

    openUpdateConfigurationsModal(build:Build) {
        this.setSelectedBuild(build);
        this.newBuildName = build.configuration.buildName;
        this.openModal('update-configurations-modal');
    }

    updateBuildName() {
        this.clearMessage();
        this.closeModal('update-configurations-modal');
        this.openWaitingModel('Saving build name...');
        this.buildService.changeBuildName(this.releaseCenterKey, this.productKey, this.selectedBuild.id, this.newBuildName).subscribe(
            () => {
                this.selectedBuild.configuration.buildName = this.newBuildName;
                this.message = 'Build name has been updated successfully.';
                this.closeWaitingModel();
                this.openSuccessModel();

            },
            errorResponse => {
                this.closeWaitingModel();
                this.message = errorResponse?.error?.errorMessage;
                this.openErrorModel();
            }
        );
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
        this.setSelectedBuild(build);
        this.openModal('hide-build-confirmation-modal');
    }

    openUnhideBuildConfirmationModal(build: Build) {
        this.setSelectedBuild(build);
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
        // this.openModal('publish-build-confirmation-modal');
        this.openModal('publish-danger-modal');
    }

    openTaggingModal(build: Build) {
        this.setSelectedBuild(build);
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

    isAllowCancelingBuild(build: Build) {
        return build.status === 'QUEUED' || build.status === 'BEFORE_TRIGGER' || build.status === 'BUILDING';
    }

    isAdminOrManagerOrLead() {
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

    clearSort(column) {
        this.buildTableSortingObj[column] = {};
        for (const prop of Object.keys(this.buildTableSortingObj)) {
            if (prop !== column && this.buildTableSortingObj[prop]['priority'] > 0) {
                this.buildTableSortingObj[prop]['priority'] = 0;
            }
        }
        this.loadBuilds();
    }

    hasSortingPriority(property) {
        return this.buildTableSortingObj.hasOwnProperty(property) && this.buildTableSortingObj[property]['priority'] >= 0;
    }

    private getSorting() {
        const result = [];
        const sortingArr = [];
        for (const prop of Object.keys(this.buildTableSortingObj)) {
            const obj = {};
            obj['field'] = prop;
            obj['direction'] = this.buildTableSortingObj[prop]['direction'];
            obj['priority'] = this.buildTableSortingObj[prop]['priority'];
            sortingArr.push(obj);
        }
        sortingArr.sort((a, b) => a['priority'] - b['priority']);
        for (let i = 0; i < sortingArr.length; i++) {
            if (sortingArr[i]['priority'] >= 0) {
                result.push(sortingArr[i]['field'] + ',' + sortingArr[i]['direction']);
            }
        }

        return result;
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

    private setSelectedBuild(build: Build) {
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
