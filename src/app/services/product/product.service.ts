import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ProductService {

    constructor() {
    }

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
