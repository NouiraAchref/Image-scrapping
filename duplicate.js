// import fs from 'fs/promises'; // Use the promise-based version of 'fs' for async

// async function findDuplicatesById(filePath) {
//   try {
//     // Step 1: Read the file content
//     const data = await fs.readFile(filePath, 'utf8');

//     // Step 2: Parse the JSON data (assuming the file contains a valid JSON array)
//     const jsonArray = JSON.parse(data);

//     // Step 3: Create a map to track occurrences of each id
//     const idMap = new Map();
//     const duplicates = [];

//     jsonArray.forEach(item => {
//       if (idMap.has(item.id)) {
//         // If the id is already in the map, add the item to the duplicates array
//         duplicates.push(item);
//       } else {
//         // Otherwise, add the id to the map
//         idMap.set(item.id, true);
//       }
//     });

//     // Step 4: Output the duplicates
//     if (duplicates.length > 0) {
//       console.log("Found duplicates:");
//       console.log(duplicates);
//     } else {
//       console.log("No duplicates found.");
//     }

//   } catch (err) {
//     console.error("Error:", err);
//   }
// }

// // Example usage
// const filePath = './productsInfo.txt'; // Replace with the path to your file
// findDuplicatesById(filePath);
// import puppeteer from "puppeteer";

// async function getProductModal(url) {
//   // Launch Puppeteer browser
//   const browser = await puppeteer.launch({ headless: true });
//   const page = await browser.newPage();

//   try {
//     // Go to the given URL
//     await page.goto(url, { waitUntil: 'domcontentloaded' });

//     // Extract product modal using page.evaluate
//     const productModal = await page.evaluate(() => {
//       return (
//         document.querySelector(".col-md-6 .product-h2")?.textContent || null
//       );
//     });

//     return productModal;
//   } catch (error) {
//     console.error("Error extracting product modal:", error);
//   } finally {
//     // Close the browser
//     await browser.close();
//   }
// }

// // Example usage
// const url = "https://www.alliantech.com/accelerometre-mems/16709-accelerometres-de-controle.html";
// getProductModal(url).then((productModal) => {
//   console.log("Product Modal:", productModal);
// });
import fs from "fs/promises";

async function getLinksFromFile(filePath) {
  try {
    // Read the file contents
    const data = await fs.readFile(filePath, "utf8");

    // Parse the JSON from the file
    const jsonArray = JSON.parse(data);

    // Extract the 'link' property from each entity in the JSON array
    const links = jsonArray.map((entity) => entity.link).filter((link) => link);

    // Return an array of strings (links)
    return links;
  } catch (error) {
    console.error("Error reading or parsing file:", error);
  }
}

// Example usage
const filePath = "./b.txt";
getLinksFromFile(filePath).then((links) => {
  console.log("Links:", links); // This will print an array of strings
});
