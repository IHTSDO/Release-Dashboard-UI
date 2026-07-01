import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Product } from '../../models/product';
import { OptionalManifestRefset } from '../../models/optionalManifestRefset';
import { HttpClient, HttpParams } from '@angular/common/http';
import { formatDate } from '@angular/common';

@Injectable({
    providedIn: 'root'
})
export class ProductService {

    constructor(private http: HttpClient) {
    }

    getProduct(releaseCenterKey, productKey): Observable<Product> {
        return this.http.get<Product>('/release/centers/' + releaseCenterKey + '/products/' + productKey);
    }

    /**
     * Excluded refsets offered for manifest configuration for this release center (optional-refsets API).
     * Documented route: /release/centers/{releaseCenterKey}/products/manifest/optional-refsets
     */
    getOptionalManifestRefsets(releaseCenterKey: string): Observable<OptionalManifestRefset[]> {
        return this.http.get<OptionalManifestRefset[]>(
            '/release/centers/' + releaseCenterKey + '/products/manifest/optional-refsets'
        );
    }

    getProducts(releaseCenterKey, pageNumber, pageSize, sortField, sortDirection): Observable<object> {
        const params = new HttpParams()
                    .set('pageNumber', (pageNumber - 1).toString())
                    .set('pageSize', pageSize)
                    .set('sortField', sortField)
                    .set('sortDirection', sortDirection);
        return this.http.get<object>('/release/centers/' + releaseCenterKey + '/products', {params: params});
    }

    getHiddenProducts(releaseCenterKey, pageNumber, pageSize, sortField, sortDirection): Observable<object> {
        const params = new HttpParams()
                    .set('pageNumber', (pageNumber - 1).toString())
                    .set('pageSize', pageSize)
                    .set('sortField', sortField)
                    .set('sortDirection', sortDirection);
        return this.http.get<object>('/release/centers/' + releaseCenterKey + '/products/hidden', {params: params});
    }

    postProduct(releaseCenterKey, product): Observable<Product> {
        return this.http.post<Product>('/release/centers/' + releaseCenterKey + '/products', product);
    }

    createProduct(releaseCenterKey, productName, snomedCtProduct): Observable<Product> {
        const data = {
            name: productName
        };
        if (snomedCtProduct) {
            data['overriddenSnomedCtProduct'] = snomedCtProduct;
        }
        return this.http.post<Product>('/release/centers/' + releaseCenterKey + '/products', data);
    }

    patchProduct(releaseCenterKey: string, product: Product, customRefsetCompositeKeys: string): Observable<Product> {
        const data = {
            effectiveTime : formatDate(product.buildConfiguration.effectiveTime, 'yyyy-MM-dd', 'en-US') ,
            defaultBranchPath: product.buildConfiguration.defaultBranchPath,
            readmeHeader: product.buildConfiguration.readmeHeader,
            justPackage: product.buildConfiguration.justPackage,
            firstTimeRelease: product.buildConfiguration.firstTimeRelease,
            betaRelease: product.buildConfiguration.betaRelease,
            readmeEndDate: product.buildConfiguration.readmeEndDate,
            workbenchDataFixesRequired: product.buildConfiguration.workbenchDataFixesRequired,
            inputFilesFixesRequired: product.buildConfiguration.inputFilesFixesRequired,
            createLegacyIds: product.buildConfiguration.createLegacyIds,
            newRF2InputFiles: product.buildConfiguration.newRF2InputFiles,
            removeRF2Files: product.buildConfiguration.removeRF2Files,
            assertionGroupNames: product.qaTestConfig.assertionGroupNames,
            namespaceId: product.buildConfiguration.extensionConfig.namespaceId,
            moduleIds: product.buildConfiguration.extensionConfig.moduleIds,
            releaseExtensionAsAnEdition: product.buildConfiguration.extensionConfig.releaseAsAnEdition,
            dailyBuild: product.buildConfiguration.dailyBuild,
            standAloneProduct: product.standAloneProduct,
            enableDrools: product.qaTestConfig.enableDrools,
            enableMRCMValidation: product.qaTestConfig.enableMRCMValidation,
            includePrevReleaseFiles: product.buildConfiguration.includePrevReleaseFiles,
            excludeRefsetDescriptorMembers: product.buildConfiguration.excludeRefsetDescriptorMembers,
            excludeLanguageRefsetIds: product.buildConfiguration.excludeLanguageRefsetIds,
            droolsRulesGroupNames: product.qaTestConfig.droolsRulesGroupNames,
            classifyOutputFiles: product.buildConfiguration.classifyOutputFiles,
            licenseStatement: product.buildConfiguration.licenceStatement,
            additionalReleaseInformationFields: product.buildConfiguration.additionalReleaseInformationFields,
            useClassifierPreConditionChecks: product.buildConfiguration.useClassifierPreConditionChecks,
            conceptPreferredTerms : product.buildConfiguration.conceptPreferredTerms,
            customRefsetCompositeKeys : customRefsetCompositeKeys,
            previousPublishedPackage : product.buildConfiguration.previousPublishedPackage,
            extensionDependencyRelease : product.buildConfiguration.extensionConfig.dependencyRelease,
            overriddenSnomedCtProduct : product.overriddenSnomedCtProduct
        };
        if (product.buildConfiguration.extensionConfig &&
            product.buildConfiguration.extensionConfig.previousEditionDependencyEffectiveDate) {
                data['previousEditionDependencyEffectiveDate'] =
                    formatDate(product.buildConfiguration.extensionConfig.previousEditionDependencyEffectiveDate, 'yyyy-MM-dd', 'en-US');
            }

        return this.http.patch<Product>('/release/centers/' + releaseCenterKey + '/products/' + product.id, data);
    }

    updateManifestConfiguration(releaseCenterKey: string, product: Product): Observable<Product> {
        const manifestConfig = product['manifestConfig'] || {};
        const data = {
            autoGenerateManifest: manifestConfig.autoGenerateManifest,
            derivativeProduct: manifestConfig.derivativeProduct,
            includeProductNamespaceInPackage: manifestConfig.includeProductNamespaceInPackage,
            packageSimpleRefsetsIndividually: !!manifestConfig.packageSimpleRefsetsIndividually
        };
       
        data['excludedRefsets'] = manifestConfig.excludedRefsets ? manifestConfig.excludedRefsets : '';
        data['excludedRf2Files'] = manifestConfig.excludedRf2Files ? manifestConfig.excludedRf2Files : '';
        data['productName'] = manifestConfig.productName ? manifestConfig.productName : '';
        data['productNamespace'] = manifestConfig.productNamespace ? manifestConfig.productNamespace : '';   
        data['packageEffectiveTime'] = manifestConfig.packageEffectiveTime ? formatDate(manifestConfig.packageEffectiveTime, 'yyyy-MM-dd', 'en-US') : '';
        
        return this.http.patch<Product>('/release/centers/' + releaseCenterKey + '/products/' + product.id, data);
    }

    uploadManifest(releaseCenterKey, productKey, file: FormData) {
        return this.http.post('/release/centers/' + releaseCenterKey + '/products/' + productKey + '/manifest', file);
    }

    getManifest(releaseCenterKey, productKey) {
        return this.http.get('/release/centers/' + releaseCenterKey + '/products/' + productKey + '/manifest');
    }

    loadManifestFile(releaseCenterKey, productKey) {
        return this.http.get('/release/centers/' + releaseCenterKey + '/products/' + productKey + '/manifest/file', {responseType: 'arraybuffer'});
    }

    generateManifest(releaseCenterKey, product: Product): Observable<string> {
        const params = new HttpParams();

        const manifestConfig = product['manifestConfig'] || {};
        const data = {
            autoGenerateManifest: manifestConfig.autoGenerateManifest,
            derivativeProduct: manifestConfig.derivativeProduct,
            includeProductNamespaceInPackage: manifestConfig.includeProductNamespaceInPackage,
            packageSimpleRefsetsIndividually: !!manifestConfig.packageSimpleRefsetsIndividually
        };
       
        data['excludedRefsets'] = manifestConfig.excludedRefsets ? manifestConfig.excludedRefsets : '';
        data['excludedRf2Files'] = manifestConfig.excludedRf2Files ? manifestConfig.excludedRf2Files : '';
        data['productName'] = manifestConfig.productName ? manifestConfig.productName : '';
        data['productNamespace'] = manifestConfig.productNamespace ? manifestConfig.productNamespace : '';   
        data['packageEffectiveTime'] = manifestConfig.packageEffectiveTime ? formatDate(manifestConfig.packageEffectiveTime, 'yyyy-MM-dd', 'en-US') : '';
        
        // Backend returns XML as plain text; tell HttpClient to not JSON-parse the response.
        return this.http.post(
            '/release/centers/' + releaseCenterKey + '/products/' + product.id + '/manifest/generate',
            data,
            { params: params, responseType: 'text' }
        );
    }

    updateProductVisibility(releaseCenterKey, productKey, visibility) {
        const params = new HttpParams()
                    .set('visibility', visibility);
        return this.http.post('/release/centers/' + releaseCenterKey + '/products/' + productKey + '/visibility', {}, {params: params});
    }
}
