import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Product } from '../../models/product';
import { HttpClient } from '@angular/common/http';
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

    getProducts(releaseCenterKey): Observable<Product[]> {
        return this.http.get<Product[]>('/release/centers/' + releaseCenterKey + '/products');
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
            readmeHeader: product.buildConfiguration.readmeHeader,
            justPackage: product.buildConfiguration.justPackage,
            firstTimeRelease: product.buildConfiguration.firstTimeRelease,
            betaRelease: product.buildConfiguration.betaRelease,
            previousPublishedPackage: product.buildConfiguration.previousPublishedPackage,
            readmeEndDate: product.buildConfiguration.readmeEndDate,
            workbenchDataFixesRequired: product.buildConfiguration.workbenchDataFixesRequired,
            inputFilesFixesRequired: product.buildConfiguration.inputFilesFixesRequired,
            createLegacyIds: product.buildConfiguration.createLegacyIds,
            newRF2InputFiles: product.buildConfiguration.newRF2InputFiles,
            previousInternationalRelease: product.qaTestConfig.previousInternationalRelease,
            previousExtensionRelease: product.qaTestConfig.previousExtensionRelease,
            assertionGroupNames: product.qaTestConfig.assertionGroupNames,
            extensionDependencyRelease: product.qaTestConfig.extensionDependencyRelease,
            dependencyReleasePackage: product.buildConfiguration.extensionConfig.dependencyRelease,
            namespaceId: product.buildConfiguration.extensionConfig.namespaceId,
            moduleId: product.buildConfiguration.extensionConfig.moduleId,
            releaseExtensionAsAnEdition: product.buildConfiguration.extensionConfig.releaseAsAnEdition,
            enableDrools: product.qaTestConfig.enableDrools,
            jiraIssueCreationFlag: product.qaTestConfig.jiraIssueCreationFlag,
            enableMRCMValidation: product.qaTestConfig.enableMRCMValidation,
            jiraProductName: product.qaTestConfig.productName,
            jiraReportingStage: product.qaTestConfig.reportingStage,
            includePrevReleaseFiles: product.buildConfiguration.includePrevReleaseFiles,
            droolsRulesGroupNames: product.qaTestConfig.droolsRulesGroupNames,
            classifyOutputFiles: product.buildConfiguration.classifyOutputFiles,
            licenseStatement: product.buildConfiguration.licenceStatement,
            releaseInformationFields: product.buildConfiguration.releaseInformationFields,
            useClassifierPreConditionChecks: product.buildConfiguration.useClassifierPreConditionChecks,
            conceptPreferredTerms : product.buildConfiguration.conceptPreferredTerms,
        };
        if (customRefsetCompositeKeys) {
            data['customRefsetCompositeKeys'] = customRefsetCompositeKeys;
        }
        return this.http.patch<Product>('/release/centers/' + releaseCenterKey + '/products/' + product.id, data);
    }

    uploadManifest(releaseCenterKey, productKey, file: FormData) {
        return this.http.post('/release/centers/' + releaseCenterKey + '/products/' + productKey + '/manifest', file, {
                headers: {'Content-Type': 'multipart/form-data'}
            }
        );
    }
}