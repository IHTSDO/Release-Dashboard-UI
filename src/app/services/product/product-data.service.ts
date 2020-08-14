import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProductDataService {

  constructor() { }

  private products = new Subject<any>();

  // Setters & Getters: Products
  setProducts(products) {
      this.products.next(products);
  }

  clearProducts() {
      this.products.next();
  }

  getProducts(): Observable<any> {
      return this.products.asObservable();
  }
}
