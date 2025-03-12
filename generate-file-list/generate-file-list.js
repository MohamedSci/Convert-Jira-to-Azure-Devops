const fs = require('fs');
const path = require('path');

function generateFileList(directoryPath, outputFile = 'file-list.txt') {
  try {
    // Read directory contents
    const files = fs.readdirSync(directoryPath);
    
    // Filter out directories and create file list
    const fileList = files.filter(file => {
      return fs.statSync(path.join(directoryPath, file)).isFile();
    });
    
    // Create output content
    const outputContent = fileList.join('\n');
    
    // Write to text file
    fs.writeFileSync(outputFile, outputContent);
    
    console.log(`File list generated successfully: ${outputFile}`);
    console.log(`Found ${fileList.length} files`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Usage example:
const targetDirectory = 'D:/MyCourses/Python_Data_Analysis'; // Change this to your folder path
generateFileList(targetDirectory);