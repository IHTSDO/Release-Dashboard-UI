import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { ReleaseCenterService } from '../../services/releaseCenter/release-center.service';
import { ProductService } from '../../services/product/product.service';
import { ReleaseCenter } from '../../models/releaseCenter';
import { ProductDataService } from '../../services/product/product-data.service';
import { ModalService } from '../../services/modal/modal.service';
import { Product } from '../../models/product';
import { ProductPaginationService } from '../../services/pagination/product-pagination.service';
import { PermissionService } from '../../services/permission/permission.service';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { ReleaseServerService } from '../../services/releaseServer/release-server.service';
import { ModalComponent } from '../modal/modal.component';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SortDirective } from 'src/app/directive/sort.directive';
import { LeftSidebarComponent } from '../left-sidebar/left-sidebar.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { OptionalManifestRefset } from 'src/app/models/optionalManifestRefset';
import { ProductActionButtonsComponent } from '../product-action-buttons/product-action-buttons.component';

@Component({
    selector: 'app-product-viewer',
    imports: [
        CommonModule, RouterLink, SortDirective, ModalComponent, MatPaginatorModule,
        MatTooltipModule, LeftSidebarComponent, ProductActionButtonsComponent
    ],
    templateUrl: './product-viewer.component.html',
    styleUrls: ['./product-viewer.component.scss']
})
export class ProductViewerComponent implements OnInit, OnDestroy {

    private activeReleaseCenterSubscription: Subscription;

    @ViewChild('productPaginator') productPaginator: MatPaginator;
    @ViewChild('hiddenProductPaginator') hiddenProductPaginator: MatPaginator;
    @ViewChild('postCreateProductActions') postCreateProductActions: ProductActionButtonsComponent;

    activeReleaseCenter: ReleaseCenter;
    products: Product[];
    hiddenProducts: Product[];
    selectedProduct: Product;
    roles: object;
    loadingReleasePackagesDone = false;
    codeSystemToReleasePackageMap: Record<string, unknown> = {};
    optionalManifestRefsets: OptionalManifestRefset[] = [];
    optionalManifestRefsetsLoadError: string | null = null;

    pageSizeOnProductTable = 20;
    pageSizeOnHiddenProductTable = 20;

    productsLoading = false;
    pageNumberOnProductTable: number;
    totalProduct = 0;
    sortDirectionOnProductTable: string;

    hiddenProductsLoading = false;
    totalHiddenProduct = 0;
    sortDirectionOnHiddenProductTable: string;
    pageNumberOnHiddenProductTable: number;

    message: string;
    action: string;
    savingProduct = false;

    constructor(
        private releaseCenterService: ReleaseCenterService,
        private modalService: ModalService,
        private productService: ProductService,
        private productDataService: ProductDataService,
        private permissionService: PermissionService,
        private paginationService: ProductPaginationService,
        private releaseServerService: ReleaseServerService
    ) {
        this.activeReleaseCenterSubscription = this.releaseCenterService.getActiveReleaseCenter().subscribe(response => {
            this.activeReleaseCenter = response;
            this.message = '';
            this.products = [];
            this.pageNumberOnProductTable = this.paginationService.getSelectedPage(this.activeReleaseCenter.id);
            this.pageSizeOnProductTable = this.paginationService.getPageSize() ? this.paginationService.getPageSize() : 20;
            this.sortDirectionOnProductTable = 'asc';
            this.hiddenProducts = [];
            this.pageNumberOnHiddenProductTable = this.paginationService.DEFAULT_PAGE_NUMBER;
            this.pageSizeOnHiddenProductTable = this.paginationService.DEFAULT_PAGE_SIZE;
            this.sortDirectionOnHiddenProductTable = 'asc';
            this.productDataService.clearCachedProducts();
            this.loadProducts();
            this.loadReleasePackages();
            this.loadOptionalManifestRefsets(this.activeReleaseCenter.id);
        });
    }

    ngOnInit(): void {
        this.roles = this.permissionService.roles;
        this.totalProduct = this.paginationService.EMPTY_ITEMS;
    }

    ngOnDestroy(): void {
        this.activeReleaseCenterSubscription.unsubscribe();
    }

    onProductUpdated(updated: Product): void {
        const index = this.products.findIndex(p => p.id === updated.id);
        if (index !== -1) {
            this.products[index] = updated;
            this.productDataService.cacheProducts(this.products);
        }
        if (this.selectedProduct?.id === updated.id) {
            this.selectedProduct = updated;
        }
    }

    onProductActionFeedbackSuccess(message: string): void {
        this.message = message;
        this.openSuccessModel();
    }

    onProductActionFeedbackError(message: string): void {
        this.message = message;
        this.openErrorModel();
    }

    onSelectProduct(): void {
        this.paginationService.cacheSelectedPage(this.activeReleaseCenter.id, this.pageNumberOnProductTable);
    }

    createProduct(productName: string, snomedCtProduct: string, force = false): void {
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
        this.productService.createProduct(this.activeReleaseCenter.id, productName, snomedCtProduct).subscribe(
            data => {
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
                    if (errorResponse.error?.errorMessage) {
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
            }
        );
    }

    loadReleasePackages(): void {
        const cachedReleasePackageMap = this.releaseCenterService.getCachedReleasePackages();
        if (cachedReleasePackageMap) {
            this.handleReleasePackages(cachedReleasePackageMap);
        } else {
            this.releaseServerService.getReleases().subscribe(
                data => this.handleReleasePackages(data),
                error => console.error('ERROR: Release Packages failed to load. Error: ' + error)
            );
        }
    }

    handleReleasePackages(data: unknown): void {
        this.codeSystemToReleasePackageMap = data as Record<string, unknown>;
        this.loadingReleasePackagesDone = true;
    }

    loadProducts(): void {
        this.productsLoading = true;
        this.productService.getProducts(
            this.activeReleaseCenter.id,
            this.pageNumberOnProductTable,
            this.pageSizeOnProductTable,
            'name',
            this.sortDirectionOnProductTable
        ).subscribe(response => {
            this.products = response['content'];
            this.totalProduct = parseInt(response['totalElements'], 10);
            this.productsLoading = false;
            this.productDataService.cacheProducts(this.products);
            this.productPaginator.pageIndex = this.pageNumberOnProductTable.valueOf() - 1;
        });
    }

    resetHiddenProductTable(): void {
        this.hiddenProducts = [];
        this.totalHiddenProduct = this.paginationService.EMPTY_ITEMS;
        this.pageNumberOnHiddenProductTable = this.paginationService.DEFAULT_PAGE_NUMBER;
        this.sortDirectionOnHiddenProductTable = 'asc';
        if (this.hiddenProductPaginator) {
            this.hiddenProductPaginator.firstPage();
        }
    }

    loadHiddenProducts(): void {
        this.hiddenProductsLoading = true;
        this.productService.getHiddenProducts(
            this.activeReleaseCenter.id,
            this.pageNumberOnHiddenProductTable,
            this.pageSizeOnHiddenProductTable,
            'name',
            this.sortDirectionOnHiddenProductTable
        ).subscribe(response => {
            this.hiddenProducts = response['content'];
            this.totalHiddenProduct = parseInt(response['totalElements'], 10);
            this.hiddenProductsLoading = false;
        });
    }

    handleSortClickOnProductTable(direction: string): void {
        this.sortDirectionOnProductTable = direction;
        this.loadProducts();
    }

    handlePageChangeOnProductTable(event): void {
        if (event.pageSize !== this.pageSizeOnProductTable) {
            this.pageSizeOnProductTable = event.pageSize;
            this.pageNumberOnProductTable = this.paginationService.DEFAULT_PAGE_NUMBER;
            this.paginationService.cachePageSize(event.pageSize);
        } else {
            this.pageNumberOnProductTable = event.pageIndex + 1;
        }
        this.loadProducts();
    }

    handleSortClickOnHiddenProductTable(direction: string): void {
        this.sortDirectionOnHiddenProductTable = direction;
        this.loadHiddenProducts();
    }

    handlePageChangeOnHiddenProductTable(event): void {
        if (event.pageSize !== this.pageSizeOnHiddenProductTable) {
            this.pageSizeOnHiddenProductTable = event.pageSize;
            this.pageNumberOnHiddenProductTable = this.paginationService.DEFAULT_PAGE_NUMBER;
        } else {
            this.pageNumberOnHiddenProductTable = event.pageIndex + 1;
        }
        this.loadHiddenProducts();
    }

    private loadOptionalManifestRefsets(releaseCenterKey: string): void {
        this.optionalManifestRefsetsLoadError = null;
        this.productService.getOptionalManifestRefsets(releaseCenterKey).subscribe(
            data => {
                this.optionalManifestRefsets = (data || []).map(item => ({
                    id: String(item.id),
                    term: item.term
                }));
            },
            () => {
                this.optionalManifestRefsets = [];
                this.optionalManifestRefsetsLoadError =
                    'Excluded refsets could not be loaded. Other manifest settings are still available.';
            }
        );
    }

    openProductVisibilityModal(product: Product): void {
        this.selectedProduct = product;
        this.openModal('hide-product-confirmation-modal');
    }

    openHiddenProductVisibilityModal(product: Product): void {
        this.selectedProduct = product;
        this.openModal('unhide-product-confirmation-modal');
    }

    hideProduct(): void {
        this.openWaitingModel('Hiding product');
        this.closeModal('hide-product-confirmation-modal');
        this.productService.updateProductVisibility(this.activeReleaseCenter.id, this.selectedProduct.id, false).subscribe(
            () => {
                if (this.pageNumberOnProductTable.valueOf() !== this.paginationService.DEFAULT_PAGE_NUMBER
                    && this.products.length === 1) {
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

    unhideProduct(): void {
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

    missingFieldsCheck(productName: string): string[] {
        const missingFields: string[] = [];
        if (!productName) {
            missingFields.push('Product Name');
        }
        return missingFields;
    }

    canAddProduct(): boolean {
        const codeSystem = this.activeReleaseCenter?.codeSystem ?? '';
        const roles = this.roles as Record<string, string[]>;
        return !!roles && !!codeSystem && (
            (roles['GLOBAL'] && (
                roles['GLOBAL'].indexOf('RELEASE_ADMIN') !== -1
                || roles['GLOBAL'].indexOf('RELEASE_MANAGER') !== -1
                || roles['GLOBAL'].indexOf('RELEASE_LEAD') !== -1
            ))
            || (roles[codeSystem] && (
                roles[codeSystem].indexOf('RELEASE_ADMIN') !== -1
                || roles[codeSystem].indexOf('RELEASE_MANAGER') !== -1
                || roles[codeSystem].indexOf('RELEASE_LEAD') !== -1
            ))
        );
    }

    openModal(name: string): void {
        this.modalService.open(name);
    }

    closeModal(name: string): void {
        this.modalService.close(name);
    }

    private openWaitingModel(action: string): void {
        this.action = action;
        this.openModal('product-waiting-modal');
    }

    private closeWaitingModel(): void {
        this.closeModal('product-waiting-modal');
    }

    private closeAddProductModal(): void {
        this.closeModal('add-product-modal');
    }

    private openProductCreationSuccessModal(): void {
        this.openModal('product-creation-success-modal');
    }

    private openSuccessModel(): void {
        this.openModal('product-success-modal');
    }

    private openErrorModel(): void {
        this.openModal('product-error-modal');
    }
}
