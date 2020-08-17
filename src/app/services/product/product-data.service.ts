import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { Product } from 'src/app/models/product';

@Injectable({
  providedIn: 'root'
})
export class ProductDataService {

  constructor() { }

  private products: Product[];

  cacheProducts(products) {
      this.products = products;
  }

  clearCachedProducts() {
    this.products = [];
  }

  getCachedProducts() {
      return this.products;
  }

  findByKey(productkey) {
    if (this.products) {
      return this.products.find(product => product.id === productkey);
    }

    return null;
  }
}
