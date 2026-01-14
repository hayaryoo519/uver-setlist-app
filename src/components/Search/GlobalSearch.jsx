import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const GlobalSearch = ({ className = '' }) => {
    const [query, setQuery] = useState('');
    const navigate = useNavigate();

    const handleSearch = (e) => {
        e.preventDefault();
        if (query.trim()) {
            navigate(`/lives?search=${encodeURIComponent(query.trim())}`);
            setQuery(''); // Reset search after navigation
        }
    };

    return (
        <form onSubmit={handleSearch} className={`relative group ${className}`}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors" size={16} />
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="bg-slate-800/80 border border-slate-700/50 rounded-full py-1.5 pl-9 pr-4 text-sm text-white/90 placeholder-slate-500 w-32 focus:w-48 xl:focus:w-64 transition-all duration-300 focus:outline-none focus:border-blue-500 focus:bg-slate-900 focus:shadow-[0_0_15px_rgba(59,130,246,0.2)]"
            />
        </form>
    );
};

export default GlobalSearch;
