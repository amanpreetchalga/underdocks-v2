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

    const { image, type } = JSON.parse(event.body);
    if (!image) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing image in request' }),
      };
    }

    const base64Data = image.replace(/^data:[a-zA-Z0-9\/+-]+;base64,/, '');
    const imageBytes = Buffer.from(base64Data, 'base64');

    const endpoint = process.env.AZURE_ENDPOINT;
    const apiKey = process.env.AZURE_API_KEY;

    if (!endpoint || !apiKey) {
        return { statusCode: 500, body: JSON.stringify({ message: 'Azure credentials missing' }) };
    }

    const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(apiKey));

    const documentType = type === 'pos' ? 'prebuilt-layout' : 'prebuilt-receipt';
    const poller = await client.beginAnalyzeDocument(documentType, imageBytes);
    const result = await poller.pollUntilDone();

    if (type === 'pos') {
        const items: any[] = [];
        let dateStr = 'Unknown Date';
        
        // Try to find the date in the general text
        if (result.content) {
            const dateMatch = result.content.match(/Datum\s*[\d\.]+\s*-\s*([\d\.]+)/i);
            if (dateMatch) {
                dateStr = dateMatch[1];
            } else {
                 const singleDateMatch = result.content.match(/Datum\s*([\d\.]+)/i);
                 if (singleDateMatch) dateStr = singleDateMatch[1];
            }
        }

        if (result.tables) {
            for (const table of result.tables) {
                let nameCol = -1;
                let qtyCol = -1;
                let headerRow = -1;

                // Find header row and columns
                for (const cell of table.cells) {
                    const content = (cell.content || '').toLowerCase();
                    if (content.includes('artikel') && !content.includes('gruppe')) {
                        nameCol = cell.columnIndex;
                        headerRow = cell.rowIndex;
                    }
                    if (content.includes('anzahl')) {
                        qtyCol = cell.columnIndex;
                        headerRow = cell.rowIndex;
                    }
                }

                // If we found the columns in this table
                if (nameCol !== -1 && qtyCol !== -1) {
                    // Group cells by row
                    const rows: Record<number, Record<number, string>> = {};
                    for (const cell of table.cells) {
                        if (!rows[cell.rowIndex]) rows[cell.rowIndex] = {};
                        rows[cell.rowIndex][cell.columnIndex] = cell.content;
                    }

                    // Extract data
                    for (let r = headerRow + 1; r < table.rowCount; r++) {
                        const row = rows[r];
                        if (row && row[nameCol] && row[qtyCol]) {
                            const name = row[nameCol].trim();
                            const quantityStr = row[qtyCol].trim();
                            
                            // Try to parse quantity
                            const quantity = parseFloat(quantityStr.replace(/[^\d.,-]/g, '').replace(',', '.')) || 0;
                            
                            if (name && quantity !== 0) {
                                items.push({
                                    originalName: name, // POS expects originalName
                                    quantity: quantity,
                                    date: dateStr
                                });
                            }
                        }
                    }
                }
            }
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items, dateStr }),
        };
    } else {
        // INVOICE LOGIC (prebuilt-receipt)
        if (!result.documents || result.documents.length === 0) {
            return { statusCode: 200, body: JSON.stringify([]) };
        }

        const receipt = result.documents[0];
        const items: any[] = [];
        const receiptItems = receipt.fields?.Items?.values || [];

        for (const item of receiptItems) {
            const itemFields = item.properties || {};
            let name = itemFields.Description?.content || 'Unknown Item';
            const quantityStr = itemFields.Quantity?.content || '1';
            const quantity = parseFloat(quantityStr.replace(/[^\d.]/g, '')) || 1;
            
            let qtyPerBox = 1;
            const weightMatch = name.match(/^([\d.,]+)\s*kg\s*/i);
            if (weightMatch) {
                const weightStr = weightMatch[1].replace(',', '.');
                qtyPerBox = parseFloat(weightStr) || 1;
                name = name.replace(/^([\d.,]+)\s*kg\s*/i, '').trim();
            }

            items.push({
                name,
                quantity,
                qtyPerBox,
                unit: 'kg'
            });
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(items),
        };
    }

  } catch (error: any) {
    console.error('Error parsing document with Azure:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message || 'Internal Server Error' }),
    };
  }
};
