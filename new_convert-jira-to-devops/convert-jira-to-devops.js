const fs = require("fs");
const csv = require("csv-parser");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

// File paths
const defaultFieldsFile = "new_convert-jira-to-devops/default_fields.csv"; // CSV with required fields
const allFieldsFile = "new_convert-jira-to-devops/all_fields.csv"; // CSV with all data
const outputFile = "new_convert-jira-to-devops/7777777EEEEOOO1000_cleaned.csv";

// Base URL for Jira issue links
const JIRA_BASE_URL = "https://microtec.atlassian.net/browse/";

// Priority Mapping: Jira → Azure DevOps
const priorityMapping = {
    "Lowest": "1",
    "Low": "1",
    "Medium": "2",
    "High": "3",
    "Highest": "4"
};

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
    .on("headers", (headers) => {
        // Find first 6 columns named "Attachment"
        allFieldsData.attachmentColumns = headers.filter((header, index) => header.toLowerCase().includes("attachment") && index < 6);
    })
    .on("data", (row) => {
        const issueKey = row["Issue key"];
        if (issueKey) {
            // Extract attachments dynamically
            let attachmentUrls = [];

            allFieldsData.attachmentColumns.forEach((col) => {
                if (row[col]) {
                    // Extract only URLs from the attachment cell
                    const matches = row[col].split(";").filter(entry => entry.trim().startsWith("http"));
                    if (matches.length > 0) {
                        attachmentUrls.push(...matches);
                    }
                }
            });

            const attachments = attachmentUrls.length > 0 ? attachmentUrls.join("\n") : "No Attachments";

            allFieldsData[issueKey] = {
                Description: cleanJiraDescription(row["Description"]),
                Environment: row["Environment"] || "Not Provided",
                Attachments: attachments
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
            const attachments = allFieldEntry.Attachments;
            const issueUrl = `${JIRA_BASE_URL}${issueKey}`;

            // Convert Jira Priority to Azure DevOps format
            const mappedPriority = priorityMapping[row["Priority"]] || "2"; // Default to Medium if missing

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
                "Priority": mappedPriority,
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

// // File paths
// const defaultFieldsFile = "new_convert-jira-to-devops/default_fields.csv"; // CSV with required fields
// const allFieldsFile = "new_convert-jira-to-devops/all_fields.csv"; // CSV with all data
// const outputFile = "new_convert-jira-to-devops/55555EEEEOOO1000_cleaned.csv";

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

// // Read all fields CSV and store necessary data
// const allFieldsData = {};

// fs.createReadStream(allFieldsFile)
//     .pipe(csv())
//     .on("headers", (headers) => {
//         // Identify all columns that contain "Attachment"
//         allFieldsData.attachmentColumns = headers.filter(header => header.toLowerCase().includes("attachment"));
//     })
//     .on("data", (row) => {
//         const issueKey = row["Issue key"];
//         if (issueKey) {
//             // Extract attachments dynamically from all attachment columns
//             let attachmentUrls = [];

//             allFieldsData.attachmentColumns.forEach((col) => {
//                 if (row[col]) {
//                     const matches = row[col].match(/https?:\/\/[^\s]+/g);
//                     if (matches) {
//                         attachmentUrls.push(...matches);
//                     }
//                 }
//             });

//             const attachments = attachmentUrls.length > 0 ? attachmentUrls.join("\n") : "No Attachments";

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







// const fs = require("fs");
// const csv = require("csv-parser");
// const createCsvWriter = require("csv-writer").createObjectCsvWriter;

// // File paths
// const defaultFieldsFile = "new_convert-jira-to-devops/default_fields.csv"; // CSV with required fields
// const allFieldsFile = "new_convert-jira-to-devops/all_fields.csv"; // CSV with all data
// const outputFile = "new_convert-jira-to-devops/4444EEEEOOO1000_cleaned.csv";

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

// // Read all fields CSV and store necessary data
// const allFieldsData = {};

// fs.createReadStream(allFieldsFile)
//     .pipe(csv())
//     .on("data", (row) => {
//         const issueKey = row["Issue key"];
//         if (issueKey) {
//             // Extract all attachments (multiple columns contain URLs)
//             // const attachmentUrls = Object.values(row)
//             //     .filter(value => typeof value === "string" && value.startsWith("http")) // Extract only URLs
//             //     .join("\n");
//             // Extract all attachments dynamically
//             const attachmentUrls = Object.entries(row)
//                 .filter(([key, value]) => key.toLowerCase().includes("attachment") && typeof value === "string" && value.includes("http"))
//                 .map(([_, value]) => {
//                     // Some attachment columns have multiple attachments separated by semicolons
//                     return value.split(";").map(item => item.trim()).filter(url => url.startsWith("http"));
//                 })
//                 .flat()
//                 .join("\n");

//             // If no attachments found, mark it properly
//             const attachments = attachmentUrls.length > 0 ? attachmentUrls : "No Attachments";


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









// const fs = require("fs");
// const csv = require("csv-parser");
// const createCsvWriter = require("csv-writer").createObjectCsvWriter;

// // File paths
// const defaultFieldsFile = "new_convert-jira-to-devops/default_fields.csv"; // CSV with required fields
// const allFieldsFile = "new_convert-jira-to-devops/all_fields.csv"; // CSV with all data
// const outputFile = "new_convert-jira-to-devops/Out1000_cleaned.csv";

// // Base URL for Jira issue links
// const JIRA_BASE_URL = "https://microtec.atlassian.net/browse/";

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

// // Read all fields CSV and store necessary data
// const allFieldsData = {};

// fs.createReadStream(allFieldsFile)
//     .pipe(csv())
//     .on("data", (row) => {
//         const issueKey = row["Issue key"];
//         if (issueKey) {
//             allFieldsData[issueKey] = {
//                 Description: cleanJiraDescription(row["Description"]),
//                 Environment: row["Environment"] || "Not Provided",
//                 Attachments: Object.values(row)
//                     .filter(value => typeof value === "string" && value.includes("https://")) // Extract all attachment URLs
//                     .join("\n")
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
//             const attachments = allFieldEntry.Attachments || "No Attachments";
//             const issueUrl = `${JIRA_BASE_URL}${issueKey}`;

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
//                 "Priority": row["Priority"],
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