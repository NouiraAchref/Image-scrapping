import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Workaround for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to save canvas image to a file
async function saveCanvasToFile(page, selector, imageName, savePath) {
  const dataUrl = await page.$eval(selector, (canvas) => canvas.toDataURL());
  const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
  fs.writeFileSync(
    path.join(savePath, `${imageName}.png`),
    base64Data,
    "base64"
  );
}

(async () => {
  // Launch browser
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Navigate to your page
  await page.goto("file:///C:/Users/ASUS/Desktop/Image-scrapping/index.html", {
    waitUntil: "load",
  });

  // Simulate image upload
  const inputUploadHandle = await page.$("#uploadImage");
  const imagePath = path.resolve(__dirname, "owners.webp");
  await inputUploadHandle.uploadFile(imagePath);

  //   // Wait for the augmentation process to complete (simulating a 3-second wait)
  //   await new Promise(resolve => setTimeout(resolve, 3000));

  // Define the directory to save images
  const saveDirectory = path.join(__dirname, "augmented_images");
  if (!fs.existsSync(saveDirectory)) {
    fs.mkdirSync(saveDirectory);
  }

  // Get all canvas elements (augmented images)
  const canvasElements = await page.$$("#output canvas");

  for (let i = 0; i < canvasElements.length; i++) {
    const label = await page.evaluate(
      (el) => el.textContent,
      (
        await page.$$("#output p")
      )[i]
    );
    await saveCanvasToFile(
      page,
      `#output canvas:nth-of-type(${i + 1})`,
      label.trim(),
      saveDirectory
    );
  }

  console.log("Images saved to:", saveDirectory);

  await browser.close();
})();
// "file:///C:/Users/ASUS/Desktop/Image-scrapping/index.html"
// "owners.webp"
