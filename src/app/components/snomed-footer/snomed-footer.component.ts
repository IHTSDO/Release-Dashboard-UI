import { Component, OnInit } from '@angular/core';
import { EnvService } from 'src/app/services/environment/env.service';

@Component({
    selector: 'app-snomed-footer',
    templateUrl: './snomed-footer.component.html',
    styleUrls: ['./snomed-footer.component.scss']
})
export class SnomedFooterComponent implements OnInit {

    year: number = new Date().getFullYear();
    environment: string;
    constructor(private envService: EnvService) {
    }

    ngOnInit() {
        this.environment = this.envService.env;
    }

}
