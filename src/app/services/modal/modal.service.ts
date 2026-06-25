import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export interface ModalLayerZIndex {
    background: number;
    dialog: number;
}

export interface ModalInstance {
    id: string;
    show(zIndex: ModalLayerZIndex): void;
    hide(): void;
}

@Injectable({
    providedIn: 'root'
})
export class ModalService {

    private static readonly BASE_Z_INDEX = 1000;
    private static readonly Z_INDEX_STEP = 20;

    private modals: ModalInstance[] = [];
    private openOrder: string[] = [];
    private readonly closedSubject = new Subject<string>();

    readonly modalClosed$: Observable<string> = this.closedSubject.asObservable();

    add(modal: ModalInstance) {
        this.modals.push(modal);
    }

    remove(id: string) {
        this.modals = this.modals.filter(modal => modal.id !== id);
        this.openOrder = this.openOrder.filter(openId => openId !== id);
        if (this.openOrder.length === 0) {
            document.body.classList.remove('app-modal-open');
        }
    }

    open(id: string) {
        const modal = this.getModal(id);
        if (!modal) {
            return;
        }

        this.openOrder = this.openOrder.filter(openId => openId !== id);
        this.openOrder.push(id);
        modal.show(this.getLayerZIndex(this.openOrder.length));
        document.body.classList.add('app-modal-open');
    }

    close(id: string) {
        const modal = this.getModal(id);
        if (!modal) {
            return;
        }

        modal.hide();
        this.openOrder = this.openOrder.filter(openId => openId !== id);
        if (this.openOrder.length === 0) {
            document.body.classList.remove('app-modal-open');
        }
        this.closedSubject.next(id);
    }

    private getModal(id: string): ModalInstance | undefined {
        return this.modals.find(modal => modal.id === id);
    }

    private getLayerZIndex(layer: number): ModalLayerZIndex {
        const base = ModalService.BASE_Z_INDEX + (layer - 1) * ModalService.Z_INDEX_STEP;
        return { background: base, dialog: base + 10 };
    }
}
