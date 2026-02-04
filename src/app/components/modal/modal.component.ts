import { Component, ViewEncapsulation, ElementRef, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { ModalService } from '../../services/modal/modal.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
    selector: 'app-modal',
    imports: [ReactiveFormsModule, FormsModule, CommonModule],
    templateUrl: 'modal.component.html',
    styleUrls: ['modal.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class ModalComponent implements OnInit, OnDestroy, OnChanges {
    @Input() id: string;
    @Input() size = 'medium';
    @Input() hideHeader: boolean;
    @Input() hideFooter: boolean;
    @Input() disableBackgroundClickEvent: boolean;
    private element: any;
    private currentSizeClass: string;

    constructor(private modalService: ModalService, private el: ElementRef) {
        this.element = el.nativeElement;
    }

    ngOnInit(): void {
        // ensure id attribute exists
        if (!this.id) {
            console.error('modal must have an id');
            return;
        }

        // move element to bottom of page (just before </body>) so it can be displayed above everything else
        document.body.appendChild(this.element);

        // add size to dialog
        this.currentSizeClass = 'modal-' + this.size;
        this.element.firstChild.classList.add(this.currentSizeClass);

        // close modal on background click
        this.element.addEventListener('click', el => {
            if (el.target.className === 'app-modal') {
                this.close();
            }
        });

        // add self (this modal instance) to the modal service so it's accessible from controllers
        this.modalService.add(this);
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['size'] && !changes['size'].isFirstChange() && this.element && this.element.firstChild) {
            const previousSize = changes['size'].previousValue;
            const currentSize = changes['size'].currentValue;
            const previousClass = previousSize ? 'modal-' + previousSize : this.currentSizeClass;
            const currentClass = 'modal-' + currentSize;

            if (previousClass) {
                this.element.firstChild.classList.remove(previousClass);
            }
            this.element.firstChild.classList.add(currentClass);
            this.currentSizeClass = currentClass;
        }
    }

    // remove self from modal service when component is destroyed
    ngOnDestroy(): void {
        this.modalService.remove(this.id);
        this.element.remove();
    }

    // open modal
    open(): void {
        this.element.style.display = 'block';
        document.body.classList.add('app-modal-open');
    }

    // close modal
    close(): void {
        this.element.style.display = 'none';
        document.body.classList.remove('app-modal-open');
    }
}
