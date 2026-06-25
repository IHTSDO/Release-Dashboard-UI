import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
    exceptionReason = '';
    exceptionType: 'permanent' | 'temporary' = 'permanent';
    exceptionSaving = false;
    exceptionRemoving = false;

    private readonly addModalId = 'manage-exceptions-add-modal';
    private readonly removeModalId = 'manage-exceptions-remove-modal';

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
            .filter(item => item?.assertionUuid)
            .map(item => mapAssertion(item, 'error'));

        this.warningAssertions = (this.assertionsWarning ?? [])
            .filter(item => item?.assertionUuid)
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
        }
    }

    viewFailures(assertion: AssertionWithFailures, event?: Event): void {
        event?.stopPropagation();
        this.selectedAssertion = assertion;
        this.viewLevel = 'failures';
    }

    backToAssertions(): void {
        this.viewLevel = 'assertions';
        this.selectedAssertion = null;
    }

    getFailuresForAssertion(assertion: AssertionWithFailures): EnrichedFailureDetail[] {
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

    findWhitelistItem(validationRuleId: string, componentId: string, fullComponent: string): WhitelistItem | undefined {
        return this.whitelistItems.find(item =>
            item.validationRuleId === validationRuleId && item.componentId === componentId && item.additionalFields === fullComponent
        );
    }

    openAddExceptionModal(failure: EnrichedFailureDetail): void {
        this.selectedFailure = failure;
        this.exceptionReason = '';
        this.exceptionType = 'permanent';
        this.openModal(this.addModalId);
    }

    openRemoveExceptionModal(failure: EnrichedFailureDetail): void {
        this.selectedFailure = failure;
        this.openModal(this.removeModalId);
    }

    saveException(): void {
        if (!this.selectedFailure || !this.selectedAssertion) {
            return;
        }
        const reason = this.exceptionReason?.trim();
        if (!reason) {
            this.errorMessage.emit('Please enter a reason for the exception.');
            return;
        }

        const request: CreateWhitelistItemRequest = {
            validationRuleId: this.selectedAssertion.assertionUuid,
            componentId: this.selectedFailure.componentId,
            conceptId: this.selectedFailure.conceptId,
            branch: this.branchPath,
            assertionFailureText: this.selectedAssertion.assertionText,
            additionalFields: this.selectedFailure.fullComponent ?? '',
            temporary: this.exceptionType === 'temporary',
            reason
        };

        this.exceptionSaving = true;
        this.aagService.createWhitelistItem(request).subscribe(
            savedItem => {
                this.whitelistItems = [...this.whitelistItems, savedItem];
                this.updateExceptionCounts();
                this.exceptionSaving = false;
                this.closeModal(this.addModalId);
                this.successMessage.emit('Exception has been added successfully.');
            },
            errorResponse => {
                this.exceptionSaving = false;
                this.errorMessage.emit(this.extractErrorMessage(errorResponse, 'Failed to add exception.'));
            }
        );
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

    private getAssertionUuids(): string[] {
        const uuids = new Set<string>();
        (this.assertionsFailed ?? []).forEach(assertion => {
            if (assertion?.assertionUuid) {
                uuids.add(assertion.assertionUuid);
            }
        });
        (this.assertionsWarning ?? []).forEach(assertion => {
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
