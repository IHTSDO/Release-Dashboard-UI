import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { ReleaseCenterService } from '../../services/releaseCenter/release-center.service';
import { ProductService } from '../../services/product/product.service';
import { ReleaseCenter } from '../../models/releaseCenter';
import { ProductDataService } from '../../services/product/product-data.service';
import { ModalService } from '../../services/modal/modal.service';
import { Product } from '../../models/product';
import { BuildConfiguration } from '../../models/buildConfiguration';
import { QAConfiguration } from '../../models/qaConfiguration';
import { ExtensionConfig } from '../../models/extensionConfig';
import { ProductPaginationService } from '../../services/pagination/product-pagination.service';
import { PermissionService } from '../../services/permission/permission.service';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { map, startWith } from 'rxjs/operators';
import { ReleaseServerService } from '../../services/releaseServer/release-server.service';
import { ModalComponent } from '../modal/modal.component';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { RouterLink } from '@angular/router';
import { SortDirective } from 'src/app/directive/sort.directive';
import { LeftSidebarComponent } from '../left-sidebar/left-sidebar.component';
import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { MAT_DATE_FORMATS, MatNativeDateModule } from '@angular/material/core';
import { TextFieldModule } from '@angular/cdk/text-field';
import { NoScrollInputDirective } from 'src/app/directive/no-scroll-input.directive';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CodeSystem } from 'src/app/models/codeSystem';
import { OptionalManifestRefset } from 'src/app/models/optionalManifestRefset';

export const DATE_FORMATS = {
    parse: {
        dateInput: 'YYYY-MM-DD',
    },
    display: {
        dateInput: 'YYYY-MM-DD',
        monthYearLabel: 'MMM YYYY',
        dateA11yLabel: 'LL',
        monthYearA11yLabel: 'MMMM YYYY'
    }
}

@Component({
    selector: 'app-product-viewer',
    imports: [TextFieldModule, ReactiveFormsModule, FormsModule, CommonModule, RouterLink, SortDirective, ModalComponent, MatSelectModule, MatAutocompleteModule, MatPaginatorModule, MatDatepickerModule, MatNativeDateModule, MatMomentDateModule, MatTooltipModule, NoScrollInputDirective, LeftSidebarComponent],
    templateUrl: './product-viewer.component.html',
    styleUrls: ['./product-viewer.component.scss'],
    providers: [
        { provide: MAT_DATE_FORMATS, useValue: DATE_FORMATS }
    ]
})
export class ProductViewerComponent implements OnInit, OnDestroy {

    private activeReleaseCenterSubscription: Subscription;

    @ViewChild('uploadManifestFileInput') uploadManifestFileInput: ElementRef<HTMLElement>;
    @ViewChild('productPaginator') productPaginator: MatPaginator;
    @ViewChild('hiddenProductPaginator') hiddenProductPaginator: MatPaginator;
    @ViewChild('excludedRefsetsSelectAll') excludedRefsetsSelectAllRef?: ElementRef<HTMLInputElement>;

    activeReleaseCenter: ReleaseCenter;
    products: Product[];
    hiddenProducts: Product[];
    selectedProduct: Product;
    editedProduct: Product;
    customRefsetCompositeKeys: string;
    roles: Object;
    productsWithManifestUploaded: string[];

    optionalManifestRefsets: OptionalManifestRefset[] = [];
    optionalManifestRefsetsLoadError: string | null = null;
    selectedOptionalManifestRefsetIds: string[] = [];
    /** Manual / additional exclusions only; composed with optional checkboxes into manifestConfig.excludedRefsets on save. */
    otherExcludedRefsets = '';
    /** Server value when the modal opened; used to split optional vs other when the optional-refset list loads. */
    private manifestExcludedRefsetsSnapshot = '';

    // animations
    gereratingManifest = false;
    savingProduct = false;
    loadingReleasePackagesDone = false;

    pageSizeOnProductTable = 20;
    pageSizeOnHiddenProductTable = 20;

    // pagination for product table
    productsLoading = false;
    pageNumberOnProductTable: Number;
    totalProduct = 0;
    sortDirectionOnProductTable: string;


    // pagination for hidden product table
    hiddenProductsLoading = false;
    totalHiddenProduct = 0;
    sortDirectionOnHiddenProductTable: string;
    pageNumberOnHiddenProductTable: Number;

    // global message
    message: string;
    action: string;

    codeSystemToReleasePackageMap = {};
    codeSystems: CodeSystem[];

    previousReleaseInputControl = new FormControl('');
    previousReleaseOptions: string[] = [];
    filteredPreviousReleaseOptions: Observable<string[]>;

    dependentReleaseInputControl = new FormControl('');
    dependentReleaseOptions: string[] = [];
    filteredDependentReleaseOptions: Observable<string[]>;

    constructor(private releaseCenterService: ReleaseCenterService,
                private modalService: ModalService,
                private productService: ProductService,
                private productDataService: ProductDataService,
                private permissionService: PermissionService,
                private paginationService: ProductPaginationService,
                private releaseServerService: ReleaseServerService,
                private releaseServer: ReleaseServerService,) {
        this.activeReleaseCenterSubscription = this.releaseCenterService.getActiveReleaseCenter().subscribe(response => {
            this.activeReleaseCenter = response;


            this.message = '';
            this.productsWithManifestUploaded = [];
            this.previousReleaseOptions = [];

            // Products
            this.products = [];
            this.pageNumberOnProductTable = this.paginationService.getSelectedPage(this.activeReleaseCenter.id);
            this.pageSizeOnProductTable = this.paginationService.getPageSize() ? this.paginationService.getPageSize() : 20;
            this.sortDirectionOnProductTable = 'asc';

            // Hidden products
            this.hiddenProducts = [];
            this.pageNumberOnHiddenProductTable = this.paginationService.DEFAULT_PAGE_NUMBER;
            this.pageSizeOnHiddenProductTable = this.paginationService.DEFAULT_PAGE_SIZE;
            this.sortDirectionOnHiddenProductTable = 'asc';

            this.productDataService.clearCachedProducts();
            this.customRefsetCompositeKeys = null;
            this.initializeEditingProduct();
            this.loadProducts();
            this.loadReleasePackages();
            this.loadOptionalManifestRefsets(this.activeReleaseCenter.id);
        });
    }

    ngOnInit(): void {
        this.roles = this.permissionService.roles;
        this.customRefsetCompositeKeys = null;
        this.totalProduct = this.paginationService.EMPTY_ITEMS;
        this.initializeEditingProduct();
        this.initAutoComplete();

        this.loadCodeSystems(this.releaseCenterService, this.releaseServer).then(data => {
            this.codeSystems = <CodeSystem[]> data;
            this.releaseCenterService.cacheCodeSystems(this.codeSystems);
        });
    }

    ngOnDestroy() {
        this.activeReleaseCenterSubscription.unsubscribe();
    }

    initAutoComplete() {
        this.filteredPreviousReleaseOptions = this.previousReleaseInputControl.valueChanges.pipe(
            startWith(''),
            map(value => this.filterReleases(this.previousReleaseOptions, value || '')),
        );

        this.filteredDependentReleaseOptions = this.dependentReleaseInputControl.valueChanges.pipe(
            startWith(''),
            map(value => this.filterReleases(this.dependentReleaseOptions, value || '')),
        );
    }

    private filterReleases(options: string[], value: string): string[] {
        const filterValue = value.toLowerCase();
        return options.filter(option => option.toLowerCase().includes(filterValue));
    }

    loadPreviousReleaseOptions() {
        if (this.editedProduct['releaseCenter'] && this.editedProduct['releaseCenter'].codeSystem) {
            const codeSystem = this.editedProduct['releaseCenter'].codeSystem;
            const codeSystemShortname = codeSystem === 'SNOMEDCT' ? 'INT' : codeSystem.substr(codeSystem.indexOf('-') + 1);
            if (this.codeSystemToReleasePackageMap.hasOwnProperty(codeSystemShortname)) {
                this.previousReleaseOptions = this.getSortedFilenames(this.codeSystemToReleasePackageMap[codeSystemShortname]);
            }
        }
    }

    setDependantReleaseOptions() {
        if (this.codeSystemToReleasePackageMap.hasOwnProperty('INT')) {
            this.dependentReleaseOptions = this.getSortedFilenames(this.codeSystemToReleasePackageMap['INT']);
        }
    }

    getSortedFilenames(releases: any[]): string[] {
        return releases.sort((a, b) => b.effectiveTime - a.effectiveTime).map(release => release.filename);
    }


    initializeEditingProduct() {
        const buildConfiguration = new BuildConfiguration();
        const qaTestConfiguration = new QAConfiguration();
        const extensionConfig = new ExtensionConfig();
        buildConfiguration.extensionConfig = extensionConfig;
        this.editedProduct = new Product();
        this.editedProduct.buildConfiguration = buildConfiguration;
        this.editedProduct.qaTestConfig = qaTestConfiguration;
        this.ensureManifestConfiguration();
    }

    onSelectProduct() {
        this.paginationService.cacheSelectedPage(this.activeReleaseCenter.id, this.pageNumberOnProductTable);
    }

    createProduct(productName, snomedCtProduct, force = false) {
        this.message = '';
        const missingFields = this.missingFieldsCheck(productName.trim());
        if (missingFields.length !== 0) {
            this.message = 'Please enter the following fields: ' + missingFields.join(', ') + '.';
            this.openErrorModel();
            return;
        }

        const releasePattern = /^SNOMED CT\s+\w+(?:.*\w+)*\s+releases$/;
        const dailyBuildPattern = /^SNOMED CT\s+\w+(?:.*\w+)*\s+Daily+\s+Build$/;
        if (productName && !force && !releasePattern.test(productName) && !dailyBuildPattern.test(productName)) {
            this.message = 'Please enter a valid product name. The product name should be in the format of \'SNOMED CT <codeSystem> <releaseType>\'.';
            this.openModal('add-product-confirmation-modal');
            return;
        }

        this.savingProduct = true;
        this.closeAddProductModal();
        this.openWaitingModel('Creating product');
        this.productService.createProduct(this.activeReleaseCenter.id, productName, snomedCtProduct).subscribe(data => {
            this.selectedProduct = data;
            this.pageNumberOnProductTable = this.paginationService.DEFAULT_PAGE_NUMBER;
            this.loadProducts();
            this.message = 'Product ' + productName + ' has been created successfully. Please update the configurations';
            this.closeWaitingModel();
            this.openProductCreationSuccessModal();
        },
        errorResponse => {
            this.savingProduct = false;
            if (errorResponse.status === 409) {
                if (errorResponse.error && errorResponse.error.errorMessage) {
                    this.message = errorResponse.error.errorMessage;
                } else {
                    this.message = 'There was already a product name \'' + productName + '\'. Please select another one.';
                }
            } else {
                this.message = errorResponse.error.errorMessage;
            }
            this.closeWaitingModel();
            this.openModal('add-product-modal');
            this.openErrorModel();
        },
        () => {
            this.savingProduct = false;
        });
    }

    loadReleasePackages() {
        const cachedReleasePackageMap = this.releaseCenterService.getCachedReleasePackages();
        if (cachedReleasePackageMap) {
            this.handleReleasePackages(cachedReleasePackageMap);
        } else {
            this.releaseServerService.getReleases().subscribe(
                data => {
                    this.handleReleasePackages(data);                },
                error => {
                    console.error('ERROR: Release Packages failed to load. Error: ' + error);
                }
            );
        }
    }

    handleReleasePackages(data: any) {
        this.codeSystemToReleasePackageMap = data;
        this.setDependantReleaseOptions();
        this.loadingReleasePackagesDone = true;
    }

    updateProduct(product: Product, customRefsetCompositeKeys: string) {
        this.message = '';
        const missingFields = this.productConfigurationMissingFieldsCheck(product);
        if (missingFields.length !== 0) {
            this.message = 'Please enter the following fields: ' + missingFields.join(', ') + '.';
            this.openErrorModel();
            return;
        }
        this.savingProduct = true;
        this.productService.patchProduct(this.activeReleaseCenter.id, product, customRefsetCompositeKeys).subscribe(
            response => {
                this.products[this.products.findIndex(p => p.id === response.id)] = response;
                this.productDataService.cacheProducts(this.products);
                this.message = 'Product ' + product.name + ' has been updated successfully.';
                this.closeUpdateProductModal();
                this.openSuccessModel();
            },
            errorResponse => {
                this.savingProduct = false;
                if (errorResponse.error && errorResponse.error.errorMessage) {
                    this.message = errorResponse.error.errorMessage;
                } else {
                    this.message = 'Failed to update product. Error: ' + errorResponse.error.HTTPStatus.replaceAll('_', ' ')
                    + '.\nPlease contact technical support to get help resolving this.';
                }
                this.openErrorModel();
            },
            () => {
                this.savingProduct = false;
            }
        );
    }

    loadProducts() {
        this.productsLoading = true;
        this.productService.getProducts(this.activeReleaseCenter.id,
                                        this.pageNumberOnProductTable,
                                        this.pageSizeOnProductTable, 'name',
                                        this.sortDirectionOnProductTable).subscribe(response => {
            this.products = response['content'];
            this.totalProduct = parseInt(response['totalElements']);
            this.productsLoading = false;
            this.productDataService.cacheProducts(this.products);
            this.loadProductManifestFilesInfo(this.products);
            this.productPaginator.pageIndex = this.pageNumberOnProductTable.valueOf() - 1;
        });
    }

    resetHiddenProductTable() {
        this.hiddenProducts = [];
        this.totalHiddenProduct = this.paginationService.EMPTY_ITEMS;
        this.pageNumberOnHiddenProductTable = this.paginationService.DEFAULT_PAGE_NUMBER;
        this.sortDirectionOnHiddenProductTable = 'asc';
        if (this.hiddenProductPaginator) {
            this.hiddenProductPaginator.firstPage();
        }
    }

    loadHiddenProducts() {
        this.hiddenProductsLoading = true;
        this.productService.getHiddenProducts(this.activeReleaseCenter.id,
                                        this.pageNumberOnHiddenProductTable,
                                        this.pageSizeOnHiddenProductTable, 'name',
                                        this.sortDirectionOnHiddenProductTable).subscribe(response => {
            this.hiddenProducts = response['content'];
            this.totalHiddenProduct = parseInt(response['totalElements']);
            this.hiddenProductsLoading = false;
        });
    }

    loadProductManifestFilesInfo(products: Product[]) {
        for (let index = 0; index < products.length; index++) {
            const product = products[index];
            this.productService.getManifest(this.activeReleaseCenter.id, product.id).subscribe(
                data => {
                    if (data.hasOwnProperty('filename')) {
                        this.productsWithManifestUploaded.push(product.id);
                    }
                }
            );
        }
    }

    handleSortClickOnProductTable(direction: string) {
       this.sortDirectionOnProductTable = direction;
       this.loadProducts();
    }

    handlePageChangeOnProductTable(event) {
        if (event.pageSize !== this.pageSizeOnProductTable) {
            this.pageSizeOnProductTable = event.pageSize;
            this.pageNumberOnProductTable = this.paginationService.DEFAULT_PAGE_NUMBER;
            this.paginationService.cachePageSize(event.pageSize);
        } else {
            this.pageNumberOnProductTable = event.pageIndex + 1;
        }
        this.loadProducts();
    }

    handleSortClickOnHiddenProductTable(direction: string) {
        this.sortDirectionOnHiddenProductTable = direction;
        this.loadHiddenProducts();
    }

    handlePageChangeOnHiddenProductTable(event) {
        if (event.pageSize !== this.pageSizeOnHiddenProductTable) {
            this.pageSizeOnHiddenProductTable = event.pageSize;
            this.pageNumberOnHiddenProductTable = this.paginationService.DEFAULT_PAGE_NUMBER;
        } else {
            this.pageNumberOnHiddenProductTable = event.pageIndex + 1;
        }
        this.loadHiddenProducts();
    }

    onChangeStandaloneProduct(value: boolean) {
        if (value) {
            if (!this.editedProduct.qaTestConfig.assertionGroupNames) {
                this.editedProduct.qaTestConfig.assertionGroupNames = 'standalone-release';
            } else if (!this.editedProduct.qaTestConfig.assertionGroupNames.includes('standalone-release')) {
                this.editedProduct.qaTestConfig.assertionGroupNames += ',standalone-release';
            }
        } else {
            if (this.editedProduct.qaTestConfig.assertionGroupNames.includes('standalone-release')) {
                var arr = this.editedProduct.qaTestConfig.assertionGroupNames.split(',');
                arr = arr.filter(item => item !== 'standalone-release');
                this.editedProduct.qaTestConfig.assertionGroupNames = arr.join();
            }
        }
    }

    openUpdateConfigurationsModal(product: Product) {
        this.message = '';
        this.customRefsetCompositeKeys = '';
        this.editedProduct = (JSON.parse(JSON.stringify(product)));
        this.ensureBuildConfiguration();
        this.ensureQAConfiguration();
        this.ensureExtensionConfiguration();
        this.ensureManifestConfiguration();

        // parse custom refset composite keys
        if (this.editedProduct.buildConfiguration.customRefsetCompositeKeys
            && Object.keys(this.editedProduct.buildConfiguration.customRefsetCompositeKeys).length !== 0) {
            const customRefsetCompositeKeys = this.editedProduct.buildConfiguration.customRefsetCompositeKeys;
            const keys = Object.keys(customRefsetCompositeKeys);
            for (let index = 0; index < keys.length; index++) {
                if (index !== 0) {
                    this.customRefsetCompositeKeys += '|';
                }
                this.customRefsetCompositeKeys += keys[index] + '=' + customRefsetCompositeKeys[keys[index]].join();
            }
        }
        this.loadPreviousReleaseOptions();
        this.openUpdateProductModal();
    }

    openManifestConfigurationModal(product: Product) {
        this.editedProduct = JSON.parse(JSON.stringify(product));
        this.ensureExtensionConfiguration();
        this.ensureManifestConfiguration();
        this.manifestExcludedRefsetsSnapshot =
            this.editedProduct['manifestConfig'].excludedRefsets != null
                ? String(this.editedProduct['manifestConfig'].excludedRefsets)
                : '';
        this.partitionExcludedRefsetsFromSnapshot();
        this.openModal('manifest-configuration-modal');
        setTimeout(() => this.syncExcludedRefsetsSelectAllCheckbox(), 0);
    }

    clearPackageEffectiveTime(packageEffectiveTimeInput?: HTMLInputElement) {
        // `packageEffectiveTime` is optional, so clearing it should send an "empty" value to the backend.
        // The service converts `null` to '' when building the PATCH payload.
        this.ensureManifestConfiguration();
        this.editedProduct['manifestConfig'].packageEffectiveTime = null;
        if (packageEffectiveTimeInput) {
            packageEffectiveTimeInput.value = '';
        }
    }

    viewManifestSample() {
        this.ensureManifestConfiguration();
        this.normalizeOtherExcludedRefsetsInput();
        this.syncComposedExcludedRefsetsToManifest();     

        this.gereratingManifest = true;
        this.productService.generateManifest(this.activeReleaseCenter.id, this.editedProduct).subscribe(
            data => {
                const blob = new Blob([data], { type: 'application/xml' });
                const url = window.URL.createObjectURL(blob);
                window.open(url, '_blank');
                this.gereratingManifest = false;
            },
            errorResponse => {
                this.gereratingManifest = false;
                if (errorResponse.error) {
                    errorResponse.error = typeof errorResponse.error === 'string' ? JSON.parse(errorResponse.error) : errorResponse.error;
                }
                if (errorResponse.error && errorResponse.error.errorMessage) {
                    this.message = errorResponse.error.errorMessage;
                } else {
                    this.message = 'The manifest file could not be generated. Please contact technical support to get help resolving this.';
                }
                this.openErrorModel();
            }
        );
    }

    saveManifestConfiguration() {
        this.message = '';
        this.normalizeOtherExcludedRefsetsInput();
        this.syncComposedExcludedRefsetsToManifest();
        this.savingProduct = true;
        this.productService.updateManifestConfiguration(this.activeReleaseCenter.id, this.editedProduct).subscribe(
            response => {
                this.savingProduct = false;
                this.products[this.products.findIndex(p => p.id === response.id)] = response;
                this.productDataService.cacheProducts(this.products);
                this.editedProduct = JSON.parse(JSON.stringify(response));
                if (this.editedProduct.buildConfiguration && this.editedProduct.buildConfiguration.effectiveTime) {
                    this.editedProduct.buildConfiguration.effectiveTime = new Date(this.editedProduct.buildConfiguration.effectiveTime);
                }
                if (this.editedProduct.buildConfiguration
                    && this.editedProduct.buildConfiguration.extensionConfig
                    && this.editedProduct.buildConfiguration.extensionConfig.previousEditionDependencyEffectiveDate) {
                    this.editedProduct.buildConfiguration.extensionConfig.previousEditionDependencyEffectiveDate =
                        new Date(this.editedProduct.buildConfiguration.extensionConfig.previousEditionDependencyEffectiveDate);
                }
                this.ensureExtensionConfiguration();
                this.ensureManifestConfiguration();
                this.closeModal('manifest-configuration-modal');
                this.message = 'Manifest configuration has been updated successfully.';
                this.openSuccessModel();
            },
            errorResponse => {
                if (errorResponse.error && errorResponse.error.errorMessage) {
                    this.message = errorResponse.error.errorMessage;
                } else {
                    this.message = 'Failed to update manifest configuration. Please contact technical support to get help resolving this.';
                }
                this.openErrorModel();
                this.savingProduct = false;
            }
        );
    }

    private ensureBuildConfiguration() {
        if (!this.editedProduct.buildConfiguration) {
            this.editedProduct.buildConfiguration = new BuildConfiguration();
        }
        if (this.editedProduct.buildConfiguration.effectiveTime) {
            // Convert to Date
            const effectiveTime = new Date(this.editedProduct.buildConfiguration.effectiveTime);
            this.editedProduct.buildConfiguration.effectiveTime = effectiveTime;
        }
        if (this.editedProduct.buildConfiguration.extensionConfig &&
            this.editedProduct.buildConfiguration.extensionConfig.previousEditionDependencyEffectiveDate) {
            // Convert to Date
            const effectiveTime = new Date(this.editedProduct.buildConfiguration.extensionConfig.previousEditionDependencyEffectiveDate);
            this.editedProduct.buildConfiguration.extensionConfig.previousEditionDependencyEffectiveDate = effectiveTime;
        }
    }

    private ensureQAConfiguration() {
        if (!this.editedProduct.qaTestConfig) {
            this.editedProduct.qaTestConfig = new QAConfiguration();
        }
    }

    private ensureExtensionConfiguration() {
        if (!this.editedProduct.buildConfiguration.extensionConfig) {
            this.editedProduct.buildConfiguration.extensionConfig = new ExtensionConfig();
        }
    }

    private ensureManifestConfiguration() {
        if (!this.editedProduct['manifestConfig']) {
            this.editedProduct['manifestConfig'] = {};
        }
        if (typeof this.editedProduct['manifestConfig'].packageSimpleRefsetsIndividually !== 'boolean') {
            this.editedProduct['manifestConfig'].packageSimpleRefsetsIndividually = false;
        }
        const mc = this.editedProduct['manifestConfig'];
        if (mc.excludedRefsets != null && typeof mc.excludedRefsets !== 'string') {
            mc.excludedRefsets = String(mc.excludedRefsets);
        }
    }

    isOptionalManifestRefsetSelected(refsetId: string | number): boolean {
        const sid = String(refsetId);
        return this.selectedOptionalManifestRefsetIds.indexOf(sid) !== -1;
    }

    toggleOptionalManifestRefsetSelection(refsetId: string | number, checked: boolean) {
        const sid = String(refsetId);
        if (checked) {
            if (this.selectedOptionalManifestRefsetIds.indexOf(sid) === -1) {
                this.selectedOptionalManifestRefsetIds = this.selectedOptionalManifestRefsetIds.concat([sid]);
            }
        } else {
            this.selectedOptionalManifestRefsetIds = this.selectedOptionalManifestRefsetIds.filter(id => id !== sid);
        }
    }

    onOptionalManifestRefsetRowChange(refsetId: string | number, checked: boolean) {
        this.toggleOptionalManifestRefsetSelection(refsetId, checked);
        setTimeout(() => this.syncExcludedRefsetsSelectAllCheckbox(), 0);
    }

    /** Select every refset shown in the release-center list; keeps IDs already selected that are not in that list. */
    selectAllExcludedManifestRefsets() {
        const unknown = this.unknownOptionalManifestRefsetIds;
        const listIds = this.optionalManifestRefsets.map(r => String(r.id));
        this.selectedOptionalManifestRefsetIds = [...unknown, ...listIds];
    }

    private deselectListedExcludedManifestRefsets() {
        const listIdSet = new Set(this.optionalManifestRefsets.map(r => String(r.id)));
        this.selectedOptionalManifestRefsetIds = this.selectedOptionalManifestRefsetIds.filter(id => !listIdSet.has(id));
    }

    onExcludedRefsetsSelectAllChange(checked: boolean) {
        if (checked) {
            this.selectAllExcludedManifestRefsets();
        } else {
            this.deselectListedExcludedManifestRefsets();
        }
        setTimeout(() => this.syncExcludedRefsetsSelectAllCheckbox(), 0);
    }

    private syncExcludedRefsetsSelectAllCheckbox() {
        const el = this.excludedRefsetsSelectAllRef?.nativeElement;
        if (!el) {
            return;
        }
        const n = this.optionalManifestRefsets.length;
        if (n === 0) {
            el.checked = false;
            el.indeterminate = false;
            return;
        }
        let selectedCount = 0;
        for (const ref of this.optionalManifestRefsets) {
            if (this.selectedOptionalManifestRefsetIds.indexOf(String(ref.id)) !== -1) {
                selectedCount++;
            }
        }
        el.indeterminate = selectedCount > 0 && selectedCount < n;
        el.checked = selectedCount === n;
    }

    get unknownOptionalManifestRefsetIds(): string[] {
        const known = new Set(this.optionalManifestRefsets.map(r => String(r.id)));
        return this.selectedOptionalManifestRefsetIds.filter(id => !known.has(id));
    }

    /** Split index for two columns: first column gets the first half (rounded up), second column gets the rest. */
    private get optionalManifestRefsetsColumnSplitIndex(): number {
        const n = this.optionalManifestRefsets.length;
        return n === 0 ? 0 : Math.ceil(n / 2);
    }

    get optionalManifestRefsetsFirstColumn(): OptionalManifestRefset[] {
        return this.optionalManifestRefsets.slice(0, this.optionalManifestRefsetsColumnSplitIndex);
    }

    get optionalManifestRefsetsSecondColumn(): OptionalManifestRefset[] {
        return this.optionalManifestRefsets.slice(this.optionalManifestRefsetsColumnSplitIndex);
    }

    private partitionExcludedRefsetsFromSnapshot() {
        const raw = this.manifestExcludedRefsetsSnapshot;
        if (!raw || !String(raw).trim()) {
            this.selectedOptionalManifestRefsetIds = [];
            this.otherExcludedRefsets = '';
            return;
        }
        const allIds = String(raw)
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length !== 0);
        const optionalIdSet = new Set(this.optionalManifestRefsets.map(r => r.id));
        if (optionalIdSet.size === 0) {
            this.selectedOptionalManifestRefsetIds = [];
            this.otherExcludedRefsets = allIds.join(', ');
            return;
        }
        this.selectedOptionalManifestRefsetIds = allIds.filter(id => optionalIdSet.has(id));
        this.otherExcludedRefsets = allIds.filter(id => !optionalIdSet.has(id)).join(', ');
    }

    private syncComposedExcludedRefsetsToManifest() {
        this.ensureManifestConfiguration();
        const merged: string[] = [];
        const seen = new Set<string>();
        for (const id of this.selectedOptionalManifestRefsetIds) {
            if (!seen.has(id)) {
                seen.add(id);
                merged.push(id);
            }
        }
        for (const id of this.parseCommaSeparatedRefsetIds(this.otherExcludedRefsets)) {
            if (!seen.has(id)) {
                seen.add(id);
                merged.push(id);
            }
        }
        this.editedProduct['manifestConfig'].excludedRefsets = merged.length > 0 ? merged.join(',') : '';
    }

    private parseCommaSeparatedRefsetIds(value: string): string[] {
        if (!value || typeof value !== 'string') {
            return [];
        }
        return value.split(',').map(s => s.trim()).filter(s => s.length !== 0);
    }

    /** Normalize "Other Excluded Refsets" to comma + space between IDs (still parsed as comma-separated for save). */
    normalizeOtherExcludedRefsetsInput() {
        const ids = this.parseCommaSeparatedRefsetIds(this.otherExcludedRefsets);
        this.otherExcludedRefsets = ids.length > 0 ? ids.join(', ') : '';
    }

    private loadOptionalManifestRefsets(releaseCenterKey: string) {
        this.optionalManifestRefsetsLoadError = null;
        this.productService.getOptionalManifestRefsets(releaseCenterKey).subscribe(
            data => {
                this.optionalManifestRefsets = (data || []).map(item => ({
                    id: String(item.id),
                    term: item.term
                }));
                setTimeout(() => this.syncExcludedRefsetsSelectAllCheckbox(), 0);
            },
            () => {
                this.optionalManifestRefsets = [];
                this.optionalManifestRefsetsLoadError = 'Excluded refsets could not be loaded. Other manifest settings are still available.';
            }
        );
    }

    openProductVisibilityModal(product: Product) {
        this.selectedProduct = product;
        this.openModal('hide-product-confirmation-modal');
    }

    openHiddenProductVisibilityModal(product: Product) {
        this.selectedProduct = product;
        this.openModal('unhide-product-confirmation-modal');
    }

    hideProduct() {
        this.openWaitingModel('Hiding product');
        this.closeModal('hide-product-confirmation-modal');
        this.productService.updateProductVisibility(this.activeReleaseCenter.id, this.selectedProduct.id, false).subscribe(
            () => {
                if (this.pageNumberOnProductTable.valueOf() !== this.paginationService.DEFAULT_PAGE_NUMBER && this.products.length === 1) {
                    this.pageNumberOnProductTable = this.pageNumberOnProductTable.valueOf() - 1;
                }
                this.loadProducts();
                this.message = 'Product \'' + this.selectedProduct.name + '\' has been hidden successfully.';
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

    unhideProduct() {
        this.openWaitingModel('Unhiding product');
        this.closeModal('unhide-product-confirmation-modal');
        this.productService.updateProductVisibility(this.activeReleaseCenter.id, this.selectedProduct.id, true).subscribe(
            () => {
                if (this.pageNumberOnHiddenProductTable.valueOf() !== this.paginationService.DEFAULT_PAGE_NUMBER
                    && this.hiddenProducts.length === 1) {
                    this.pageNumberOnHiddenProductTable = this.pageNumberOnHiddenProductTable.valueOf() - 1;
                }
                this.loadHiddenProducts();
                this.loadProducts();
                this.message = 'Product \'' + this.selectedProduct.name + '\' has been marked as visible successfully.';
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

    /** True when manifest file upload is not allowed (auto-generated manifest is enabled). */
    isManifestUploadDisabled(product: Product): boolean {
        return !!product?.['manifestConfig']?.autoGenerateManifest;
    }

    checkManifestFile(product: Product) {
        if (this.isManifestUploadDisabled(product)) {
            return;
        }
        this.selectedProduct = product;
        if (this.productsWithManifestUploaded.indexOf(product.id) === -1) {
            this.openUploadManifestFileDialog();
        } else {
            this.openManifestConfirmationModal();
        }
    }

    loadManifestFile(product: Product) {
        if (this.productsWithManifestUploaded.indexOf(product.id) === -1) {
            return;
        }

        this.selectedProduct = product;
        this.message = '';
        this.productService.loadManifestFile(this.activeReleaseCenter.id, product.id).subscribe(
            data => {
                const blob = new Blob([data], { type: 'application/xml'});
                const url = window.URL.createObjectURL(blob);
                window.open(url, '_blank');
            },
            () => {
                this.message = 'The manifest file does not exist for product ' + this.selectedProduct.name + '.';
                this.openErrorModel();
            }
        );
    }

    openUploadManifestFileDialog() {
        if (this.isManifestUploadDisabled(this.selectedProduct)) {
            return;
        }
        const el: HTMLElement = this.uploadManifestFileInput.nativeElement;
        el.click();
    }

    uploadManifestFile(event) {
        if (this.isManifestUploadDisabled(this.selectedProduct)) {
            event.target.value = '';
            return;
        }
        this.message = '';
        const product = this.products.find(p => p.id === this.selectedProduct.id);
        product.manifestFileUploading = true;
        if (event.target.files.length > 0) {
            const formData = new FormData();
            formData.append('file', event.target.files[0]) ;
            this.productService.uploadManifest(this.activeReleaseCenter.id, this.selectedProduct.id, formData).subscribe(
                () => {
                    product.manifestFileUploading = false;
                    this.productsWithManifestUploaded.push( this.selectedProduct.id);
                },
                errorResponse => {
                    product.manifestFileUploading = false;
                    this.message = 'Failed to upload the Manifest file. Error: '
                    + (errorResponse.error && errorResponse.error.errorMessage ? errorResponse.error.errorMessage : errorResponse.error);
                    this.openErrorModel();
                }
            );
            event.target.value = '';
        }
    }

    missingFieldsCheck(productName): Object[] {
        const missingFields = [];
        if (!productName) { missingFields.push('Product Name'); }

        return missingFields;
    }

    productConfigurationMissingFieldsCheck(product: Product): Object[] {
        const missingFields = [];
        if (!product.buildConfiguration.effectiveTime) { missingFields.push('Effective Time'); }
        if (!product.buildConfiguration.readmeHeader) { missingFields.push('Readme Header'); }
        if (!product.buildConfiguration.readmeEndDate) { missingFields.push('Readme End Date'); }

        return missingFields;
    }

    canAddProduct() {
        const codeSystem = this.activeReleaseCenter && this.activeReleaseCenter.codeSystem ? this.activeReleaseCenter.codeSystem : '';
        return this.roles && codeSystem && (
            (this.roles.hasOwnProperty('GLOBAL') && (
                   (<Array<String>> this.roles['GLOBAL']).indexOf('RELEASE_ADMIN') !== -1
                || (<Array<String>> this.roles['GLOBAL']).indexOf('RELEASE_MANAGER') !== -1
                || (<Array<String>> this.roles['GLOBAL']).indexOf('RELEASE_LEAD') !== -1)
                )
            || (this.roles.hasOwnProperty(codeSystem) && (
                   (<Array<String>> this.roles[codeSystem]).indexOf('RELEASE_ADMIN') !== -1
                || (<Array<String>> this.roles[codeSystem]).indexOf('RELEASE_MANAGER') !== -1
                || (<Array<String>> this.roles[codeSystem]).indexOf('RELEASE_LEAD') !== -1)
                )
            );
    }

    // load code systems from cache, other from server
    loadCodeSystems(releaseCenterService, releaseServer) {
        const promise = new Promise(function(resolve, reject) {
            const codeSystems = releaseCenterService.getCachedCodeSystems();
            if (codeSystems && codeSystems.length !== 0) {
                resolve(codeSystems);
                return;
            }
            releaseServer.getCodeSystems().subscribe(data => resolve(data));
        });

        return promise;
    }

    openModal(name) {
        this.modalService.open(name);
    }

    closeModal(name) {
        this.modalService.close(name);
    }

    private openWaitingModel(action: string) {
        this.action = action;
        this.openModal('product-waiting-modal');
    }

    private closeWaitingModel() {
        this.closeModal('product-waiting-modal');
    }

    private openManifestConfirmationModal() {
        this.openModal('manifest-confirmation-modal');
    }

    private closeAddProductModal() {
        this.closeModal('add-product-modal');
    }

    private openUpdateProductModal() {
        this.openModal('update-product-modal');
    }

    private closeUpdateProductModal() {
        this.closeModal('update-product-modal');
    }

    private openProductCreationSuccessModal() {
        this.openModal('product-creation-success-modal');
    }

    private openSuccessModel() {
        this.openModal('product-success-modal');
    }

    private openErrorModel() {
        this.openModal('product-error-modal');
    }
}
