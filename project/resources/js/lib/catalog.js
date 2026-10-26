const TONES = [
    { keys: ['kopi', 'espresso', 'latte', 'cappuccino', 'americano', 'mocha', 'macchiato', 'cold brew'], icon: 'coffee', tone: 'from-coffee-700 to-coffee-500 text-cream-100' },
    { keys: ['teh', 'tea', 'matcha', 'lemon', 'soda', 'jus', 'juice'], icon: 'leaf', tone: 'from-sage-600 to-sage-400 text-white' },
    { keys: ['nasi', 'mie', 'ayam', 'burger', 'pasta', 'roti', 'sandwich', 'kentang', 'makan', 'soto', 'bakso'], icon: 'utensils', tone: 'from-clay-600 to-clay-400 text-white' },
    { keys: ['cake', 'kue', 'cookie', 'brownies', 'dessert', 'croissant', 'puding'], icon: 'cookie', tone: 'from-amber-600 to-amber-400 text-white' },
];

export const menuLook = (name) => {
    const normalized = String(name || '').toLowerCase();
    return TONES.find((tone) => tone.keys.some((key) => normalized.includes(key)))
        || { icon: 'cup', tone: 'from-coffee-600 to-clay-400 text-white' };
};
