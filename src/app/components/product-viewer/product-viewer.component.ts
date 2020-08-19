import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ReleaseCenterService } from '../../services/releaseCenter/release-center.service';
import { ProductService } from '../../services/product/product.service';
import { ReleaseCenter } from '../../models/releaseCenter';
import { ProductDataService } from '../../services/product/product-data.service';
import { ModalService } from '../../services/modal/modal.service';
import { trigger, state, style, keyframes, transition, animate } from '@angular/animations';
import { Product } from '../../models/product';
import { BuildConfiguration } from '../../models/buildConfiguration';
import { QAConfiguration } from '../../models/qaConfiguration';
import { ExtensionConfig } from '../../models/extensionConfig';

@Component({
    selector: 'app-product-viewer',
    templateUrl: './product-viewer.component.html',
    styleUrls: ['./product-viewer.component.scss'],
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
export class ProductViewerComponent implements OnInit, OnDestroy {

    private activeReleaseCenterSubscription: Subscription;

    activeReleaseCenter: ReleaseCenter;
    products: Product[];
    selectedProduct: Product;
    customRefsetCompositeKeys: string;

    productsLoading = false;

    // animations
    saved = 'start';
    saveResponse: string;
    savingProduct = false;

    constructor(private releaseCenterService: ReleaseCenterService,
                private modalService: ModalService,
                private productService: ProductService,
                private productDataService: ProductDataService) {
        this.activeReleaseCenterSubscription = this.releaseCenterService.getActiveReleaseCenter().subscribe(response => {
            this.activeReleaseCenter = response;
            this.products = [];
            this.productDataService.clearCachedProducts();
            this.loadProducts();
        });
    }

    ngOnInit(): void {
        this.customRefsetCompositeKeys = null;
        this.initializeSelectedProduct();
    }

    ngOnDestroy() {
        this.activeReleaseCenterSubscription.unsubscribe();
    }

    initializeSelectedProduct() {
        const buildConfiguration = new BuildConfiguration();
        const qaTestConfiguration = new QAConfiguration();
        const extensionConfig = new ExtensionConfig();
        buildConfiguration.extensionConfig = extensionConfig;
        this.selectedProduct = new Product();
        this.selectedProduct.buildConfiguration = buildConfiguration;
        this.selectedProduct.qaTestConfig = qaTestConfiguration;
    }

    createProduct(productName) {
        this.savingProduct = true;
        this.productService.createProduct(this.activeReleaseCenter.id, productName).subscribe(response => {
            this.loadProducts();
            this.closeModal('add-product-modal');
            this.savingProduct = false;
        },
        errorResponse => {
            this.savingProduct = false;
            this.saveResponse = errorResponse.error.errorMessage;
            this.saved = (this.saved === 'start' ? 'end' : 'start');
        });
    }

    updateProduct(product: Product, customRefsetCompositeKeys: string) {
        this.savingProduct = true;
        this.productService.patchProduct(this.activeReleaseCenter.id, product, customRefsetCompositeKeys).subscribe(
            response => {
                this.products[this.products.findIndex(p => p.id === response.id)] = response;
                this.savingProduct = false;
                this.productDataService.cacheProducts(this.products);
                this.closeModal('update-product-modal');
            },
            errorResponse => {
                this.savingProduct = false;
                this.saveResponse = errorResponse.error.errorMessage;
                this.saved = (this.saved === 'start' ? 'end' : 'start');
            }
        );
    }

    loadProducts() {
        this.productsLoading = true;
        this.productService.getProducts(this.activeReleaseCenter.id).subscribe(products => {
            this.products = products;
            this.productsLoading = false;
            this.productDataService.cacheProducts(this.products);
        });
    }

    openUpdateConfigurationsModal(product: Product) {
        this.saveResponse = '';
        this.customRefsetCompositeKeys = '';
        this.selectedProduct = (JSON.parse(JSON.stringify(product)));
        if (!product.buildConfiguration) {
            this.selectedProduct.buildConfiguration = new BuildConfiguration();
        }
        if (this.selectedProduct.buildConfiguration.effectiveTime) {
            // Convert to Date
            const effectiveTime = new Date(this.selectedProduct.buildConfiguration.effectiveTime);
            this.selectedProduct.buildConfiguration.effectiveTime = effectiveTime;
        }
        if (!product.qaTestConfig) {
            this.selectedProduct.qaTestConfig = new QAConfiguration();
        }
        if (!this.selectedProduct.buildConfiguration.extensionConfig) {
            this.selectedProduct.buildConfiguration.extensionConfig = new ExtensionConfig();
        }

        // parse custom refset composite keys
        if (this.selectedProduct.buildConfiguration.customRefsetCompositeKeys
            && Object.keys(this.selectedProduct.buildConfiguration.customRefsetCompositeKeys).length !== 0) {
            const customRefsetCompositeKeys = this.selectedProduct.buildConfiguration.customRefsetCompositeKeys;
            const keys = Object.keys(customRefsetCompositeKeys);
            for (let index = 0; index < keys.length; index++) {
                if (index !== 0) {
                    this.customRefsetCompositeKeys += '|';
                }
                this.customRefsetCompositeKeys += keys[index] + '=' + customRefsetCompositeKeys[keys[index]].join();
            }
        }

        this.openModal('update-product-modal');
    }

    openModal(name) {
        this.modalService.open(name);
    }

    closeModal(name) {
        this.modalService.close(name);
    }
}
