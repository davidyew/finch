import fastify from 'fastify';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';

// Azure Storage account details
const storageAccountName = process.env.STORAGE_ACCOUNT_NAME;
const storageAccountKey = process.env.STORAGE_ACCOUNT_KEY;
const containerName = process.env.CONTAINER_KEY;

// Azure Storage credentials
const sharedKeyCredential = new StorageSharedKeyCredential(storageAccountName, storageAccountKey);

// Azure Storage client
// connection string: DefaultEndpointsProtocol=https;AccountName=plsextfilesblob;AccountKey=e5lzrGIKIZyV2EGxmA6NSlnBxJbaO5iVHaFBtiHfMkTehdXCBBjnZhnN353ul3t7KlO/JmSw/DYH+AStTCVCFQ==;EndpointSuffix=core.windows.net
const blobServiceClient = new BlobServiceClient(`https://${storageAccountName}.blob.core.windows.net`, sharedKeyCredential);
const containerClient = blobServiceClient.getContainerClient(containerName);

// Fastify app
const app = fastify();

// API endpoint to read a PDF from Azure Storage Blob and return it
app.get('/get-pdf', async (request, reply) => {
  try {
    // we get the blobName pdf file
    const blobName = 'label.pdf';

    // Get the PDF blob from Azure Storage
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const downloadBlockBlobResponse = await blockBlobClient.download();

    // Set the response headers
    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `inline; filename=${blobName}`);

    // Pipe the PDF content to the response
    reply.send(downloadBlockBlobResponse.readableStreamBody);
  } catch (error) {
    console.error('Error:', error.message);
    reply.code(500).send({ error: 'Internal Server Error' });
  }
});

// Start the Fastify server
const port = 3000;
app.listen(port, '0.0.0.0', (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server is running on http://localhost:${port}`);
});
