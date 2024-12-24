import os
import json
import requests

# Function to sanitize directory names
def sanitize(name):
    return "".join(c if c.isalnum() else "_" for c in name)

# Function to sanitize URLs
def sanitize_url(url):
    if not url:
        return None

    # Replace spaces with %20
    url = url.replace(" ", "%")

    # Remove duplicate base URL if present
    base_url = "https://www.alliantech.com/"
    if url.startswith(base_url + base_url):
        url = url[len(base_url):]  # Remove the extra base URL
    return url

# Function to download a PDF
def download_pdf(url, destination):
    try:
        response = requests.get(url)
        response.raise_for_status()
        with open(destination, 'wb') as f:
            f.write(response.content)
        print(f"Downloaded: {destination}")
    except requests.RequestException as e:
        print(f"Failed to download {url}: {e}")

# Read the productsInfo.txt file
with open('productsInfo.txt', 'r', encoding='utf-8') as file:
    data = file.read()

# Parse the JSON data
try:
    products = json.loads(data)
    print('JSON parsed successfully')
except json.JSONDecodeError as e:
    print(f"Error parsing JSON: {e}")
    exit(1)

# Process each product
for product in products:
    product_name = product.get('name')
    user_manual_url = product.get('userManual')
    datasheet_url = product.get('datasheet')

    # Create a directory for the product
    sanitized_product_name = sanitize(product_name)
    product_dir = os.path.join('download', sanitized_product_name)
    os.makedirs(product_dir, exist_ok=True)
    print(f"Directory created: {product_dir}")

    # Sanitize and download the user manual
    if user_manual_url:
        sanitized_user_manual_url = sanitize_url(user_manual_url)
        if sanitized_user_manual_url:
            download_pdf(sanitized_user_manual_url, os.path.join(product_dir, 'userManual.pdf'))

    # Sanitize and download the datasheet
    if datasheet_url:
        sanitized_datasheet_url = sanitize_url(datasheet_url)
        if sanitized_datasheet_url:
            download_pdf(sanitized_datasheet_url, os.path.join(product_dir, 'datasheet.pdf'))
