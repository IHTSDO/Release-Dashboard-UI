import { Directive, ElementRef, HostListener, Output, EventEmitter, Input } from '@angular/core';
import { Sort } from '../util/sort';

@Directive({
  selector: '[appSort]'
})
export class SortDirective {

  @Input() appSort: Array<any>;
  @Output() sortClick = new EventEmitter<string>();

  constructor(private targetElem: ElementRef) { }

  @HostListener('click')
  sortData() {
    // Get Reference Of Current Clicked Element
    const elem = this.targetElem.nativeElement;
    // Get current order from elment class
    let currentOrder = elem.className;
    // Set to 'desc' if the current order has not been set
    if (!currentOrder) {
      currentOrder = 'desc';
    }

    // Sort local data
    if (this.appSort && this.appSort.length !== 0) {
      // Create Object of Sort Class
      const sort = new Sort();
      // Get The Property Type specially set [data-type=date] if it is date field
      const type = elem.getAttribute('data-type');
      // Get The Property Name from Element Attribute
      const property = elem.getAttribute('data-name');

      if (currentOrder === 'desc') {
        this.appSort.sort(sort.startSort(property, 'asc', type));
      } else {
        this.appSort.sort(sort.startSort(property, 'desc', type));
      }
    }

    // broadcast the sort event
    if (currentOrder === 'desc') {
      this.sortClick.emit('asc');
    } else {
      this.sortClick.emit('desc');
    }
  }
}
