import { ExtensionConfig } from './extensionConfig';

export class BuildConfiguration {
    effectiveTime: Date;
    classifyOutputFiles: boolean;
    useClassifierPreConditionChecks: boolean;
    createLegacyIds: boolean;
    dailyBuild: boolean;
    firstTimeRelease: boolean;
    betaRelease: boolean;
    conceptPreferredTerms: string;
    customRefsetCompositeKeys: object;
    extensionConfig: ExtensionConfig;
    includePrevReleaseFiles: string;
    inputFilesFixesRequired: boolean;
    justPackage: boolean;
    licenceStatement: string;
    newRF2InputFiles: string;
    previousPublishedPackage: string;
    readmeEndDate: string;
    readmeHeader: string;
    releaseInformationFields: string;
    workbenchDataFixesRequired: boolean;
    branchPath: string;
    exportType: string;
}
