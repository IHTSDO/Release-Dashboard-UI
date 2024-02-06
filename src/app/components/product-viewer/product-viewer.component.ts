import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Input } from '@angular/core';
import { Subscription } from 'rxjs';
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
import { MatPaginator } from '@angular/material/paginator';

@Component({
    selector: 'app-product-viewer',
    templateUrl: './product-viewer.component.html',
    styleUrls: ['./product-viewer.component.scss']
})
export class ProductViewerComponent implements OnInit, OnDestroy {

    private activeReleaseCenterSubscription: Subscription;

    @ViewChild('uploadManifestFileInput') uploadManifestFileInput: ElementRef<HTMLElement>;
    @ViewChild('productPaginator') productPaginator: MatPaginator;
    @ViewChild('hiddenProductPaginator') hiddenProductPaginator: MatPaginator;

    activeReleaseCenter: ReleaseCenter;
    products: Product[];
    hiddenProducts: Product[];
    selectedProduct: Product;
    editedProduct: Product;
    customRefsetCompositeKeys: string;
    roles: Object;
    productsWithManifestUploaded: string[];

    // animations
    savingProduct = false;

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

    constructor(private releaseCenterService: ReleaseCenterService,
                private modalService: ModalService,
                private productService: ProductService,
                private productDataService: ProductDataService,
                private permissionService: PermissionService,
                private paginationService: ProductPaginationService) {
        this.activeReleaseCenterSubscription = this.releaseCenterService.getActiveReleaseCenter().subscribe(response => {
            this.activeReleaseCenter = response;


            this.message = '';
            this.productsWithManifestUploaded = [];

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
        });
    }

    ngOnInit(): void {
        this.roles = this.permissionService.roles;
        this.customRefsetCompositeKeys = null;
        this.totalProduct = this.paginationService.EMPTY_ITEMS;
        this.initializeEditingProduct();
    }

    ngOnDestroy() {
        this.activeReleaseCenterSubscription.unsubscribe();
    }

    initializeEditingProduct() {
        const buildConfiguration = new BuildConfiguration();
        const qaTestConfiguration = new QAConfiguration();
        const extensionConfig = new ExtensionConfig();
        buildConfiguration.extensionConfig = extensionConfig;
        this.editedProduct = new Product();
        this.editedProduct.buildConfiguration = buildConfiguration;
        this.editedProduct.qaTestConfig = qaTestConfiguration;
    }

    onSelectProduct() {
        this.paginationService.cacheSelectedPage(this.activeReleaseCenter.id, this.pageNumberOnProductTable);
    }

    createProduct(productName) {
        this.message = '';
        const missingFields = this.missingFieldsCheck(productName.trim());
        if (missingFields.length !== 0) {
            this.message = 'Please enter the following fields: ' + missingFields.join(', ') + '.';
            this.openErrorModel();
            return;
        }

        this.savingProduct = true;
        this.productService.createProduct(this.activeReleaseCenter.id, productName).subscribe(data => {
            this.selectedProduct = data;
            this.pageNumberOnProductTable = this.paginationService.DEFAULT_PAGE_NUMBER;
            this.loadProducts();
            this.message = 'Product ' + productName + ' has been created successfully. Please update the configurations';
            this.closeAddProductModal();
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
            this.openErrorModel();
        },
        () => {
            this.savingProduct = false;
        });
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
                this.message = 'Failed to update product. Error: ';
                if (errorResponse.status >= 500) {
                    this.message += (errorResponse.error.HTTPStatus.replaceAll('_', ' ')
                                + '.\nPlease contact technical support to get help resolving this.');
                } else {
                    this.message += errorResponse.error.errorMessage;
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
        if (!product.buildConfiguration) {
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
        if (!product.qaTestConfig) {
            this.editedProduct.qaTestConfig = new QAConfiguration();
        }
        if (!this.editedProduct.buildConfiguration.extensionConfig) {
            this.editedProduct.buildConfiguration.extensionConfig = new ExtensionConfig();
        }

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

        this.openUpdateProductModal();
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

    checkManifestFile(product: Product) {
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
        const el: HTMLElement = this.uploadManifestFileInput.nativeElement;
        el.click();
    }

    uploadManifestFile(event) {
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
