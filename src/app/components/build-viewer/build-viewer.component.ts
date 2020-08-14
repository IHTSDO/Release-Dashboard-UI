import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Product } from '../../models/product';
import { Build } from '../../models/build';
import { BuildService } from '../../services/build/build.service';
import { ProductService } from '../../services/product/product.service';
import { Observable, forkJoin } from 'rxjs';

@Component({
  selector: 'app-build-viewer',
  templateUrl: './build-viewer.component.html',
  styleUrls: ['./build-viewer.component.scss']
})
export class BuildViewerComponent implements OnInit {

  releaseCenterKey: string;
  product: Product;
  builds: Build[];
  activeBuild: Build;

  buildLoading = false;

  constructor(private route: ActivatedRoute,
              private productService: ProductService,
              private buildService: BuildService) {
  }

  ngOnInit(): void {
    this.activeBuild = new Build();
    this.route.paramMap.subscribe(paramMap => {
      const productKey = paramMap['params']['productKey'];
      this.releaseCenterKey = paramMap['params']['releaseCenterKey'];
      forkJoin([this.productService.getProduct(this.releaseCenterKey, productKey),
                this.buildService.getBuilds(this.releaseCenterKey, productKey)])
          .subscribe((response) => {
            this.product = response[0];
            this.builds = response[1];
              if (this.builds.length !== 0) {
                this.selectBuild(this.builds[0]);
              }
            }
        );
    });
  }

  selectBuild(build) {
    this.buildLoading = true;
    this.activeBuild = build;
    forkJoin([this.buildService.getBuildConfiguration(this.releaseCenterKey, this.product.id, build.id),
              this.buildService.getQAConfiguration(this.releaseCenterKey, this.product.id, build.id)])
       .subscribe((response) => {
            this.buildLoading = false;
            this.activeBuild.configuration = response[0];
            this.activeBuild.qaTestConfig = response[1];
        }
    );
  }

}
