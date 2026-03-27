const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Helper to make regex more flexible
function fixTableButtons(content) {
    // 1. Students table - add remove button
    content = content.replace(
        /(<button[^>]*onclick="sendAbsenceSMS\(this\)"[^>]*>.*?<\/button>)\s*<\/td>/g,
        '$1\n                                            <button class="btn btn-danger btn-sm" onclick="removeRow(this)" title="මකන්න"><i class="fas fa-trash"></i></button>\n                                        </td>'
    );

    // 2. Teachers table - add remove button
    content = content.replace(
        /(<button[^>]*onclick="sendTeacherLeave[^>]*>.*?<\/button>)\s*<\/div>/g,
        '$1\n                                                <button class="btn btn-danger btn-sm" onclick="removeRow(this)" title="මකන්න"><i class="fas fa-trash"></i></button>\n                                            </div>'
    );

    // 3. Prefects table - add remove button
    content = content.replace(
        /(<button[^>]*onclick="sendPrefectNotice\(this\)"[^>]*>.*?<\/button>)\s*<\/div>/g,
        '$1\n                                                <button class="btn btn-danger btn-sm" onclick="removeRow(this)" title="මකන්න"><i class="fas fa-trash"></i></button>\n                                            </div>'
    );

    return content;
}

html = fixTableButtons(html);

// Ensure remove buttons have the correct class for consistency
html = html.replace(/class="btn btn-danger"(?! btn-sm)(?= onclick="removeRow)/g, 'class="btn btn-danger btn-sm"');

fs.writeFileSync('index.html', html);
console.log("Update completed successfully. The HTML has been updated with better button consistency.");

