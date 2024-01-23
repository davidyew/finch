// server.ts
import fastify, { FastifyInstance } from 'fastify';
import puppeteer from 'puppeteer';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';

// Azure Storage account details
const storageAccountName = process.env.STORAGE_ACCOUNT_NAME;
const storageAccountKey = process.env.STORAGE_ACCOUNT_KEY;
const containerName = process.env.CONTAINER_KEY;

let browser: puppeteer.Browser | null = null; // Variable to store the Puppeteer browser instance

// Azure Storage credentials
const sharedKeyCredential = new StorageSharedKeyCredential(storageAccountName, storageAccountKey);

// Azure Storage client
const blobServiceClient = new BlobServiceClient(`https://${storageAccountName}.blob.core.windows.net`, sharedKeyCredential);
const containerClient = blobServiceClient.getContainerClient(containerName);

// Start the Puppeteer browser when the server starts
const startBrowser = async () => {
  console.log('start browser')
  browser = await puppeteer.launch({headless: 'new'});
  console.log('start browser: completed')
};

// Close the Puppeteer browser when the server stops
const stopBrowser = async () => {
  if (browser) {
    console.log('stop browser')
    await browser.close();
    console.log('Puppeteer browser closed.');
    console.log('stop browser: completed')
  }
};

const app: FastifyInstance = fastify({
  logger: true
})

// Fastify route to generate a PDF, upload it to Azure Storage, and return the blob URL
app.get('/generate-pdf', async (request, reply) => {
  if (!browser) {
    startBrowser()
    if (!browser) {
      return reply.code(500).send({ error: 'Puppeteer browser not initialized' });
    }
  }

  const { htmlContent } = request.query;

  if (!htmlContent) {
    return reply.code(400).send({ error: 'Missing HTML content in the query parameters' });
  }

  const page = await browser.newPage();
  await page.setContent(htmlContent as string, { waitUntil: 'domcontentloaded' });

  const pdfBuffer = await page.pdf({ format: 'A4' });

  // Generate a unique blob name (e.g., using a timestamp)
  const blobName = `generated-${Date.now()}.pdf`;

  // Upload the PDF to Azure Storage
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.upload(pdfBuffer, pdfBuffer.length);

  await page.close();

  // Return the blob URL
  const blobUrl = blockBlobClient.url;
  reply.send({ blobUrl });
});

// Register the startBrowser and stopBrowser hooks
app.addHook('onReady', startBrowser);
app.addHook('onClose', stopBrowser);

const start = async () => {
  try {
    await app.listen({port:3000});
    console.log('Server listening on port 3000');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();

// How to use
// http://localhost:3000/generate-pdf?htmlContent=<html><body><h1>Hello, PDF!</h1></body></html>
