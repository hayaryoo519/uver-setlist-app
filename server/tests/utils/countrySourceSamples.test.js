const proposals = require('../../../docs/fixtures/live_country_source_samples.json');
const { validateCandidates, effectiveMetadata } = require('../../utils/liveMetadata');

describe('offline public country-source proposals (not an import or confirmation)', () => {
    test('records only unapproved public-source proposals without environment-specific live IDs', () => {
        expect(proposals.applied).toBe(false);
        expect(proposals.scope).toBe('offline-public-source-proposals');
        expect(proposals.samples).toHaveLength(4);
        for (const sample of proposals.samples) {
            expect(sample.reviewStatus).toBe('unapproved');
            expect(sample).not.toHaveProperty('liveId');
            expect(sample).not.toHaveProperty('overrides');
            expect(sample.remainingChecks.length).toBeGreaterThan(0);
            for (const url of sample.sources) {
                expect(new URL(url).protocol).toBe('https:');
                expect(['www.uverworld.jp', '1chancefes.com']).toContain(new URL(url).hostname);
            }
            if (sample.proposedCountryCode !== null) {
                expect(sample.eventMatch).toBe('date_title_venue');
                expect(sample.countryEvidence.kind).toBe('explicit_country_name');
                expect(sample.sources).toContain(sample.countryEvidence.url);
                expect(sample.countryEvidence.excerpt).toContain(sample.countryEvidence.countryName);
            } else expect(sample.countryEvidence).toBeNull();
        }
    });

    test.each(proposals.samples)('$key remains unreviewed and has no overseas tag with only source candidates', sample => {
        const candidate = validateCandidates({ countryCode: sample.proposedCountryCode,
            sourceUrl: sample.countryEvidence?.url || null });
        const effective = effectiveMetadata(candidate, {});
        expect(effective.country).toEqual({ code: null, status: 'unreviewed' });
        expect(effective.tags).not.toContain('overseas');
        expect(candidate.countryCode).toBe(sample.proposedCountryCode);
    });

    test('missing country evidence never defaults to Japan, including the venue alias needing review', () => {
        const unresolved = proposals.samples.filter(sample => sample.countryEvidence === null);
        expect(unresolved).toHaveLength(3);
        expect(unresolved.every(sample => sample.proposedCountryCode === null)).toBe(true);
        expect(unresolved.some(sample => sample.eventMatch === 'date_only_venue_alias_and_tour_review')).toBe(true);
    });
});
