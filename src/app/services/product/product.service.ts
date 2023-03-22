import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Product } from '../../models/product';
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

    getProducts(releaseCenterKey, pageNumber, pageSize, sortField, sortDirection): Observable<object> {
        const params = new HttpParams()
                    .set('pageNumber', (pageNumber - 1).toString())
                    .set('pageSize', pageSize)
                    .set('sortField', sortField)
                    .set('sortDirection', sortDirection);
        return this.http.get<object>('/release/centers/' + releaseCenterKey + '/products', {params: params});
    }

    postProduct(releaseCenterKey, product): Observable<Product> {
        return this.http.post<Product>('/release/centers/' + releaseCenterKey + '/products', product);
    }

    createProduct(releaseCenterKey, productName): Observable<Product> {
        return this.http.post<Product>('/release/centers/' + releaseCenterKey + '/products', {name: productName});
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
            assertionGroupNames: product.qaTestConfig.assertionGroupNames,
            namespaceId: product.buildConfiguration.extensionConfig.namespaceId,
            moduleIds: product.buildConfiguration.extensionConfig.moduleIds,
            releaseExtensionAsAnEdition: product.buildConfiguration.extensionConfig.releaseAsAnEdition,
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
            extensionDependencyRelease : product.buildConfiguration.extensionConfig.dependencyRelease
        };
        if (product.buildConfiguration.extensionConfig &&
            product.buildConfiguration.extensionConfig.previousEditionDependencyEffectiveDate) {
                data['previousEditionDependencyEffectiveDate'] =
                    formatDate(product.buildConfiguration.extensionConfig.previousEditionDependencyEffectiveDate, 'yyyy-MM-dd', 'en-US');
            }

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

    updateProductVisibility(releaseCenterKey, productKey, visibility) {
        const params = new HttpParams()
                    .set('visibility', visibility);
        return this.http.post('/release/centers/' + releaseCenterKey + '/products/' + productKey + '/visibility', {}, {params: params});
    }
}
