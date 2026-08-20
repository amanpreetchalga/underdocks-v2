import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DocumentAnalysisClient, AzureKeyCredential } from "@azure/ai-form-recognizer";

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing request body' }),
      };
    }

    const { image } = JSON.parse(event.body);
    if (!image) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing image in request' }),
      };
    }

    // Strip out the data URI prefix (supports both image/xxx and application/pdf)
    const base64Data = image.replace(/^data:[a-zA-Z0-9\/+-]+;base64,/, '');
    const imageBytes = Buffer.from(base64Data, 'base64');

    const endpoint = process.env.AZURE_ENDPOINT;
    const apiKey = process.env.AZURE_API_KEY;

    console.log("ENVIRONMENT VARIABLES CHECK:", {
      endpoint: endpoint ? 'SET' : 'MISSING',
      apiKey: apiKey ? 'SET' : 'MISSING'
    });

    // We removed the custom error check here to see what Azure SDK throws natively.

    const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(apiKey));

    // Use the prebuilt-receipt model
    const poller = await client.beginAnalyzeDocument("prebuilt-receipt", imageBytes);
    const { documents } = await poller.pollUntilDone();

    if (!documents || documents.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify([]),
      };
    }

    const receipt = documents[0];
    const items: any[] = [];

    // Azure exposes line items under receipt.fields.Items.values
    const receiptItems = receipt.fields?.Items?.values || [];

    for (const item of receiptItems) {
      const itemFields = item.properties || {};
      
      const name = itemFields.Description?.content || 'Unknown Item';
      const quantityStr = itemFields.Quantity?.content || '1';
      const quantity = parseFloat(quantityStr.replace(/[^\d.]/g, '')) || 1;

      items.push({
        name,
        quantity,
        qtyPerBox: 1,
        unit: 'pc'
      });
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(items),
    };

  } catch (error: any) {
    console.error('Error parsing receipt with Azure:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message || 'Internal Server Error' }),
    };
  }
};
