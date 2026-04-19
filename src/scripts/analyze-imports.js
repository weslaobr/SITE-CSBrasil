const fs = require('fs');
const file = 'e:/Github/SITE-CSBrasil/src/components/dashboard/matches-dashboard.tsx';
const content = fs.readFileSync(file, 'utf8');

// Find all used components (PascalCase tags or calls)
const used = new Set();
const tagRegex = /<([A-Z][a-zA-Z0-9]+)/g;
let match;
while ((match = tagRegex.exec(content)) !== null) {
    used.add(match[1]);
}

// Find all imported components from lucide-react
const importRegex = /import\s+\{([^}]+)\}\s+from\s+'lucide-react'/;
const imports = content.match(importRegex);
if (imports) {
    const importedNames = imports[1].split(',').map(n => n.trim().split(' as ')[0]);
    console.log("Used components:", Array.from(used).join(', '));
    console.log("Imported from lucide:", importedNames.join(', '));
    
    const missing = Array.from(used).filter(u => {
        // Exclude standard components or components imported from elsewhere
        if (u === 'MatchReportModal' || u === 'Link' || u === 'Fragment') return false;
        if (u === 'Scan' || u === 'Swords' || u === 'Calendar' || u === 'MapIcon' || u === 'Target' || u === 'Trophy' || u === 'Info' || u === 'ChevronDown' || u === 'ChevronUp' || u === 'Filter' || u === 'ExternalLink' || u === 'Search' || u === 'RefreshCw' || u === 'ChevronRight' || u === 'Copy' || u === 'Lock' || u === 'Users' || u === 'Activity' || u === 'Zap' || u === 'TrendingUp' || u === 'Check' || u === 'Shield' || u === 'Play' || u === 'Download') {
            return !importedNames.includes(u);
        }
        return false;
    });
    console.log("Possibly missing icons:", missing.join(', '));
} else {
    console.log("No lucide-react import found");
}
