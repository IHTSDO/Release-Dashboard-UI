import { isVersionedBranch } from './branch-path.util';

describe('isVersionedBranch', () => {
    it('returns false for MAIN', () => {
        expect(isVersionedBranch('MAIN')).toBe(false);
    });

    it('returns true for MAIN/yyyy-MM-dd', () => {
        expect(isVersionedBranch('MAIN/2020-01-01')).toBe(true);
    });

    it('returns true for MAIN/edition/yyyy-MM-dd', () => {
        expect(isVersionedBranch('MAIN/SNOMEDCT-BE/2020-01-01')).toBe(true);
    });

    it('returns false for paths without a version date segment', () => {
        expect(isVersionedBranch('MAIN/SNOMEDCT-BE')).toBe(false);
    });

    it('returns false for HotFix branches', () => {
        expect(isVersionedBranch('MAIN/SNOMEDCT-BE/2020-01-01/Fix02')).toBe(false);
    });

    it('returns false when empty', () => {
        expect(isVersionedBranch('')).toBe(false);
        expect(isVersionedBranch(null)).toBe(false);
    });
});
