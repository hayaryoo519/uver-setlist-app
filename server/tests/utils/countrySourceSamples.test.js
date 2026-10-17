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
                expect(['date_title_venue', 'date_tour_venue_alias_reviewed_for_this_sample']).toContain(sample.eventMatch);
                expect(['explicit_country_name', 'official_event_address', 'official_event_location', 'official_event_prefecture']).toContain(sample.countryEvidence.kind);
                expect(sample.sources).toContain(sample.countryEvidence.url);
                if (sample.countryEvidence.kind === 'explicit_country_name') {
                    expect(sample.countryEvidence.excerpt).toContain(sample.countryEvidence.countryName);
                } else {
                    const evidence = sample.countryEvidence;
                    const values = evidence.kind === 'official_event_address'
                        ? [evidence.address.prefecture, evidence.address.city, evidence.address.street, evidence.address.postalCode]
                        : evidence.kind === 'official_event_prefecture'
                            ? [sample.date.replaceAll('-', '.'), evidence.prefecture, evidence.officialVenue]
                            : [evidence.prefecture, evidence.city, sample.recordedVenue];
                    for (const value of values) {
                        expect(typeof value).toBe('string');
                        expect(value.length).toBeGreaterThan(0);
                        expect(evidence.excerpt).toContain(value);
                    }
                }
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

    test('1CHANCE proposes Japan from the event-linked official address and retains its existing festival type', () => {
        const sample = proposals.samples.find(sample => sample.key === '1chance-2026-09-27');
        expect(sample.proposedCountryCode).toBe('JP');
        expect(sample.countryEvidence.kind).toBe('official_event_address');
        expect(sample.countryEvidence.address).toEqual({ prefecture: '熊本県', city: '合志市', street: '栄3802－4', postalCode: '861-1113' });
        expect(sample.recordedType).toBe('FESTIVAL');
        expect(sample).not.toHaveProperty('proposedType');
        expect(sample.reviewStatus).toBe('unapproved');
    });

    test('2019 year-end show has event-specific official Fukuoka city evidence, not a venue-name heuristic', () => {
        const sample = proposals.samples.find(sample => sample.key === 'unser-2019-12-31');
        expect(sample.proposedCountryCode).toBe('JP');
        expect(sample.countryEvidence.kind).toBe('official_event_location');
        expect(sample.countryEvidence.excerpt).toContain('福岡県福岡市 マリンメッセ福岡');
        expect(sample.reviewStatus).toBe('unapproved');
    });

    test('2025 year-end proposal is specific to the event, not a global venue-alias rule', () => {
        const sample = proposals.samples.find(sample => sample.key === 'winter-2025-12-31');
        expect(sample.proposedCountryCode).toBe('JP');
        expect(sample.countryEvidence.kind).toBe('official_event_prefecture');
        expect(sample.countryEvidence.tour).toContain(sample.recordedTour);
        expect(sample.countryEvidence.venueMatchNote).toContain(sample.recordedVenue);
        expect(sample.countryEvidence.venueMatchNote).toContain('A館');
        expect(sample).not.toHaveProperty('proposedVenue');
        expect(sample.reviewStatus).toBe('unapproved');
        expect(proposals.samples.every(entry => entry.proposedCountryCode !== null)).toBe(true);
    });
});
