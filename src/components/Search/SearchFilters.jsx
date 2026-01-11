import React from 'react';
import { Filter, MapPin, Calendar, Search } from 'lucide-react';

const PREFECTURES = [
    'Hokkaido', 'Miyagi', 'Tokyo', 'Kanagawa', 'Aichi', 'Osaka', 'Hiroshima', 'Fukuoka', 'Okinawa'
    // Add all realistic options or keep simple for MVP
];

const VENUE_TYPES = ['Arena', 'LiveHouse', 'Hall', 'Festival'];

const SearchFilters = ({ filters, onFilterChange }) => {

    const handleChange = (key, value) => {
        onFilterChange({ ...filters, [key]: value });
    };

    return (
        <div className="search-filters" style={{
            backgroundColor: 'var(--card-bg)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '30px',
            border: '1px solid var(--border-color)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', color: 'var(--primary-color)' }}>
                <Filter size={20} style={{ marginRight: '8px' }} />
                <span style={{ fontWeight: 'bold' }}>Refine Search</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                {/* Text Search */}
                <div className="filter-group">
                    <div className="filter-icon"><Search size={16} /></div>
                    <input
                        type="text"
                        placeholder="Search keyword..."
                        value={filters.keyword}
                        onChange={(e) => handleChange('keyword', e.target.value)}
                        className="filter-input"
                    />
                </div>

                {/* Year Filter */}
                <div className="filter-group">
                    <div className="filter-icon"><Calendar size={16} /></div>
                    <select
                        value={filters.year}
                        onChange={(e) => handleChange('year', e.target.value)}
                        className="filter-select"
                    >
                        <option value="All">All Years</option>
                        {filters.availableYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>

                {/* Prefecture Filter */}
                <div className="filter-group">
                    <div className="filter-icon"><MapPin size={16} /></div>
                    <select
                        value={filters.prefecture}
                        onChange={(e) => handleChange('prefecture', e.target.value)}
                        className="filter-select"
                    >
                        <option value="All">All Prefectures</option>
                        {PREFECTURES.map(pref => (
                            <option key={pref} value={pref}>{pref}</option>
                        ))}
                    </select>
                </div>

                {/* Venue Type Filter */}
                <div className="filter-group">
                    {VENUE_TYPES.map(type => (
                        <label key={type} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginRight: '15px', fontSize: '0.9rem' }}>
                            <input
                                type="checkbox"
                                checked={filters.types.includes(type)}
                                onChange={(e) => {
                                    const newTypes = e.target.checked
                                        ? [...filters.types, type]
                                        : filters.types.filter(t => t !== type);
                                    handleChange('types', newTypes);
                                }}
                                style={{ marginRight: '5px', accentColor: 'var(--primary-color)' }}
                            />
                            {type}
                        </label>
                    ))}
                </div>
            </div>

            <style>{`
                .filter-group {
                    position: relative;
                }
                .filter-icon {
                    position: absolute;
                    left: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #888;
                    pointer-events: none;
                }
                .filter-input, .filter-select {
                    width: 100%;
                    padding: 10px 10px 10px 35px;
                    border-radius: 6px;
                    border: 1px solid #333;
                    background: #0f172a;
                    color: #fff;
                    font-family: inherit;
                }
                .filter-input:focus, .filter-select:focus {
                    outline: none;
                    border-color: var(--primary-color);
                }
            `}</style>
        </div>
    );
};

export default SearchFilters;
