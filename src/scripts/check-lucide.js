const fs = require('fs');
const file = 'e:/Github/SITE-CSBrasil/src/components/dashboard/matches-dashboard.tsx';
const content = fs.readFileSync(file, 'utf8');

// Icons we SHOULD have
const lucideIcons = [
    "Swords", "Calendar", "Map", "Target", "Trophy", "Info", "ChevronDown", "ChevronUp",
    "Filter", "ExternalLink", "Search", "RefreshCw", "ChevronRight", "Copy", "Lock",
    "Users", "Activity", "Zap", "TrendingUp", "Check", "Shield", "Play", "Download", "ChevronLeft", "X", "ArrowRight", "Eye", "EyeOff", "Star", "Flame", "Clock", "AlertCircle"
];

const found = [];
lucideIcons.forEach(icon => {
    // Search for <Icon or Icon size= etc
    const regex = new RegExp('<' + icon + '[\\s/>]', 'g');
    if (regex.test(content)) {
        found.push(icon);
    }
});

const importMatch = content.match(/import\s+\{([^}]+)\}\s+from\s+'lucide-react'/);
if (importMatch) {
    const imported = importMatch[1].split(',').map(n => n.trim().split(' as ')[0]);
    const missing = found.filter(f => !imported.includes(f));
    console.log("Used icons:", found.join(', '));
    console.log("Imported icons:", imported.join(', '));
    console.log("CRITICAL MISSING:", missing.join(', '));
} else {
    console.log("No lucide-react import found");
}
