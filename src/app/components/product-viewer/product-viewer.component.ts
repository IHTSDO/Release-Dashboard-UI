import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
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

@Component({
    selector: 'app-product-viewer',
    templateUrl: './product-viewer.component.html',
    styleUrls: ['./product-viewer.component.scss']
})
export class ProductViewerComponent implements OnInit, OnDestroy {

    private activeReleaseCenterSubscription: Subscription;

    @ViewChild('uploadManifestFileInput') uploadManifestFileInput: ElementRef<HTMLElement>;

    activeReleaseCenter: ReleaseCenter;
    products: Product[];
    selectedProduct: Product;
    editedProduct: Product;
    customRefsetCompositeKeys: string;
    roles: Object;

    productsLoading = false;

    // animations
    saveResponse: string;
    savingProduct = false;

    // pagination
    pageSize: Number;
    pageNumber: Number;
    totalProduct: Number;

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
            this.products = [];
            this.message = '';
            this.pageNumber = this.paginationService.getSelectedPage(this.activeReleaseCenter.id);
            this.totalProduct = this.paginationService.EMPTY_ITEMS;
            this.productDataService.clearCachedProducts();
            this.customRefsetCompositeKeys = null;
            this.initializeEditingProduct();
            this.loadProducts();
        });
    }

    ngOnInit(): void {
        this.roles = this.permissionService.roles;
        this.customRefsetCompositeKeys = null;
        this.pageSize = this.paginationService.DEFAULT_PAGE_SIZE;
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
        this.paginationService.cacheSelectedPage(this.activeReleaseCenter.id, this.pageNumber);
    }

    createProduct(productName) {
        this.saveResponse = '';
        this.message = '';
        const missingFields = this.missingFieldsCheck(productName.trim());
        if (missingFields.length !== 0) {
            this.saveResponse = 'Missing Fields: ' + missingFields.join(', ') + '.';
            return;
        }

        this.savingProduct = true;
        this.productService.createProduct(this.activeReleaseCenter.id, productName).subscribe(data => {
            this.selectedProduct = data;
            this.pageNumber = this.paginationService.DEFAULT_PAGE_NUMBER;
            this.loadProducts();
            this.message = 'Product ' + productName + ' has been created successfully. Please update the configurations';
            this.closeAddProductModal();
            this.openProductCreationSuccessModal();
        },
        errorResponse => {
            this.savingProduct = false;
            this.saveResponse = errorResponse.error.errorMessage;
        },
        () => {
            this.savingProduct = false;
        });
    }

    updateProduct(product: Product, customRefsetCompositeKeys: string) {
        this.saveResponse = '';
        this.message = '';
        const missingFields = this.productConfigurationMissingFieldsCheck(product);
        if (missingFields.length !== 0) {
            this.saveResponse = 'Missing Fields: ' + missingFields.join(', ') + '.';
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
                this.saveResponse = errorResponse.error.errorMessage;
            },
            () => {
                this.savingProduct = false;
            }
        );
    }

    loadProducts() {
        this.productsLoading = true;
        this.productService.getProducts(this.activeReleaseCenter.id, this.pageNumber, this.pageSize).subscribe(response => {
            this.products = response['content'];
            this.totalProduct = response['totalElements'];
            this.productsLoading = false;
            this.productDataService.cacheProducts(this.products);
        });
    }

    handlePageChange(event) {
        this.pageNumber = event;
        this.loadProducts();
    }

    openUpdateConfigurationsModal(product: Product) {
        this.saveResponse = '';
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

    hideProduct() {
        this.openWaitingModel('Hiding product');
        this.closeModal('hide-product-confirmation-modal');
        this.productService.updateProductVisibility(this.activeReleaseCenter.id, this.selectedProduct.id, false).subscribe(
            () => {
                if (this.pageNumber.valueOf() !== this.paginationService.DEFAULT_PAGE_NUMBER && this.products.length === 1) {
                    this.pageNumber = this.pageNumber.valueOf() - 1;
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

    checkManifestFile(product: Product) {
        this.selectedProduct = product;
        this.productService.getManifest(this.activeReleaseCenter.id, product.id).subscribe(
            data => {
                if (data.hasOwnProperty('filename')) {
                    this.openManifestConfirmationModal();
                } else {
                    this.openUploadManifestFileDialog();
                }
            },
            () => {
                this.openUploadManifestFileDialog();
            }
        );
    }

    loadManifestFile(product: Product) {
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
                },
                errorResponse => {
                    product.manifestFileUploading = false;
                    this.message = 'Failed to upload the Manifest file. Error: ' + errorResponse.error.errorMessage;
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
                   (<Array<String>> this.roles['GLOBAL']).indexOf('RAD_ADMIN') !== -1
                || (<Array<String>> this.roles['GLOBAL']).indexOf('RELEASE_MANAGER') !== -1
                || (<Array<String>> this.roles['GLOBAL']).indexOf('RELEASE_LEAD') !== -1)
                )
            || (this.roles.hasOwnProperty(codeSystem) && (
                   (<Array<String>> this.roles[codeSystem]).indexOf('RAD_ADMIN') !== -1
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
