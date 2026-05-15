import { Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { TextFieldModule } from '@angular/cdk/text-field';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { MAT_DATE_FORMATS, MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ModalComponent } from '../modal/modal.component';
import { NoScrollInputDirective } from 'src/app/directive/no-scroll-input.directive';
import { Product } from '../../models/product';
import { ReleaseCenter } from '../../models/releaseCenter';
import { BuildConfiguration } from '../../models/buildConfiguration';
import { QAConfiguration } from '../../models/qaConfiguration';
import { ExtensionConfig } from '../../models/extensionConfig';
import { OptionalManifestRefset } from 'src/app/models/optionalManifestRefset';
import { CodeSystem } from 'src/app/models/codeSystem';
import { ProductService } from '../../services/product/product.service';
import { ProductDataService } from '../../services/product/product-data.service';
import { ModalService } from '../../services/modal/modal.service';
import { PermissionService } from '../../services/permission/permission.service';
import { ReleaseCenterService } from '../../services/releaseCenter/release-center.service';
import { ReleaseServerService } from '../../services/releaseServer/release-server.service';

export const PRODUCT_ACTION_DATE_FORMATS = {
    parse: { dateInput: 'YYYY-MM-DD' },
    display: {
        dateInput: 'YYYY-MM-DD',
        monthYearLabel: 'MMM YYYY',
        dateA11yLabel: 'LL',
        monthYearA11yLabel: 'MMMM YYYY'
    }
};

@Component({
    selector: 'app-product-action-buttons',
    imports: [
        TextFieldModule, ReactiveFormsModule, FormsModule, CommonModule,
        ModalComponent, MatSelectModule, MatAutocompleteModule, MatDatepickerModule,
        MatNativeDateModule, MatMomentDateModule, MatTooltipModule, NoScrollInputDirective
    ],
    templateUrl: './product-action-buttons.component.html',
    styleUrls: ['./product-action-buttons.component.scss'],
    providers: [{ provide: MAT_DATE_FORMATS, useValue: PRODUCT_ACTION_DATE_FORMATS }]
})
export class ProductActionButtonsComponent implements OnInit, OnChanges {
    @Input({ required: true }) product: Product;
    @Input({ required: true }) activeReleaseCenter: ReleaseCenter;
    /** Unique suffix for modal DOM ids when multiple instances exist (e.g. product table rows). */
    @Input() modalIdPrefix?: string;
    @Input() loadingReleasePackagesDone = false;
    @Input() releasePackageMap: Record<string, unknown> | null = null;
    @Input() optionalManifestRefsetsList: OptionalManifestRefset[] | null = null;
    @Output() productChange = new EventEmitter<Product>();
    /** When set (product table rows), success/error use the parent viewer modals instead of per-row copies. */
    @Output() feedbackSuccess = new EventEmitter<string>();
    @Output() feedbackError = new EventEmitter<string>();

    @ViewChild('uploadManifestFileInput') uploadManifestFileInput: ElementRef<HTMLElement>;
    @ViewChild('excludedRefsetsSelectAll') excludedRefsetsSelectAllRef?: ElementRef<HTMLInputElement>;

    editedProduct: Product;
    customRefsetCompositeKeys = '';
    manifestFileUploaded = false;
    optionalManifestRefsets: OptionalManifestRefset[] = [];
    optionalManifestRefsetsLoadError: string | null = null;
    selectedOptionalManifestRefsetIds: string[] = [];
    otherExcludedRefsets = '';
    private manifestExcludedRefsetsSnapshot = '';

    gereratingManifest = false;
    savingProduct = false;
    message = '';
    action = '';
    roles: object;
    codeSystems: CodeSystem[];
    codeSystemToReleasePackageMap = {};
    previousReleaseOptions: string[] = [];
    dependentReleaseOptions: string[] = [];
    previousReleaseInputControl = new FormControl('');
    dependentReleaseInputControl = new FormControl('');
    filteredPreviousReleaseOptions: Observable<string[]>;
    filteredDependentReleaseOptions: Observable<string[]>;

    constructor(
        private productService: ProductService,
        private productDataService: ProductDataService,
        private modalService: ModalService,
        private permissionService: PermissionService,
        private releaseCenterService: ReleaseCenterService,
        private releaseServerService: ReleaseServerService
    ) {}

    ngOnInit(): void {
        this.roles = this.permissionService.roles;
        this.syncEditedProductFromInput();
        this.initAutoComplete();
        this.applySharedReleasePackages();
        if (!this.loadingReleasePackagesDone) {
            this.loadReleasePackages();
        }
        this.loadCodeSystems(this.releaseCenterService, this.releaseServerService).then(data => {
            this.codeSystems = data as CodeSystem[];
            this.releaseCenterService.cacheCodeSystems(this.codeSystems);
        });
        this.applySharedOptionalManifestRefsets();
        this.refreshManifestFileStatus();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['product']) {
            this.syncEditedProductFromInput();
            if (this.product?.id) {
                this.refreshManifestFileStatus();
            }
        }
        if (changes['releasePackageMap'] || changes['loadingReleasePackagesDone']) {
            this.applySharedReleasePackages();
        }
        if (changes['optionalManifestRefsetsList'] || changes['activeReleaseCenter']) {
            this.applySharedOptionalManifestRefsets();
        }
    }

    modalId(id: string): string {
        return this.modalIdPrefix ? `${id}-${this.modalIdPrefix}` : id;
    }

    optionalRefsetDomId(refsetId: string | number): string {
        const base = `optional-refset-${refsetId}`;
        return this.modalIdPrefix ? `${base}-${this.modalIdPrefix}` : base;
    }

    excludedRefsetsSelectAllDomId(): string {
        return this.modalId('excluded-refsets-select-all');
    }

    canManageProduct(): boolean {
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

    hasManifestUploaded(): boolean {
        return this.manifestFileUploaded;
    }

    isManifestUploadDisabled(): boolean {
        return !!this.product?.['manifestConfig']?.autoGenerateManifest;
    }

    openUpdateConfigurationsModal(): void {
        this.message = '';
        this.customRefsetCompositeKeys = '';
        this.editedProduct = JSON.parse(JSON.stringify(this.product));
        if (!this.editedProduct['releaseCenter']) {
            this.editedProduct['releaseCenter'] = this.activeReleaseCenter;
        }
        this.ensureBuildConfiguration();
        this.ensureQAConfiguration();
        this.ensureExtensionConfiguration();
        this.ensureManifestConfiguration();
        if (this.editedProduct.buildConfiguration.customRefsetCompositeKeys
            && Object.keys(this.editedProduct.buildConfiguration.customRefsetCompositeKeys).length !== 0) {
            const keys = Object.keys(this.editedProduct.buildConfiguration.customRefsetCompositeKeys);
            for (let index = 0; index < keys.length; index++) {
                if (index !== 0) {
                    this.customRefsetCompositeKeys += '|';
                }
                this.customRefsetCompositeKeys += keys[index] + '='
                    + this.editedProduct.buildConfiguration.customRefsetCompositeKeys[keys[index]].join();
            }
        }
        this.loadPreviousReleaseOptions();
        this.openModal('update-product-modal');
    }

    openManifestConfigurationModal(): void {
        this.editedProduct = JSON.parse(JSON.stringify(this.product));
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

    checkManifestFile(): void {
        if (this.isManifestUploadDisabled()) {
            return;
        }
        if (!this.manifestFileUploaded) {
            this.openUploadManifestFileDialog();
        } else {
            this.openModal('manifest-confirmation-modal');
        }
    }

    loadManifestFile(): void {
        if (!this.manifestFileUploaded) {
            return;
        }
        this.message = '';
        this.productService.loadManifestFile(this.activeReleaseCenter.id, this.product.id).subscribe(
            data => {
                const blob = new Blob([data], { type: 'application/xml' });
                const url = window.URL.createObjectURL(blob);
                window.open(url, '_blank');
            },
            () => {
                this.message = 'The manifest file does not exist for product ' + this.product.name + '.';
                this.openErrorModel();
            }
        );
    }

    onManifestConfirmationAccept(event: Event): void {
        event.stopPropagation();
        event.preventDefault();
        this.closeModal('manifest-confirmation-modal');
        this.openUploadManifestFileDialog();
    }

    openUploadManifestFileDialog(): void {
        if (this.isManifestUploadDisabled()) {
            return;
        }
        const el = this.uploadManifestFileInput.nativeElement as HTMLInputElement;
        // Prevent synthetic click from bubbling to table row routerLink (product-viewer).
        const stopBubble = (e: Event) => {
            e.stopPropagation();
            el.removeEventListener('click', stopBubble, true);
        };
        el.addEventListener('click', stopBubble, true);
        el.click();
    }

    uploadManifestFile(event): void {
        if (this.isManifestUploadDisabled()) {
            event.target.value = '';
            return;
        }
        this.message = '';
        if (event.target.files.length === 0) {
            return;
        }
        this.product.manifestFileUploading = true;
        this.productChange.emit(this.product);
        const formData = new FormData();
        formData.append('file', event.target.files[0]);
        this.productService.uploadManifest(this.activeReleaseCenter.id, this.product.id, formData).subscribe(
            () => {
                this.product.manifestFileUploading = false;
                this.manifestFileUploaded = true;
                this.productChange.emit(this.product);
            },
            errorResponse => {
                this.product.manifestFileUploading = false;
                this.productChange.emit(this.product);
                this.message = 'Failed to upload the Manifest file. Error: '
                    + (errorResponse.error?.errorMessage ?? errorResponse.error);
                this.openErrorModel();
            }
        );
        event.target.value = '';
    }

    updateProduct(product: Product, customRefsetCompositeKeys: string): void {
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
                this.savingProduct = false;
                this.applyProductResponse(response);
                this.message = 'Product ' + product.name + ' has been updated successfully.';
                this.closeModal('update-product-modal');
                this.openSuccessModel();
            },
            errorResponse => {
                this.savingProduct = false;
                if (errorResponse.error?.errorMessage) {
                    this.message = errorResponse.error.errorMessage;
                } else {
                    this.message = 'Failed to update product. Please contact technical support to get help resolving this.';
                }
                this.openErrorModel();
            }
        );
    }

    saveManifestConfiguration(): void {
        this.message = '';
        this.normalizeOtherExcludedRefsetsInput();
        this.syncComposedExcludedRefsetsToManifest();
        this.savingProduct = true;
        this.productService.updateManifestConfiguration(this.activeReleaseCenter.id, this.editedProduct).subscribe(
            response => {
                this.savingProduct = false;
                this.applyProductResponse(response);
                this.editedProduct = JSON.parse(JSON.stringify(response));
                this.ensureExtensionConfiguration();
                this.ensureManifestConfiguration();
                this.closeModal('manifest-configuration-modal');
                this.message = 'Manifest configuration has been updated successfully.';
                this.openSuccessModel();
            },
            errorResponse => {
                if (errorResponse.error?.errorMessage) {
                    this.message = errorResponse.error.errorMessage;
                } else {
                    this.message = 'Failed to update manifest configuration. Please contact technical support to get help resolving this.';
                }
                this.openErrorModel();
                this.savingProduct = false;
            }
        );
    }

    viewManifestSample(): void {
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
                    errorResponse.error = typeof errorResponse.error === 'string'
                        ? JSON.parse(errorResponse.error) : errorResponse.error;
                }
                this.message = errorResponse.error?.errorMessage
                    ?? 'The manifest file could not be generated. Please contact technical support to get help resolving this.';
                this.openErrorModel();
            }
        );
    }

    clearPackageEffectiveTime(packageEffectiveTimeInput?: HTMLInputElement): void {
        this.ensureManifestConfiguration();
        this.editedProduct['manifestConfig'].packageEffectiveTime = null;
        if (packageEffectiveTimeInput) {
            packageEffectiveTimeInput.value = '';
        }
    }

    onChangeStandaloneProduct(value: boolean): void {
        if (value) {
            if (!this.editedProduct.qaTestConfig.assertionGroupNames) {
                this.editedProduct.qaTestConfig.assertionGroupNames = 'standalone-release';
            } else if (!this.editedProduct.qaTestConfig.assertionGroupNames.includes('standalone-release')) {
                this.editedProduct.qaTestConfig.assertionGroupNames += ',standalone-release';
            }
        } else if (this.editedProduct.qaTestConfig.assertionGroupNames?.includes('standalone-release')) {
            const arr = this.editedProduct.qaTestConfig.assertionGroupNames.split(',')
                .filter(item => item !== 'standalone-release');
            this.editedProduct.qaTestConfig.assertionGroupNames = arr.join();
        }
    }

    isOptionalManifestRefsetSelected(refsetId: string | number): boolean {
        return this.selectedOptionalManifestRefsetIds.indexOf(String(refsetId)) !== -1;
    }

    onOptionalManifestRefsetRowChange(refsetId: string | number, checked: boolean): void {
        this.toggleOptionalManifestRefsetSelection(refsetId, checked);
        setTimeout(() => this.syncExcludedRefsetsSelectAllCheckbox(), 0);
    }

    onExcludedRefsetsSelectAllChange(checked: boolean): void {
        if (checked) {
            this.selectAllExcludedManifestRefsets();
        } else {
            this.deselectListedExcludedManifestRefsets();
        }
        setTimeout(() => this.syncExcludedRefsetsSelectAllCheckbox(), 0);
    }

    normalizeOtherExcludedRefsetsInput(): void {
        const ids = this.parseCommaSeparatedRefsetIds(this.otherExcludedRefsets);
        this.otherExcludedRefsets = ids.length > 0 ? ids.join(', ') : '';
    }

    get optionalManifestRefsetsFirstColumn(): OptionalManifestRefset[] {
        return this.optionalManifestRefsets.slice(0, this.optionalManifestRefsetsColumnSplitIndex);
    }

    get optionalManifestRefsetsSecondColumn(): OptionalManifestRefset[] {
        return this.optionalManifestRefsets.slice(this.optionalManifestRefsetsColumnSplitIndex);
    }

    get unknownOptionalManifestRefsetIds(): string[] {
        const known = new Set(this.optionalManifestRefsets.map(r => String(r.id)));
        return this.selectedOptionalManifestRefsetIds.filter(id => !known.has(id));
    }

    openModal(name: string): void {
        this.modalService.open(this.modalId(name));
    }

    closeModal(name: string): void {
        this.modalService.close(this.modalId(name));
    }

    private applySharedReleasePackages(): void {
        if (this.releasePackageMap && Object.keys(this.releasePackageMap).length > 0) {
            this.codeSystemToReleasePackageMap = this.releasePackageMap;
            this.setDependantReleaseOptions();
            this.loadingReleasePackagesDone = true;
        } else if (this.loadingReleasePackagesDone) {
            this.loadingReleasePackagesDone = true;
        }
    }

    private applySharedOptionalManifestRefsets(): void {
        if (this.optionalManifestRefsetsList) {
            this.optionalManifestRefsets = this.optionalManifestRefsetsList;
            setTimeout(() => this.syncExcludedRefsetsSelectAllCheckbox(), 0);
            return;
        }
        if (this.activeReleaseCenter?.id && !this.optionalManifestRefsets.length && !this.optionalManifestRefsetsLoadError) {
            this.loadOptionalManifestRefsets(this.activeReleaseCenter.id);
        }
    }

    private syncEditedProductFromInput(): void {
        if (this.product?.id) {
            this.editedProduct = JSON.parse(JSON.stringify(this.product));
            if (!this.editedProduct['releaseCenter'] && this.activeReleaseCenter) {
                this.editedProduct['releaseCenter'] = this.activeReleaseCenter;
            }
            this.ensureBuildConfiguration();
            this.ensureQAConfiguration();
            this.ensureExtensionConfiguration();
            this.ensureManifestConfiguration();
            return;
        }
        this.initializeEditingProduct();
    }

    private initializeEditingProduct(): void {
        const buildConfiguration = new BuildConfiguration();
        const qaTestConfiguration = new QAConfiguration();
        const extensionConfig = new ExtensionConfig();
        buildConfiguration.extensionConfig = extensionConfig;
        this.editedProduct = new Product();
        this.editedProduct.buildConfiguration = buildConfiguration;
        this.editedProduct.qaTestConfig = qaTestConfiguration;
        this.ensureManifestConfiguration();
    }

    private refreshManifestFileStatus(): void {
        if (!this.product?.id || !this.activeReleaseCenter?.id) {
            this.manifestFileUploaded = false;
            return;
        }
        this.productService.getManifest(this.activeReleaseCenter.id, this.product.id).subscribe(
            data => {
                this.manifestFileUploaded = !!(data && Object.prototype.hasOwnProperty.call(data, 'filename'));
            },
            () => {
                this.manifestFileUploaded = false;
            }
        );
    }

    private applyProductResponse(response: Product): void {
        if (response.buildConfiguration?.effectiveTime) {
            response.buildConfiguration.effectiveTime = new Date(response.buildConfiguration.effectiveTime);
        }
        if (response.buildConfiguration?.extensionConfig?.previousEditionDependencyEffectiveDate) {
            response.buildConfiguration.extensionConfig.previousEditionDependencyEffectiveDate =
                new Date(response.buildConfiguration.extensionConfig.previousEditionDependencyEffectiveDate);
        }
        this.productChange.emit(response);
    }

    private initAutoComplete(): void {
        this.filteredPreviousReleaseOptions = this.previousReleaseInputControl.valueChanges.pipe(
            startWith(''),
            map(value => this.filterReleases(this.previousReleaseOptions, value || ''))
        );
        this.filteredDependentReleaseOptions = this.dependentReleaseInputControl.valueChanges.pipe(
            startWith(''),
            map(value => this.filterReleases(this.dependentReleaseOptions, value || ''))
        );
    }

    private filterReleases(options: string[], value: string): string[] {
        const filterValue = value.toLowerCase();
        return options.filter(option => option.toLowerCase().includes(filterValue));
    }

    private loadPreviousReleaseOptions(): void {
        const codeSystem = this.activeReleaseCenter?.codeSystem;
        if (!codeSystem) {
            return;
        }
        const codeSystemShortname = codeSystem === 'SNOMEDCT' ? 'INT' : codeSystem.substr(codeSystem.indexOf('-') + 1);
        if (this.codeSystemToReleasePackageMap.hasOwnProperty(codeSystemShortname)) {
            this.previousReleaseOptions = this.getSortedFilenames(this.codeSystemToReleasePackageMap[codeSystemShortname]);
        }
    }

    private setDependantReleaseOptions(): void {
        if (this.codeSystemToReleasePackageMap.hasOwnProperty('INT')) {
            this.dependentReleaseOptions = this.getSortedFilenames(this.codeSystemToReleasePackageMap['INT']);
        }
    }

    private getSortedFilenames(releases: any[]): string[] {
        return releases.sort((a, b) => b.effectiveTime - a.effectiveTime).map(release => release.filename);
    }

    private loadReleasePackages(): void {
        const cached = this.releaseCenterService.getCachedReleasePackages();
        if (cached) {
            this.handleReleasePackages(cached);
        } else {
            this.releaseServerService.getReleases().subscribe(
                data => this.handleReleasePackages(data),
                error => console.error('ERROR: Release Packages failed to load. Error: ' + error)
            );
        }
    }

    private handleReleasePackages(data: any): void {
        this.codeSystemToReleasePackageMap = data;
        this.setDependantReleaseOptions();
        this.loadingReleasePackagesDone = true;
    }

    private loadCodeSystems(releaseCenterService, releaseServer) {
        return new Promise((resolve) => {
            const codeSystems = releaseCenterService.getCachedCodeSystems();
            if (codeSystems?.length) {
                resolve(codeSystems);
                return;
            }
            releaseServer.getCodeSystems().subscribe(data => resolve(data));
        });
    }

    private loadOptionalManifestRefsets(releaseCenterKey: string): void {
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
                this.optionalManifestRefsetsLoadError =
                    'Excluded refsets could not be loaded. Other manifest settings are still available.';
            }
        );
    }

    private toggleOptionalManifestRefsetSelection(refsetId: string | number, checked: boolean): void {
        const sid = String(refsetId);
        if (checked) {
            if (this.selectedOptionalManifestRefsetIds.indexOf(sid) === -1) {
                this.selectedOptionalManifestRefsetIds = this.selectedOptionalManifestRefsetIds.concat([sid]);
            }
        } else {
            this.selectedOptionalManifestRefsetIds = this.selectedOptionalManifestRefsetIds.filter(id => id !== sid);
        }
    }

    private selectAllExcludedManifestRefsets(): void {
        const unknown = this.unknownOptionalManifestRefsetIds;
        const listIds = this.optionalManifestRefsets.map(r => String(r.id));
        this.selectedOptionalManifestRefsetIds = [...unknown, ...listIds];
    }

    private deselectListedExcludedManifestRefsets(): void {
        const listIdSet = new Set(this.optionalManifestRefsets.map(r => String(r.id)));
        this.selectedOptionalManifestRefsetIds = this.selectedOptionalManifestRefsetIds.filter(id => !listIdSet.has(id));
    }

    private syncExcludedRefsetsSelectAllCheckbox(): void {
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

    private get optionalManifestRefsetsColumnSplitIndex(): number {
        const n = this.optionalManifestRefsets.length;
        return n === 0 ? 0 : Math.ceil(n / 2);
    }

    private partitionExcludedRefsetsFromSnapshot(): void {
        const raw = this.manifestExcludedRefsetsSnapshot;
        if (!raw || !String(raw).trim()) {
            this.selectedOptionalManifestRefsetIds = [];
            this.otherExcludedRefsets = '';
            return;
        }
        const allIds = String(raw).split(',').map(s => s.trim()).filter(s => s.length !== 0);
        const optionalIdSet = new Set(this.optionalManifestRefsets.map(r => r.id));
        if (optionalIdSet.size === 0) {
            this.selectedOptionalManifestRefsetIds = [];
            this.otherExcludedRefsets = allIds.join(', ');
            return;
        }
        this.selectedOptionalManifestRefsetIds = allIds.filter(id => optionalIdSet.has(id));
        this.otherExcludedRefsets = allIds.filter(id => !optionalIdSet.has(id)).join(', ');
    }

    private syncComposedExcludedRefsetsToManifest(): void {
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

    private productConfigurationMissingFieldsCheck(product: Product): string[] {
        const missingFields: string[] = [];
        if (!product.buildConfiguration.effectiveTime) {
            missingFields.push('Effective Time');
        }
        if (!product.buildConfiguration.readmeHeader) {
            missingFields.push('Readme Header');
        }
        if (!product.buildConfiguration.readmeEndDate) {
            missingFields.push('Readme End Date');
        }
        return missingFields;
    }

    private ensureBuildConfiguration(): void {
        if (!this.editedProduct.buildConfiguration) {
            this.editedProduct.buildConfiguration = new BuildConfiguration();
        }
        if (this.editedProduct.buildConfiguration.effectiveTime) {
            this.editedProduct.buildConfiguration.effectiveTime =
                new Date(this.editedProduct.buildConfiguration.effectiveTime);
        }
        if (this.editedProduct.buildConfiguration.extensionConfig?.previousEditionDependencyEffectiveDate) {
            this.editedProduct.buildConfiguration.extensionConfig.previousEditionDependencyEffectiveDate =
                new Date(this.editedProduct.buildConfiguration.extensionConfig.previousEditionDependencyEffectiveDate);
        }
    }

    private ensureQAConfiguration(): void {
        if (!this.editedProduct.qaTestConfig) {
            this.editedProduct.qaTestConfig = new QAConfiguration();
        }
    }

    private ensureExtensionConfiguration(): void {
        if (!this.editedProduct.buildConfiguration) {
            this.editedProduct.buildConfiguration = new BuildConfiguration();
        }
        if (!this.editedProduct.buildConfiguration.extensionConfig) {
            this.editedProduct.buildConfiguration.extensionConfig = new ExtensionConfig();
        }
    }

    private ensureManifestConfiguration(): void {
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

    private openSuccessModel(): void {
        if (this.modalIdPrefix) {
            this.feedbackSuccess.emit(this.message);
            return;
        }
        this.openModal('product-success-modal');
    }

    private openErrorModel(): void {
        if (this.modalIdPrefix) {
            this.feedbackError.emit(this.message);
            return;
        }
        this.openModal('product-error-modal');
    }
}
