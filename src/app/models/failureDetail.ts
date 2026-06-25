import { WhitelistItem } from './whitelistItem';

export interface FailureDetail {
    conceptId: string;
    conceptFsn?: string;
    detail?: string;
    componentId: string;
    moduleId?: string;
    fullComponent?: string;
}

export interface EnrichedFailureDetail extends FailureDetail {
    validationRuleId?: string;
    assertionText?: string;
    whitelistItem?: WhitelistItem;
    hasException?: boolean;
}
