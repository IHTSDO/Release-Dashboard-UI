/**
 * A versioned branch is a release branch path that includes an effective-time date (yyyy-MM-dd),
 * e.g. MAIN/2020-01-01 or MAIN/SNOMEDCT-BE/2020-01-01. Task branches (MAIN only) and HotFix paths are excluded.
 */
export function isVersionedBranch(branch: string | null | undefined): boolean {
    if (!branch?.trim()) {
        return false;
    }
    const path = branch.trim();
    if (/^MAIN$/i.test(path)) {
        return false;
    }
    if (/\/fix\d+/i.test(path)) {
        return false;
    }
    return /(?:^|\/)\d{4}-\d{2}-\d{2}(?:\/|$)/.test(path);
}
