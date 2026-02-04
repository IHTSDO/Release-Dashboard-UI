export class PublishStep {
    stepName: string;
    stepNumber: number;
    status: string;
    errorMessage: string;
    errorDetails: string[];
    warnings: string[];

    showErrorDetails: boolean = false;
}
