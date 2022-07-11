import { Directive, ElementRef, HostListener, Output, EventEmitter } from '@angular/core';

@Directive({
  selector: '[appSort]'
})
export class SortDirective {

  @Output() sortClick = new EventEmitter<string>();

  constructor(private targetElem: ElementRef) { }

  @HostListener('click')
  sortData() {
    // Get Reference Of Current Clicked Element
    const elem = this.targetElem.nativeElement;
    const className = elem.className;

    if (className === 'desc') {
      this.sortClick.emit('asc');
    } else {
      this.sortClick.emit('desc');
    }
  }
}
