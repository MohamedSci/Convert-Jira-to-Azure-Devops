const fs = require("fs");
const csv = require("csv-parser");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

// File paths
const DEFAULT_FIELDS_FILE = "new_convert-jira-to-devops/default_fields.csv";
const ALL_FIELDS_FILE = "new_convert-jira-to-devops/all_fields.csv";
const OUTPUT_FILE = "new_convert-jira-to-devops/azure_output.csv";

// Base URL for Jira issue links
const JIRA_BASE_URL = "https://microtec.atlassian.net/browse/";

// Priority Mapping: Jira → Azure DevOps
const PRIORITY_MAPPING = {
    "Lowest": "4",
    "Low": "4",
    "Medium": "3",
    "High": "2",
    "Highest": "1"
};

// Logging function
function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

// Function to clean Jira description formatting
function cleanJiraDescription(jiraText) {
    if (!jiraText) return "No description available.";

    return jiraText
        .replace(/h[34]\.\s*\*/g, "**") // Convert h3/h4. *Title:* → **Title:**
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

// Function to extract attachment URLs
function extractAttachmentUrls(attachmentCell) {
    if (!attachmentCell) return [];

    // Match URLs starting with https:// and ending with a space or end of string
    const urlRegex = /https:\/\/[^\s]+/g;
    return attachmentCell.match(urlRegex) || [];
}

// Function to process all_fields.csv
function processAllFields() {
    return new Promise((resolve, reject) => {
        const allFieldsData = new Map();

        fs.createReadStream(ALL_FIELDS_FILE)
            .pipe(csv())
            .on("headers", (headers) => {
                log(`Processing all_fields.csv with headers: ${headers.join(", ")}`);
            })
            .on("data", (row) => {
                try {
                    const issueKey = row["Issue key"];
                    if (!issueKey) {
                        log(`Skipping row with missing Issue key: ${JSON.stringify(row)}`);
                        return;
                    }

                    // Extract attachments
                    const attachmentUrls = extractAttachmentUrls(row["Attachment"]);

                    allFieldsData.set(issueKey, {
                        Description: cleanJiraDescription(row["Description"]),
                        Environment: row["Environment"] || "Not Provided",
                        Attachments: attachmentUrls.length > 0 ? attachmentUrls.join("\n") : "No Attachments"
                    });
                } catch (error) {
                    log(`Error processing row: ${error.message}`);
                }
            })
            .on("end", () => {
                log(`Processed ${allFieldsData.size} rows from all_fields.csv`);
                resolve(allFieldsData);
            })
            .on("error", (error) => {
                reject(error);
            });
    });
}

// Function to process default_fields.csv
function processDefaultFields(allFieldsData) {
    return new Promise((resolve, reject) => {
        const results = [];

        fs.createReadStream(DEFAULT_FIELDS_FILE)
            .pipe(csv())
            .on("headers", (headers) => {
                log(`Processing default_fields.csv with headers: ${headers.join(", ")}`);
            })
            .on("data", (row) => {
                try {
                    const issueKey = row["Issue key"];
                    if (!issueKey) {
                        log(`Skipping row with missing Issue key: ${JSON.stringify(row)}`);
                        return;
                    }

                    const allFieldEntry = allFieldsData.get(issueKey) || {};

                    // Construct refined description
                    const refinedDescription = [
                        `### Description\n${allFieldEntry.Description || "No description available."}`,
                        `### Environment\n${allFieldEntry.Environment}`,
                        `### Original Issue\n[View in Jira](${JIRA_BASE_URL}${issueKey})`,
                        `### Attachments\n${allFieldEntry.Attachments}`
                    ].join("\n\n");

                    results.push({
                        "Work Item Type": "Bug",
                        "Title": row["Summary"],
                        "Assigned To": row["Assignee"],
                        "Created By": row["Reporter"],
                        "Priority": PRIORITY_MAPPING[row["Priority"]] || "2", // Default to Medium
                        "State": row["Status"],
                        "Created Date": formatToISO8601(row["Created"]),
                        "Changed Date": formatToISO8601(row["Updated"]),
                        "Description": refinedDescription
                    });
                } catch (error) {
                    log(`Error processing row: ${error.message}`);
                }
            })
            .on("end", () => {
                log(`Processed ${results.length} rows from default_fields.csv`);
                resolve(results);
            })
            .on("error", (error) => {
                reject(error);
            });
    });
}

// Main function
async function main() {
    try {
        // Step 1: Process all_fields.csv
        const allFieldsData = await processAllFields();

        // Step 2: Process default_fields.csv
        const results = await processDefaultFields(allFieldsData);

        // Step 3: Write output CSV
        const csvWriter = createCsvWriter({
            path: OUTPUT_FILE,
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

        await csvWriter.writeRecords(results);
        log(`✅ Final cleaned CSV saved as: ${OUTPUT_FILE}`);
    } catch (error) {
        log(`❌ Error: ${error.message}`);
    }
}

// Run the script
main();






// const fs = require("fs");
// const csv = require("csv-parser");
// const createCsvWriter = require("csv-writer").createObjectCsvWriter;

// // File paths
// const defaultFieldsFile = "new_convert-jira-to-devops/default_fields.csv"; // CSV with required fields
// const allFieldsFile = "new_convert-jira-to-devops/all_fields.csv"; // CSV with all data
// const outputFile = "new_convert-jira-to-devops/123456789EEEEOOO1000_cleaned.csv";

// // Base URL for Jira issue links
// const JIRA_BASE_URL = "https://microtec.atlassian.net/browse/";

// // Priority Mapping: Jira → Azure DevOps
// const priorityMapping = {
//     "Lowest": "1",
//     "Low": "1",
//     "Medium": "2",
//     "High": "3",
//     "Highest": "4"
// };

// // Function to clean Jira description formatting
// function cleanJiraDescription(jiraText) {
//     if (!jiraText) return "No description available.";

//     return jiraText
//         .replace(/h4\.\s*\*/g, "**") // Convert h4. *Title:* → **Title:**  
//         .replace(/h3\.\s*\*/g, "**") // Convert h3. *Title:* → **Title:**  
//         .replace(/\*(.*?)\*/g, "_$1_") // Convert *bold* → _italic_  
//         .replace(/#/g, "-") // Convert # Lists → - Lists  
//         .replace(/\n\s*\n/g, "\n") // Remove extra blank lines  
//         .trim();
// }

// // Function to format date to ISO 8601 for Azure DevOps
// function formatToISO8601(dateString) {
//     if (!dateString) return "";

//     const parsedDate = new Date(dateString);
//     if (isNaN(parsedDate)) return "";

//     return parsedDate.toISOString(); // Converts to YYYY-MM-DDTHH:MM:SSZ
// }

// // Function to extract attachment URLs
// function extractAttachmentUrls(attachmentCell) {
//     if (!attachmentCell) return [];

//     // Match URLs starting with https:// and ending with a space or end of string
//     const urlRegex = /https:\/\/[^\s]+/g;
//     return attachmentCell.match(urlRegex) || [];
// }

// // Read all fields CSV and store necessary data
// const allFieldsData = {};

// // Process all_fields.csv
// fs.createReadStream(allFieldsFile)
//     .pipe(csv())
//     .on("headers", (headers) => {
//         // Find the "Attachment" column
//         allFieldsData.attachmentColumn = headers.find(header => 
//             header.toLowerCase() === "attachment"
//         );
//     })
//     .on("data", (row) => {
//         const issueKey = row["Issue key"];
//         if (issueKey) {
//             // Extract attachments from the "Attachment" column
//             const attachmentUrls = extractAttachmentUrls(row[allFieldsData.attachmentColumn]);

//             const attachments = attachmentUrls.length > 0 ? 
//                 attachmentUrls.join("\n") : 
//                 "No Attachments";

//             allFieldsData[issueKey] = {
//                 Description: cleanJiraDescription(row["Description"]),
//                 Environment: row["Environment"] || "Not Provided",
//                 Attachments: attachments
//             };
//         }
//     })
//     .on("end", () => {
//         console.log("✅ Processed all_fields.csv. Enriching default fields...");
//         processDefaultFields();
//     });

// // Process the default fields CSV and merge data
// function processDefaultFields() {
//     let results = [];

//     fs.createReadStream(defaultFieldsFile)
//         .pipe(csv())
//         .on("data", (row) => {
//             const issueKey = row["Issue key"];
//             const allFieldEntry = allFieldsData[issueKey] || {};

//             const description = allFieldEntry.Description || "No description available.";
//             const environment = allFieldEntry.Environment;
//             const attachments = allFieldEntry.Attachments;
//             const issueUrl = `${JIRA_BASE_URL}${issueKey}`;

//             // Convert Jira Priority to Azure DevOps format
//             const mappedPriority = priorityMapping[row["Priority"]] || "2"; // Default to Medium if missing

//             // Construct refined Description column
//             let refinedDescription = `### Description\n${description}\n\n`;
//             refinedDescription += `### Environment\n${environment}\n\n`;
//             refinedDescription += `### Original Issue\n[View in Jira](${issueUrl})\n\n`;
//             refinedDescription += `### Attachments\n${attachments}`;

//             results.push({
//                 "Work Item Type": "Bug",
//                 "Title": row["Summary"],
//                 "Assigned To": row["Assignee"],
//                 "Created By": row["Reporter"],
//                 "Priority": mappedPriority,
//                 "State": row["Status"],
//                 "Created Date": formatToISO8601(row["Created"]),
//                 "Changed Date": formatToISO8601(row["Updated"]),
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
//                 console.log(`✅ Final cleaned CSV saved as: ${outputFile}`);
//             });
//         });
// }