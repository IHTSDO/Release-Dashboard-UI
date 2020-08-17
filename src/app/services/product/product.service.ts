import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Product } from '../../models/product';
import { HttpClient } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class ProductService {

    constructor(private http: HttpClient) {
    }

    getProduct(releaseCenterKey, productKey): Observable<Product> {
        return this.http.get<Product>('/release/centers/' + releaseCenterKey + '/products/' + productKey);
    }

    getProducts(releaseCenterKey): Observable<Product[]> {
        return this.http.get<Product[]>('/release/centers/' + releaseCenterKey + '/products');
    }

    postProduct(releaseCenterKey, product): Observable<Product> {
        return this.http.post<Product>('/release/centers/' + releaseCenterKey + '/products', product);
    }

    patchProduct(releaseCenterKey, productKey, product): Observable<Product> {
        return this.http.patch<Product>('/release/centers/' + releaseCenterKey + '/products/' + productKey, product);
    }
}
