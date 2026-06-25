export class WhitelistItem {
    id: string;
    userId: string;
    creationDate: Date;
    creationDateLong: number;
    validationRuleId: string;
    componentId: string;
    conceptId: string;
    branch: string;
    additionalFields: string;
    assertionFailureText: string;
    temporary: boolean;
    reason: string;
}

export interface CreateWhitelistItemRequest {
    validationRuleId: string;
    componentId: string;
    conceptId: string;
    branch: string;
    assertionFailureText: string;
    additionalFields: string;
    temporary: boolean;
    reason: string;
}
