const fs = require("fs");
const csv = require("csv-parser");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

// File paths
const defaultFieldsFile = "new_convert-jira-to-devops/default_fields.csv"; // CSV with required fields
const allFieldsFile = "new_convert-jira-to-devops/all_fields.csv"; // CSV with all data
const outputFile = "new_convert-jira-to-devops/Out1000_cleaned.csv";

// Base URL for Jira issue links
const JIRA_BASE_URL = "https://microtec.atlassian.net/browse/";

// Function to clean Jira description formatting
function cleanJiraDescription(jiraText) {
    if (!jiraText) return "No description available.";

    return jiraText
        .replace(/h4\.\s*\*/g, "**") // Convert h4. *Title:* → **Title:**  
        .replace(/h3\.\s*\*/g, "**") // Convert h3. *Title:* → **Title:**  
        .replace(/\*(.*?)\*/g, "_$1_") // Convert *bold* → _italic_  
        .replace(/#/g, "-") // Convert # Lists → - Lists  
        .replace(/\n\s*\n/g, "\n") // Remove extra blank lines  
        .trim();
}

// Function to format date to ISO 8601 for Azure DevOps
function formatToISO8601(dateString) {
    if (!dateString) return "";

    const parsedDate = new Date(dateString);
    if (isNaN(parsedDate)) return "";

    return parsedDate.toISOString(); // Converts to YYYY-MM-DDTHH:MM:SSZ
}

// Read all fields CSV and store necessary data
const allFieldsData = {};

fs.createReadStream(allFieldsFile)
    .pipe(csv())
    .on("data", (row) => {
        const issueKey = row["Issue key"];
        if (issueKey) {
            allFieldsData[issueKey] = {
                Description: cleanJiraDescription(row["Description"]),
                Environment: row["Environment"] || "Not Provided",
                Attachments: Object.values(row)
                    .filter(value => typeof value === "string" && value.includes("https://")) // Extract all attachment URLs
                    .join("\n")
            };
        }
    })
    .on("end", () => {
        console.log("✅ Processed all_fields.csv. Enriching default fields...");
        processDefaultFields();
    });

// Process the default fields CSV and merge data
function processDefaultFields() {
    let results = [];

    fs.createReadStream(defaultFieldsFile)
        .pipe(csv())
        .on("data", (row) => {
            const issueKey = row["Issue key"];
            const allFieldEntry = allFieldsData[issueKey] || {};
            const description = allFieldEntry.Description || "No description available.";
            const environment = allFieldEntry.Environment;
            const attachments = allFieldEntry.Attachments || "No Attachments";
            const issueUrl = `${JIRA_BASE_URL}${issueKey}`;

            // Construct refined Description column
            let refinedDescription = `### Description\n${description}\n\n`;
            refinedDescription += `### Environment\n${environment}\n\n`;
            refinedDescription += `### Original Issue\n[View in Jira](${issueUrl})\n\n`;
            refinedDescription += `### Attachments\n${attachments}`;

            results.push({
                "Work Item Type": "Bug",
                "Title": row["Summary"],
                "Assigned To": row["Assignee"],
                "Created By": row["Reporter"],
                "Priority": row["Priority"],
                "State": row["Status"],
                "Created Date": formatToISO8601(row["Created"]),
                "Changed Date": formatToISO8601(row["Updated"]),
                "Description": refinedDescription
            });
        })
        .on("end", () => {
            const csvWriter = createCsvWriter({
                path: outputFile,
                header: [
                    { id: "Work Item Type", title: "Work Item Type" },
                    { id: "Title", title: "Title" },
                    { id: "Assigned To", title: "Assigned To" },
                    { id: "Created By", title: "Created By" },
                    { id: "Priority", title: "Priority" },
                    { id: "State", title: "State" },
                    { id: "Created Date", title: "Created Date" },
                    { id: "Changed Date", title: "Changed Date" },
                    { id: "Description", title: "Description" }
                ],
            });

            csvWriter.writeRecords(results).then(() => {
                console.log(`✅ Final cleaned CSV saved as: ${outputFile}`);
            });
        });
}







// const fs = require("fs");
// const csv = require("csv-parser");
// const createCsvWriter = require("csv-writer").createObjectCsvWriter;

// // Configuration
// const DEFAULT_CSV = "new_convert-jira-to-devops/default_fields.csv";
// const ALL_FIELDS_CSV = "new_convert-jira-to-devops/all_fields.csv";
// const OUTPUT_CSV = "new_convert-jira-to-devops/azure_output.csv";
// const JIRA_BASE_URL = "https://microtec.atlassian.net/browse/";

// // Column Mappings (Update according to your CSV headers)
// const COLUMN_MAPPINGS = {
//   'Issue Type': 'Work type',
//   'Summary': 'Summary',
//   'Assignee': 'Assignee',
//   'Reporter': 'Reporter',
//   'Priority': 'Priority',
//   'Description': 'Description',
//   'Status': 'Status',
//   'Created': 'Created',
//   'Updated': 'Updated'
// };

// // Priority Mapping
// const PRIORITY_MAP = { low: 1, medium: 2, high: 3, highest: 4 };

// // Read all fields data into memory
// let allFieldsData = new Map();

// function cleanJiraDescription(text) {
//   return (text || "")
//     .replace(/h[34]\.\s*\*/g, "**")
//     .replace(/\*(.*?)\*/g, "_$1_")
//     .replace(/#/g, "-")
//     .replace(/\n\s*\n/g, "\n");
// }

// function processAttachments(row) {
//   return Object.entries(row)
//     .filter(([key]) => key.startsWith("Attachment"))
//     .map(([, value]) => value)
//     .filter(Boolean);
// }

// // Read All Fields CSV first
// fs.createReadStream(ALL_FIELDS_CSV)
//   .pipe(csv())
//   .on("data", (row) => {
//     allFieldsData.set(row['Issue key'], row);
//   })
//   .on("end", () => {
//     processDefaultCSV();
//   });

// function processDefaultCSV() {
//   const results = [];

//   fs.createReadStream(DEFAULT_CSV)
//     .pipe(csv())
//     .on("data", (defaultRow) => {
//       const issueKey = defaultRow['Issue Key'];
//       const allFieldsRow = allFieldsData.get(issueKey) || {};
      
//       // Map Azure columns
//       const azureRow = {};
//       Object.entries(COLUMN_MAPPINGS).forEach(([src, dest]) => {
//         azureRow[dest] = defaultRow[src];
//       });

//       // Process Priority
//       azureRow.Priority = PRIORITY_MAP[azureRow.Priority?.toLowerCase()] || azureRow.Priority;

//       // Build enhanced description
//       let description = cleanJiraDescription(allFieldsRow.Description);
//       description += `\n\nEnvironment: ${allFieldsRow.Environment || 'Not specified'}`;
//       description += `\n\nOriginal Issue: ${JIRA_BASE_URL}${issueKey}`;
      
//       const attachments = processAttachments(allFieldsRow);
//       if (attachments.length > 0) {
//         description += `\n\nAttachments:\n${attachments.map(a => `- ${a}`).join('\n')}`;
//       }

//       azureRow.Description = description;
//       results.push(azureRow);
//     })
//     .on("end", () => {
//       const csvWriter = createCsvWriter({
//         path: OUTPUT_CSV,
//         header: Object.values(COLUMN_MAPPINGS).map(title => ({ id: title, title }))
//       });

//       csvWriter.writeRecords(results)
//         .then(() => console.log(`✅ Migration complete! Output saved to ${OUTPUT_CSV}`))
//         .catch(err => console.error("Error writing CSV:", err));
//     });
// }



// const fs = require("fs");
// const csv = require("csv-parser");
// const createCsvWriter = require("csv-writer").createObjectCsvWriter;

// const defaultFieldsFile = "new_convert-jira-to-devops/default_fields.csv";  // CSV with required fields
// const allFieldsFile = "new_convert-jira-to-devops/all_fields.csv";  // CSV with all data
// const outputFile = "new_convert-jira-to-devops/Out_cleaned.csv";

// // Base URL for Jira issue links
// const JIRA_BASE_URL = "https://microtec.atlassian.net/browse/";

// // Function to clean Jira formatting for DevOps
// function cleanJiraDescription(jiraText) {
//     if (!jiraText) return "";

//     return jiraText
//         .replace(/h4\.\s*\*/g, "**")  // Convert h4. *Title:* → **Title:**  
//         .replace(/h3\.\s*\*/g, "**")  // Convert h3. *Title:* → **Title:**  
//         .replace(/\*(.*?)\*/g, "_$1_") // Convert *bold* → _italic_  
//         .replace(/#/g, "-")  // Convert # Lists → - Lists  
//         .replace(/\n\s*\n/g, "\n"); // Remove extra blank lines  
// }

// // Read all fields data into a lookup object (IssueKey -> Environment, Attachments)
// const allFieldsData = {};

// fs.createReadStream(allFieldsFile)
//     .pipe(csv())
//     .on("data", (row) => {
//         const issueKey = row["Issue key"];
//         if (issueKey) {
//             allFieldsData[issueKey] = {
//                 Environment: row["Environment"] || "",
//                 Attachments: Object.values(row)
//                     .filter(value => typeof value === "string" && value.includes("https://")) // Extract all attachment URLs
//                     .join("\n")
//             };
//         }
//     })
//     .on("end", () => {
//         console.log("✅ All fields CSV processed. Enriching default fields...");
//         processDefaultFields();
//     });

// // Process the default fields CSV and merge data
// function processDefaultFields() {
//     let results = [];

//     fs.createReadStream(defaultFieldsFile)
//         .pipe(csv())
//         .on("data", (row) => {
//             const issueKey = row["Issue key"];
//             const environment = allFieldsData[issueKey]?.Environment || "Not Provided";
//             const attachments = allFieldsData[issueKey]?.Attachments || "No Attachments";
//             const issueUrl = JIRA_BASE_URL + issueKey;

//             // Construct the refined description
//             let refinedDescription = `### Description\n${cleanJiraDescription(row.Description || "No description available")}\n\n`;
//             refinedDescription += `### Environment\n${environment}\n\n`;
//             refinedDescription += `### Original Issue\n[View in Jira](${issueUrl})\n\n`;
//             refinedDescription += `### Attachments\n${attachments}`;

//             results.push({
//                 "Work Item Type": "Bug",
//                 "Title": row["Summary"],
//                 "Assigned To": row["Assignee"],
//                 "Created By": row["Reporter"],
//                 "Priority": row["Priority"],
//                 "State": row["Status"],
//                 "Created Date": row["Created"],
//                 "Changed Date": row["Updated"],
//                 "Description": refinedDescription
//             });
//         })
//         .on("end", () => {
//             const csvWriter = createCsvWriter({
//                 path: outputFile,
//                 header: [
//                     { id: "Work Item Type", title: "Work Item Type" },
//                     { id: "Title", title: "Title" },
//                     { id: "Assigned To", title: "Assigned To" },
//                     { id: "Created By", title: "Created By" },
//                     { id: "Priority", title: "Priority" },
//                     { id: "State", title: "State" },
//                     { id: "Created Date", title: "Created Date" },
//                     { id: "Changed Date", title: "Changed Date" },
//                     { id: "Description", title: "Description" }
//                 ],
//             });

//             csvWriter.writeRecords(results).then(() => {
//                 console.log(`✅ Cleaned & enriched CSV saved as: ${outputFile}`);
//             });
//         });
// }
