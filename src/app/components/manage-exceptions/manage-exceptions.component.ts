import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SortDirective } from 'src/app/directive/sort.directive';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ModalComponent } from '../modal/modal.component';
import { ModalService } from '../../services/modal/modal.service';
import { AagService } from '../../services/aag/aag.service';
import { WhitelistItem, CreateWhitelistItemRequest } from '../../models/whitelistItem';
import { EnrichedFailureDetail, FailureDetail } from '../../models/failureDetail';
import { Sort } from 'src/app/util/sort';

export interface AssertionWithFailures {
    assertionUuid: string;
    assertionText: string;
    testType: string;
    failureCount: number;
    firstNInstances?: FailureDetail[];
    severity: 'error' | 'warning';
    exceptionCount?: number;
}

type ViewLevel = 'assertions' | 'failures';

@Component({
    selector: 'app-manage-exceptions',
    imports: [
        CommonModule, FormsModule, SortDirective, MatTooltipModule, ModalComponent
    ],
    templateUrl: './manage-exceptions.component.html',
    styleUrls: ['./manage-exceptions.component.scss']
})
export class ManageExceptionsComponent implements OnChanges {

    @Input() branchPath: string;
    @Input() modalOpen = false;
    @Input() assertionsFailed: any[] = [];
    @Input() assertionsWarning: any[] = [];
    @Input() rvfReportLoading = false;
    @Input() canManage = false;

    @Output() errorMessage = new EventEmitter<string>();
    @Output() successMessage = new EventEmitter<string>();

    viewLevel: ViewLevel = 'assertions';
    whitelistItems: WhitelistItem[] = [];
    whitelistLoading = false;

    errorAssertions: AssertionWithFailures[] = [];
    warningAssertions: AssertionWithFailures[] = [];
    errorTableSortingObj: Record<string, string> = {};
    warningTableSortingObj: Record<string, string> = {};

    selectedAssertion: AssertionWithFailures | null = null;
    selectedFailure: EnrichedFailureDetail | null = null;
    selectedFailuresForAdd: EnrichedFailureDetail[] = [];
    displayedFailures: EnrichedFailureDetail[] = [];
    selectedFailureKeys = new Set<string>();
    selectAllEligibleFailures = false;
    exceptionReason = '';
    exceptionType: 'permanent' | 'temporary' = 'permanent';
    exceptionSaving = false;
    exceptionRemoving = false;
    copiedFieldKey: string | null = null;
    private copiedFieldResetHandle: ReturnType<typeof setTimeout> | null = null;

    private readonly addModalId = 'manage-exceptions-add-modal';
    private readonly removeModalId = 'manage-exceptions-remove-modal';
    private readonly allowedTestTypes = new Set(['DROOL_RULES', 'MRCM', 'TRACEABILITY', 'SQL']);

    constructor(private aagService: AagService,
                private modalService: ModalService) {
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['assertionsFailed'] || changes['assertionsWarning']) {
            this.buildAssertionLists();
        }

        if (this.modalOpen && (changes['assertionsFailed'] || changes['assertionsWarning'] || changes['modalOpen'])) {
            this.loadWhitelistItems();
        }
    }

    resetView(): void {
        this.viewLevel = 'assertions';
        this.selectedAssertion = null;
        this.selectedFailure = null;
        this.selectedFailuresForAdd = [];
        this.displayedFailures = [];
        this.clearFailureSelection();
    }

    loadWhitelistItems(): void {
        const assertionUuids = this.getAssertionUuids();
        if (!assertionUuids.length) {
            this.whitelistItems = [];
            this.updateExceptionCounts();
            return;
        }
        this.whitelistLoading = true;
        this.aagService.getWhitelistItemsByAssertions(assertionUuids).subscribe(
            items => {
                this.whitelistItems = items;
                this.whitelistLoading = false;
                this.updateExceptionCounts();
            },
            errorResponse => {
                this.whitelistLoading = false;
                this.whitelistItems = [];
                this.updateExceptionCounts();
                this.errorMessage.emit(this.extractErrorMessage(errorResponse, 'Failed to load exceptions.'));
            }
        );
    }

    buildAssertionLists(): void {
        const mapAssertion = (item: any, severity: 'error' | 'warning'): AssertionWithFailures => ({
            assertionUuid: item.assertionUuid,
            assertionText: item.assertionText,
            testType: item.testType,
            failureCount: item.failureCount,
            firstNInstances: item.firstNInstances ?? [],
            severity,
            exceptionCount: 0
        });

        this.errorAssertions = (this.assertionsFailed ?? [])
            .filter(item => item?.assertionUuid && this.isAllowedTestType(item.testType))
            .map(item => mapAssertion(item, 'error'));

        this.warningAssertions = (this.assertionsWarning ?? [])
            .filter(item => item?.assertionUuid && this.isAllowedTestType(item.testType))
            .map(item => mapAssertion(item, 'warning'));

        const sort = new Sort();
        const defaultSortColumn = 'testType';
        const defaultSortDirection = 'asc';
        this.errorAssertions.sort(sort.startSort(defaultSortColumn, defaultSortDirection));
        this.warningAssertions.sort(sort.startSort(defaultSortColumn, defaultSortDirection));
        this.errorTableSortingObj = { [defaultSortColumn]: defaultSortDirection };
        this.warningTableSortingObj = { [defaultSortColumn]: defaultSortDirection };
        this.updateExceptionCounts();
    }

    updateExceptionCounts(): void {
        const countForAssertion = (assertion: AssertionWithFailures) =>
            (assertion.firstNInstances ?? []).filter(failure =>
                !!this.findWhitelistItem(
                    assertion.assertionUuid,
                    failure.componentId,
                    failure.fullComponent ?? ''
                )
            ).length;

        this.errorAssertions.forEach(assertion => {
            assertion.exceptionCount = countForAssertion(assertion);
        });
        this.warningAssertions.forEach(assertion => {
            assertion.exceptionCount = countForAssertion(assertion);
        });
        if (this.selectedAssertion) {
            const updated = [...this.errorAssertions, ...this.warningAssertions]
                .find(a => a.assertionUuid === this.selectedAssertion.assertionUuid);
            if (updated) {
                this.selectedAssertion = updated;
            }
            if (this.viewLevel === 'failures') {
                this.refreshDisplayedFailures();
            }
            this.pruneFailureSelection();
        }
    }

    viewFailures(assertion: AssertionWithFailures, event?: Event): void {
        event?.stopPropagation();
        this.selectedAssertion = assertion;
        this.viewLevel = 'failures';
        this.clearFailureSelection();
        this.refreshDisplayedFailures();
    }

    backToAssertions(): void {
        this.viewLevel = 'assertions';
        this.selectedAssertion = null;
        this.displayedFailures = [];
        this.clearFailureSelection();
    }

    getEligibleDisplayedFailures(): EnrichedFailureDetail[] {
        return this.displayedFailures.filter(failure => !failure.hasException);
    }

    getSelectedEligibleFailures(): EnrichedFailureDetail[] {
        return this.getEligibleDisplayedFailures()
            .filter(failure => this.selectedFailureKeys.has(this.getFailureKey(failure)));
    }

    getSelectedFailureCount(): number {
        return this.selectedFailureKeys.size;
    }

    isFailureSelected(failure: EnrichedFailureDetail): boolean {
        return this.selectedFailureKeys.has(this.getFailureKey(failure));
    }

    setFailureSelection(failure: EnrichedFailureDetail, selected: boolean): void {
        if (failure.hasException) {
            return;
        }
        const key = this.getFailureKey(failure);
        if (selected) {
            this.selectedFailureKeys.add(key);
        } else {
            this.selectedFailureKeys.delete(key);
        }
        this.selectedFailureKeys = new Set(this.selectedFailureKeys);
        this.syncSelectAllEligibleState();
    }

    setSelectAllEligibleFailures(selected: boolean): void {
        const eligible = this.getEligibleDisplayedFailures();
        this.selectAllEligibleFailures = selected;
        this.selectedFailureKeys = selected
            ? new Set(eligible.map(failure => this.getFailureKey(failure)))
            : new Set();
    }

    findWhitelistItem(validationRuleId: string, componentId: string, fullComponent: string): WhitelistItem | undefined {
        return this.whitelistItems.find(item =>
            item.validationRuleId === validationRuleId && item.componentId === componentId && item.additionalFields === fullComponent
        );
    }

    openAddExceptionModal(failure: EnrichedFailureDetail): void {
        this.selectedFailuresForAdd = [failure];
        this.selectedFailure = failure;
        this.exceptionReason = '';
        this.exceptionType = 'permanent';
        this.openModal(this.addModalId);
    }

    openBulkAddExceptionModal(): void {
        const selected = this.getSelectedEligibleFailures();
        if (!selected.length) {
            this.errorMessage.emit('Please select at least one failure to add as an exception.');
            return;
        }
        this.selectedFailuresForAdd = selected;
        this.selectedFailure = selected[0];
        this.exceptionReason = '';
        this.exceptionType = 'permanent';
        this.openModal(this.addModalId);
    }

    openRemoveExceptionModal(failure: EnrichedFailureDetail): void {
        this.selectedFailure = failure;
        this.openModal(this.removeModalId);
    }

    saveException(): void {
        if (!this.selectedFailuresForAdd.length || !this.selectedAssertion) {
            return;
        }
        const reason = this.exceptionReason?.trim();
        if (!reason) {
            this.errorMessage.emit('Please enter a reason for the exception.');
            return;
        }

        const temporary = this.exceptionType === 'temporary';
        const requests = this.selectedFailuresForAdd.map(failure => {
            const request: CreateWhitelistItemRequest = {
                validationRuleId: this.selectedAssertion.assertionUuid,
                componentId: failure.componentId,
                conceptId: failure.conceptId,
                branch: this.branchPath,
                assertionFailureText: this.selectedAssertion.assertionText,
                additionalFields: failure.fullComponent ?? '',
                temporary,
                reason
            };
            return this.aagService.createWhitelistItem(request).pipe(
                catchError(errorResponse => of({ error: errorResponse } as { error: any }))
            );
        });

        this.exceptionSaving = true;
        forkJoin(requests).subscribe(results => {
            const savedItems: WhitelistItem[] = [];
            let failedCount = 0;
            let lastError: any = null;

            results.forEach(result => {
                if (result && 'error' in result) {
                    failedCount++;
                    lastError = result.error;
                } else {
                    savedItems.push(result as WhitelistItem);
                }
            });

            if (savedItems.length) {
                this.whitelistItems = [...this.whitelistItems, ...savedItems];
                this.updateExceptionCounts();
                this.clearFailureSelection();
            }

            this.exceptionSaving = false;
            this.closeModal(this.addModalId);
            this.selectedFailuresForAdd = [];

            if (failedCount === 0) {
                const count = savedItems.length;
                this.successMessage.emit(
                    count === 1
                        ? 'Exception has been added successfully.'
                        : `${count} exceptions have been added successfully.`
                );
            } else if (savedItems.length === 0) {
                this.errorMessage.emit(this.extractErrorMessage(lastError, 'Failed to add exception.'));
            } else {
                this.errorMessage.emit(
                    `${savedItems.length} exception${savedItems.length === 1 ? '' : 's'} added, but ${failedCount} failed. `
                    + this.extractErrorMessage(lastError, 'Failed to add exception.')
                );
            }
        });
    }

    removeException(): void {
        const whitelistItem = this.selectedFailure?.whitelistItem;
        if (!whitelistItem?.id) {
            return;
        }

        this.exceptionRemoving = true;
        this.aagService.deleteWhitelistItem(whitelistItem.id).subscribe(
            () => {
                this.whitelistItems = this.whitelistItems.filter(item => item.id !== whitelistItem.id);
                this.updateExceptionCounts();
                this.exceptionRemoving = false;
                this.closeModal(this.removeModalId);
                this.successMessage.emit('Exception has been removed successfully.');
            },
            errorResponse => {
                this.exceptionRemoving = false;
                this.errorMessage.emit(this.extractErrorMessage(errorResponse, 'Failed to remove exception.'));
            }
        );
    }

    handleSortClick(direction: string, column: string, type: string): void {
        if (type === 'error') {
            this.errorTableSortingObj = { [column]: direction };
        }
        if (type === 'warning') {
            this.warningTableSortingObj = { [column]: direction };
        }
    }

    formatTestType(testType: string): string {
        return testType?.replace('DROOL_RULES', 'DROOLS') ?? '';
    }

    formatFailureCount(count: number): string {
        return count != null ? count.toLocaleString('en-US') : '0';
    }

    formatExceptionCountLabel(count: number): string {
        const value = count ?? 0;
        return `${value} exception${value === 1 ? '' : 's'}`;
    }

    formatCreatedBy(userId: string): string {
        if (!userId) {
            return 'unknown';
        }
        return userId;
    }

    formatExceptionStatusSummary(item: WhitelistItem): string {
        const reason = item.reason ? `"${item.reason}"` : '—';
        const type = item.temporary ? 'Temporary' : 'Permanent';
        const createdBy = this.formatCreatedBy(item.userId);
        return `Reason: ${reason} — ${type} — Added by ${createdBy}`;
    }

    isLoading(): boolean {
        return this.rvfReportLoading || this.whitelistLoading;
    }

    getCopyFieldKey(failure: EnrichedFailureDetail, field: 'componentId' | 'detail'): string {
        return `${this.getFailureKey(failure)}::${field}`;
    }

    isCopiedField(failure: EnrichedFailureDetail, field: 'componentId' | 'detail'): boolean {
        return this.copiedFieldKey === this.getCopyFieldKey(failure, field);
    }

    async copyFailureField(failure: EnrichedFailureDetail, field: 'componentId' | 'detail', event?: Event): Promise<void> {
        event?.stopPropagation();
        const value = field === 'componentId' ? (failure.componentId ?? '') : (failure.detail ?? '');
        if (!value) {
            return;
        }

        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(value);
            } else {
                this.copyWithFallback(value);
            }
            this.markFieldCopied(this.getCopyFieldKey(failure, field));
        } catch {
            try {
                this.copyWithFallback(value);
                this.markFieldCopied(this.getCopyFieldKey(failure, field));
            } catch {
                this.errorMessage.emit('Failed to copy to clipboard.');
            }
        }
    }

    private markFieldCopied(fieldKey: string): void {
        this.copiedFieldKey = fieldKey;
        if (this.copiedFieldResetHandle) {
            clearTimeout(this.copiedFieldResetHandle);
        }
        this.copiedFieldResetHandle = setTimeout(() => {
            if (this.copiedFieldKey === fieldKey) {
                this.copiedFieldKey = null;
            }
            this.copiedFieldResetHandle = null;
        }, 1500);
    }

    private copyWithFallback(value: string): void {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (!successful) {
            throw new Error('Copy command failed');
        }
    }

    private isAllowedTestType(testType: string): boolean {
        return this.allowedTestTypes.has(testType);
    }

    private getFailuresForAssertion(assertion: AssertionWithFailures): EnrichedFailureDetail[] {
        return (assertion.firstNInstances ?? []).map(failure => {
            const whitelistItem = this.findWhitelistItem(assertion.assertionUuid, failure.componentId, failure.fullComponent ?? '');
            return {
                ...failure,
                validationRuleId: assertion.assertionUuid,
                assertionText: assertion.assertionText,
                whitelistItem,
                hasException: !!whitelistItem
            };
        });
    }

    private refreshDisplayedFailures(): void {
        if (!this.selectedAssertion) {
            this.displayedFailures = [];
            return;
        }
        this.displayedFailures = this.getFailuresForAssertion(this.selectedAssertion);
    }

    private getFailureKey(failure: FailureDetail): string {
        return `${failure.componentId ?? ''}||${failure.fullComponent ?? ''}`;
    }

    private clearFailureSelection(): void {
        this.selectedFailureKeys = new Set();
        this.selectAllEligibleFailures = false;
    }

    private syncSelectAllEligibleState(): void {
        const eligible = this.getEligibleDisplayedFailures();
        this.selectAllEligibleFailures = eligible.length > 0
            && eligible.every(failure => this.selectedFailureKeys.has(this.getFailureKey(failure)));
    }

    private pruneFailureSelection(): void {
        if (!this.selectedFailureKeys.size) {
            this.syncSelectAllEligibleState();
            return;
        }
        const eligibleKeys = new Set(
            this.getEligibleDisplayedFailures().map(failure => this.getFailureKey(failure))
        );
        this.selectedFailureKeys = new Set(
            [...this.selectedFailureKeys].filter(key => eligibleKeys.has(key))
        );
        this.syncSelectAllEligibleState();
    }

    private getAssertionUuids(): string[] {
        const uuids = new Set<string>();
        [...this.errorAssertions, ...this.warningAssertions].forEach(assertion => {
            if (assertion?.assertionUuid) {
                uuids.add(assertion.assertionUuid);
            }
        });
        return Array.from(uuids);
    }

    private extractErrorMessage(errorResponse: any, fallback: string): string {
        return errorResponse?.error?.message
            ?? errorResponse?.error?.errorMessage
            ?? errorResponse?.message
            ?? fallback;
    }

    private openModal(name: string): void {
        this.modalService.open(name);
    }

    closeModal(name: string): void {
        this.modalService.close(name);
    }
}
