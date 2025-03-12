const fs = require("fs");
const csv = require("csv-parser");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

// Function to clean Jira formatting
function cleanJiraDescription(jiraText) {
    if (!jiraText) return "";

    return jiraText
        .replace(/h4\.\s*\*/g, "**")  // Convert h4. *Title:* → **Title:**  
        .replace(/h3\.\s*\*/g, "**")  // Convert h3. *Title:* → **Title:**  
        .replace(/\*(.*?)\*/g, "_$1_") // Convert *bold* → _italic_  
        .replace(/#/g, "-")  // Convert # Lists → - Lists  
        .replace(/\n\s*\n/g, "\n"); // Remove extra blank lines  
}

// Read and process CSV file
const inputFile = "1000.csv";
const outputFile = "1000_cleaned.csv";

let results = [];

fs.createReadStream(inputFile)
    .pipe(csv())
    .on("data", (row) => {
        if (row.Description) {
            row.Description = cleanJiraDescription(row.Description);
        }
        results.push(row);
    })
    .on("end", () => {
        // Write cleaned data to new CSV
        const csvWriter = createCsvWriter({
            path: outputFile,
            header: Object.keys(results[0]).map((key) => ({ id: key, title: key })),
        });

        csvWriter.writeRecords(results).then(() => {
            console.log(`✅ Cleaned CSV saved as: ${outputFile}`);
        });
    });
