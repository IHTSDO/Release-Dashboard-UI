import { BuildConfiguration } from './buildConfiguration';
import { QAConfiguration } from './qaConfiguration';

export class Build {
    id: string;
    buildUser: string;
    status: string;
    tag: string;
    configuration: BuildConfiguration;
    qaTestConfig: QAConfiguration;

    // UI controls
    buildDownloadingLog: boolean;
    buildDownloadingPackage: boolean;
    buildPublishing: boolean;
    buildDeleting: boolean;
    buildCanceling: boolean;
}
