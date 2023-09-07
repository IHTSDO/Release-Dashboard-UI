import { Injectable, OnInit } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ProductPaginationService {

    DEFAULT_PAGE_NUMBER = 1;
    DEFAULT_PAGE_SIZE = 10;
    EMPTY_ITEMS = 0;

    private seletectedPageMap = new Object();
    private cachedPageSize: number;

    constructor() { }

    cacheSelectedPage (releaseCenterKey, pageNumber) {
        this.seletectedPageMap[releaseCenterKey] = pageNumber;
    }

    getSelectedPage (releaseCenterKey) {
        if (this.seletectedPageMap.hasOwnProperty(releaseCenterKey)) {
          return this.seletectedPageMap[releaseCenterKey];
        }

        return this.DEFAULT_PAGE_NUMBER;
    }

    cachePageSize (pageSize) {
      this.cachedPageSize = pageSize;
  }

    getPageSize () {
      if (this.cachedPageSize) {
        return this.cachedPageSize;
      }

      return undefined;
    }

    clearSelectedPage (releaseCenterKey) {
        if (this.seletectedPageMap.hasOwnProperty(releaseCenterKey)) {
          delete this.seletectedPageMap[releaseCenterKey];
        }
    }
}
