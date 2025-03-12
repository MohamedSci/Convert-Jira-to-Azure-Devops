const fs = require('fs');
const csv = require('csv-parser');

const inputFile = 'extract-attachments/2.csv';  // Change this to your actual CSV file
const outputFile = 'attachment-links.txt'; // Output file for extracted links

let attachmentColumns = []; // To store column names that contain "Attachment"
const attachmentLinks = [];

fs.createReadStream(inputFile)
  .pipe(csv())
  .on('headers', (headers) => {
    // Identify all columns that contain "Attachment"
    attachmentColumns = headers.filter(header => header.toLowerCase().includes('attachment'));
  })
  .on('data', (row) => {
    attachmentColumns.forEach((col) => {
      if (row[col]) {
        // Extract URLs from the column
        const matches = row[col].match(/https?:\/\/[^\s]+/g);
        if (matches) {
          attachmentLinks.push(...matches);
        }
      }
    });
  })
  .on('end', () => {
    fs.writeFileSync(outputFile, attachmentLinks.join('\n'), 'utf8');
    console.log(`✅ Extracted ${attachmentLinks.length} attachment links to ${outputFile}`);
  });
