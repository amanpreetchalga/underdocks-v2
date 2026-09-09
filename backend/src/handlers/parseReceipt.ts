import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DocumentAnalysisClient, AzureKeyCredential } from "@azure/ai-form-recognizer";

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Missing request body' }) };
    }

    const { image, type } = JSON.parse(event.body);
    if (!image) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Missing image in request' }) };
    }

    const base64Data = image.replace(/^data:[a-zA-Z0-9\/+-]+;base64,/, '');
    const imageBytes = Buffer.from(base64Data, 'base64');

    const endpoint = process.env.AZURE_ENDPOINT;
    const apiKey = process.env.AZURE_API_KEY;

    if (!endpoint || !apiKey) {
        return { statusCode: 500, body: JSON.stringify({ message: 'Azure credentials missing' }) };
    }

    const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(apiKey));
    const documentType = type === 'pos' ? 'prebuilt-layout' : 'prebuilt-invoice';
    const poller = await client.beginAnalyzeDocument(documentType, imageBytes);
    const result = await poller.pollUntilDone();

    if (type === 'pos') {
        const items: any[] = [];
        let dateStr = 'Unknown Date';
        
        if (result.content) {
            const dateMatch = result.content.match(/Datum\s*[\d\.]+\s*-\s*([\d\.]+)/i);
            if (dateMatch) {
                dateStr = dateMatch[1];
            } else {
                 const singleDateMatch = result.content.match(/Datum\s*([\d\.]+)/i);
                 if (singleDateMatch) dateStr = singleDateMatch[1];
            }
        }

        let globalNameCol = -1;
        let globalQtyCol = -1;

        if (result.tables) {
            for (const table of result.tables) {
                const rows: Record<number, Record<number, string>> = {};
                for (const cell of table.cells) {
                    if (!rows[cell.rowIndex]) rows[cell.rowIndex] = {};
                    rows[cell.rowIndex][cell.columnIndex] = cell.content;
                }

                let nameCol = -1;
                let qtyCol = -1;
                let headerRow = -1;
                let hasPlu = false;

                // Find header row in this table
                for (let r = 0; r < table.rowCount; r++) {
                    const row = rows[r];
                    if (!row) continue;
                    let tempNameCol = -1;
                    let tempQtyCol = -1;

                    for (const colIdxStr of Object.keys(row)) {
                        const colIdx = parseInt(colIdxStr, 10);
                        const content = (row[colIdx] || '').toLowerCase().trim();
                        
                        if (content === 'plu') hasPlu = true;

                        // Strict check for header
                        if (content === 'artikel' || content === 'name') {
                            tempNameCol = colIdx;
                        } else if (content.includes('artikel') && !content.includes('gruppe') && !content.includes('stornierte') && !content.includes('bestellungen')) {
                            if (tempNameCol === -1) tempNameCol = colIdx; // Only set if not already set strictly
                        }

                        if (content === 'anzahl' || content.includes('anzahl')) {
                            tempQtyCol = colIdx;
                        }
                    }

                    if (tempNameCol !== -1 && tempQtyCol !== -1) {
                        headerRow = r;
                        nameCol = tempNameCol;
                        qtyCol = tempQtyCol;
                        // We ONLY want to update globals if it's the main table (has PLU) or if globals aren't set yet.
                        if (hasPlu || globalNameCol === -1) {
                            globalNameCol = nameCol;
                            globalQtyCol = qtyCol;
                        }
                        break; 
                    }
                }

                let startRow = 0;
                if (nameCol !== -1 && qtyCol !== -1) {
                    startRow = headerRow + 1;
                } else if (globalNameCol !== -1 && globalQtyCol !== -1) {
                    nameCol = globalNameCol;
                    qtyCol = globalQtyCol;
                    startRow = 0;
                } else {
                    continue; // Skip table if we can't determine columns
                }

                for (let r = startRow; r < table.rowCount; r++) {
                    const row = rows[r];
                    if (row && row[nameCol] && row[qtyCol]) {
                        const name = row[nameCol].trim();
                        let quantityStr = row[qtyCol].trim();
                        
                        // Stop if we hit a summary table that doesn't belong (like 'Total' or empty)
                        if (name.toLowerCase().includes('total') || name === '') continue;

                        // Parse quantity properly. POS reports use '.' as thousand separator in Germany.
                        quantityStr = quantityStr.replace(/\./g, '').replace(',', '.');
                        const quantity = parseFloat(quantityStr.replace(/[^\d.,-]/g, '')) || 0;
                        
                        if (quantity !== 0) {
                            items.push({
                                originalName: name,
                                quantity: quantity,
                                date: dateStr
                            });
                        }
                    }
                }
            }
        }

        return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items, dateStr }) };
    } else {
        // invoice logic...
        if (!result.documents || result.documents.length === 0) return { statusCode: 200, body: JSON.stringify([]) };
        const invoice = result.documents[0];
        const items: any[] = [];
        let parsedFromTable = false;

        // Try extracting from tables first (better for complex German layouts like Deutsche See)
        if (result.tables) {
            for (const table of result.tables) {
                const rows: Record<number, Record<number, string>> = {};
                for (const cell of table.cells) {
                    if (!rows[cell.rowIndex]) rows[cell.rowIndex] = {};
                    rows[cell.rowIndex][cell.columnIndex] = cell.content;
                }

                let nameCol = -1;
                let boxesCol = -1;
                let inhaltCol = -1;
                let headerRow = -1;

                for (let r = 0; r < table.rowCount; r++) {
                    const row = rows[r];
                    if (!row) continue;

                    for (const colIdxStr of Object.keys(row)) {
                        const colIdx = parseInt(colIdxStr, 10);
                        const content = (row[colIdx] || '').toLowerCase().trim();

                        if (content.includes('bezeichnung') || content.includes('artikel') || content.includes('description')) {
                            nameCol = colIdx;
                        }
                        if (content === 'auftrmg' || content === 'menge' || content === 'anzahl' || content === 'qty') {
                            boxesCol = colIdx;
                        }
                        if (content.includes('inhalt') || content.includes('gewicht') || content.includes('weight')) {
                            inhaltCol = colIdx;
                        }
                    }

                    if (nameCol !== -1 && (boxesCol !== -1 || inhaltCol !== -1)) {
                        headerRow = r;
                        break;
                    }
                }

                if (headerRow !== -1) {
                    parsedFromTable = true;
                    for (let r = headerRow + 1; r < table.rowCount; r++) {
                        const row = rows[r];
                        if (row && row[nameCol]) {
                            const name = row[nameCol].trim();
                            if (!name || name.toLowerCase().includes('warenwert') || name.toLowerCase().includes('summe') || name.toLowerCase().includes('zuschlag')) continue;

                            let quantity = 1;
                            let qtyPerBox = 1;

                            if (boxesCol !== -1 && row[boxesCol]) {
                                const qStr = row[boxesCol].replace(/\./g, '').replace(',', '.');
                                quantity = parseFloat(qStr.replace(/[^\d.-]/g, '')) || 1;
                            }
                            if (inhaltCol !== -1 && row[inhaltCol]) {
                                const wStr = row[inhaltCol].replace(/\./g, '').replace(',', '.');
                                qtyPerBox = parseFloat(wStr.replace(/[^\d.-]/g, '')) || 1;
                            } else {
                                // Fallback: extract weight from name if inhalt col is missing
                                const weightMatch = name.match(/^([\d.,]+)\s*kg\s*/i) || name.match(/([\d.,]+)\s*kg\s*$/i);
                                if (weightMatch) {
                                    const wStr = weightMatch[1].replace(/\./g, '').replace(',', '.');
                                    qtyPerBox = parseFloat(wStr) || 1;
                                }
                            }

                            // Clean up name if it has leading weights
                            const cleanName = name.replace(/^([\d.,]+)\s*kg\s*/i, '').trim();

                            items.push({ name: cleanName, quantity, qtyPerBox, unit: 'kg' });
                        }
                    }
                    break; // stop after finding the main table
                }
            }
        }

        // Fallback to standard invoice extraction
        if (!parsedFromTable) {
            const itemsField = invoice.fields?.Items;
            const receiptItems = (itemsField?.kind === 'array' ? itemsField.values : []) as any[];
            
            for (const item of receiptItems) {
                const itemFields = item.properties || {};
                let name = itemFields.Description?.content || 'Unknown Item';
                
                let quantityStr = itemFields.Quantity?.content || '1';
                quantityStr = quantityStr.replace(/\./g, '').replace(',', '.');
                const quantity = parseFloat(quantityStr.replace(/[^\d.-]/g, '')) || 1;
                
                let qtyPerBox = 1;
                const weightMatch = name.match(/^([\d.,]+)\s*kg\s*/i);
                if (weightMatch) {
                    const weightStr = weightMatch[1].replace(/\./g, '').replace(',', '.');
                    qtyPerBox = parseFloat(weightStr) || 1;
                    name = name.replace(/^([\d.,]+)\s*kg\s*/i, '').trim();
                }
                items.push({ name, quantity, qtyPerBox, unit: 'kg' });
            }
        }

        return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(items) };
    }
  } catch (error: any) {
    console.error('Error parsing document with Azure:', error);
    return { statusCode: 500, body: JSON.stringify({ message: error.message || 'Internal Server Error' }) };
  }
};
