import fs from 'fs/promises';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to sanitize directory names
const sanitize = (name) => {
    return name.replace(/[<>:"\/\\|?*\x00-\x1F]/g, '_').replace(/\s+/g, '_');
};

// Function to download a PDF
const downloadPDF = async (url, destination) => {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode === 200) {
          const chunks = [];
          response.on("data", (chunk) => chunks.push(chunk));
          response.on("end", async () => {
            try {
              const buffer = Buffer.concat(chunks);
              await fs.writeFile(destination, buffer);
              console.log(`Downloaded: ${destination}`);
              resolve();
            } catch (error) {
              reject(error);
            }
          });
        } else {
          reject(new Error(`Failed to download PDF: ${response.statusCode}`));
        }
      })
      .on("error", (err) => reject(err));
  });
};

// Read the productsInfo.txt file
fs.readFile('productsInfo.txt', 'utf8')
  .then(data => {
    console.log('File read successfully');
    // Parse the JSON data
    let products;
    try {
        products = JSON.parse(data);
        console.log('JSON parsed successfully');
    } catch (err) {
        console.error('Error parsing JSON:', err);
        return;
    }

    // Process each product
    products.forEach(product => {
        const { name: productName, userManual: userManualUrl, datasheet: datasheetUrl } = product;

        // Create a directory for the product
        const sanitizedProductName = sanitize(productName);
        const productDir = path.join(__dirname, 'download', sanitizedProductName);
        fs.mkdir(productDir, { recursive: true })
          .then(() => {
            console.log(`Directory created: ${productDir}`);

            // Download the user manual
            if (userManualUrl) {
                downloadPDF(userManualUrl, path.join(productDir, 'userManual.pdf')).catch(console.error);
            }

            // Download the datasheet
            if (datasheetUrl) {
                downloadPDF(datasheetUrl, path.join(productDir, 'datasheet.pdf')).catch(console.error);
            }
          })
          .catch(err => console.error('Error creating directory:', err));
    });
  })
  .catch(err => console.error('Error reading file:', err));