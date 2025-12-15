
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Country {
    code: string;
    dial: string;
    flag: string;
    mask: string; // Simple mask e.g. "5XX XXX XX XX"
}

const COUNTRIES: Country[] = [
    { code: 'TR', dial: '+90', flag: '🇹🇷', mask: '5XX XXX XX XX' },
    { code: 'US', dial: '+1', flag: '🇺🇸', mask: '(XXX) XXX-XXXX' },
    { code: 'DE', dial: '+49', flag: '🇩🇪', mask: '1XX XXXXXXXX' },
    { code: 'RU', dial: '+7', flag: '🇷🇺', mask: '(XXX) XXX-XX-XX' },
    { code: 'SA', dial: '+966', flag: '🇸🇦', mask: '5X XXX XXXX' },
    { code: 'ID', dial: '+62', flag: '🇮🇩', mask: '8XX-XXXX-XXXX' },
    { code: 'GB', dial: '+44', flag: '🇬🇧', mask: '7XXX XXXXXX' },
];

interface PhoneInputProps {
    value: string;
    onChange: (fullNumber: string) => void;
    disabled?: boolean;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({ value, onChange, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
    const [localNumber, setLocalNumber] = useState('');

    // Parse initial value if exists
    useEffect(() => {
        if (value) {
            // Try to find matching country code
            const country = COUNTRIES.find(c => value.startsWith(c.dial));
            if (country) {
                setSelectedCountry(country);
                // Remove dial code from display
                setLocalNumber(value.replace(country.dial, ''));
            } else {
                // Default fallback if no match found but value exists
                setLocalNumber(value);
            }
        }
    }, []);

    const handleCountrySelect = (country: Country) => {
        setSelectedCountry(country);
        setIsOpen(false);
        // Recalculate full number with new code
        onChange(country.dial + localNumber.replace(/\D/g, ''));
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value;
        // Strip non-numeric chars for logic
        const numeric = input.replace(/\D/g, '');
        
        // Simple formatting based on length (Visual only)
        // For TR: 555 123 45 67
        let formatted = numeric;
        if (selectedCountry.code === 'TR' && numeric.length > 3) {
             formatted = numeric.slice(0, 3) + ' ' + numeric.slice(3);
        }
        if (selectedCountry.code === 'TR' && numeric.length > 6) {
             formatted = numeric.slice(0, 3) + ' ' + numeric.slice(3, 6) + ' ' + numeric.slice(6);
        }
        if (selectedCountry.code === 'TR' && numeric.length > 8) {
             formatted = numeric.slice(0, 3) + ' ' + numeric.slice(3, 6) + ' ' + numeric.slice(6, 8) + ' ' + numeric.slice(8, 10);
        }

        setLocalNumber(formatted);
        onChange(selectedCountry.dial + numeric);
    };

    return (
        <div className="relative">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Telefon Numarası</label>
            
            <div className={`flex items-center bg-white border-2 rounded-2xl transition-all ${disabled ? 'opacity-50' : 'border-gray-100 focus-within:border-primary focus-within:shadow-lg focus-within:shadow-primary/5'}`}>
                
                {/* Country Dropdown Trigger */}
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 pl-4 pr-3 py-4 border-r border-gray-100 hover:bg-gray-50 rounded-l-2xl transition-colors"
                >
                    <span className="text-2xl leading-none">{selectedCountry.flag}</span>
                    <span className="text-sm font-bold text-gray-600">{selectedCountry.dial}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Number Input */}
                <input
                    type="tel"
                    value={localNumber}
                    onChange={handleNumberChange}
                    disabled={disabled}
                    placeholder={selectedCountry.mask}
                    className="flex-1 bg-transparent py-4 pl-4 pr-4 text-lg font-bold text-gray-800 placeholder-gray-300 outline-none w-full"
                />
            </div>

            {/* Country Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-20 overflow-hidden max-h-60 overflow-y-auto"
                        >
                            {COUNTRIES.map(country => (
                                <button
                                    key={country.code}
                                    onClick={() => handleCountrySelect(country)}
                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">{country.flag}</span>
                                        <span className="text-sm font-bold text-gray-700">{country.code}</span>
                                        <span className="text-xs text-gray-400">({country.dial})</span>
                                    </div>
                                    {selectedCountry.code === country.code && (
                                        <Check className="w-4 h-4 text-primary" />
                                    )}
                                </button>
                            ))}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};
