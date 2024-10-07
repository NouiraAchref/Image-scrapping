import fs from 'fs/promises';
import path from 'path';

// Function to read the products info from a text file
async function readProductsInfo(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        throw error;
    }
}

// Function to get the list of folder names in the augmented_images directory
async function getAugmentedImagesFolders(folderPath) {
    try {
        const files = await fs.readdir(folderPath, { withFileTypes: true });
        return files
            .filter(file => file.isDirectory())
            .map(file => file.name);
    } catch (error) {
        throw error;
    }
}

// Function to check for duplicate product IDs
function findDuplicateIds(products) {
    const ids = products.map(product => product.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    return [...new Set(duplicates)];
}

// Main function to check for missing product folders and duplicates
async function checkProducts(productsInfoPath, augmentedImagesPath) {
    try {
        const products = await readProductsInfo(productsInfoPath);
        const folders = await getAugmentedImagesFolders(augmentedImagesPath);

        const productIds = products.map(product => product.id);
        
        // Check for missing folders
        const missingProducts = productIds.filter(id => !folders.includes(id));

        if (missingProducts.length > 0) {
            console.log('Missing product folders for IDs:');
            missingProducts.forEach(id => console.log(id));
        } else {
            console.log('All product folders are present.');
        }

        // Check for duplicates
        const duplicateIds = findDuplicateIds(products);
        if (duplicateIds.length > 0) {
            console.log('Duplicate product IDs found:');
            duplicateIds.forEach(id => console.log(id));
        } else {
            console.log('No duplicate product IDs found.');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Update the paths according to your folder structure
const productsInfoPath = path.join(process.cwd(), 'productsInfo.txt');
const augmentedImagesPath = path.join(process.cwd(), 'augmented_images');

checkProducts(productsInfoPath, augmentedImagesPath);
