import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProductViewerComponent } from './components/product-viewer/product-viewer.component';
import { BuildViewerComponent } from './components/build-viewer/build-viewer.component';

const routes: Routes = [
    { path: '', redirectTo: 'international', pathMatch: 'full' },
    { path: ':releaseCenterKey', component: ProductViewerComponent },
    { path: ':releaseCenterKey/:productKey', component: BuildViewerComponent }
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule { }
