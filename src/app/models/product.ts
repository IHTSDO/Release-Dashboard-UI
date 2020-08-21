import { QAConfiguration } from './qaConfiguration';
import { BuildConfiguration } from './buildConfiguration';

export class Product {
    id: string;
    name: string;
    latestBuildStatus: string;
    latestTag: string;
    qaTestConfig: QAConfiguration;
    buildConfiguration: BuildConfiguration;

    // UI Control flags
    manifestFileUploading: boolean;
}
