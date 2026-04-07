export class PublishStep {
    stepName: string;
    stepNumber: number;
    timeTakenMillis?: number;
    status: string;
    skipComment?: string | null;
    errorMessage: string;
    errorDetails: string[];
    warnings: string[];

    showErrorDetails: boolean = false;
}
