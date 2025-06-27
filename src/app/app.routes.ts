import { Routes } from '@angular/router';
import { ProductViewerComponent } from './components/product-viewer/product-viewer.component';
import { BuildViewerComponent } from './components/build-viewer/build-viewer.component';

export const routes: Routes = [
    { path: '', component: ProductViewerComponent },
    { path: ':releaseCenterKey', component: ProductViewerComponent },
    { path: ':releaseCenterKey/:productKey', component: BuildViewerComponent },
    { path: '**', redirectTo: 'international' }
];
