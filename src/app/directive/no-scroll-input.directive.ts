import { Directive, HostListener } from '@angular/core';

@Directive({
  selector: 'input[type="number"][appNoScrollInput]' // Apply to number inputs with this attribute
})
export class NoScrollInputDirective {

  @HostListener('wheel', ['$event'])
  onWheel(event: Event): void {
    event.preventDefault(); // Prevent the default scroll behavior
  }
}