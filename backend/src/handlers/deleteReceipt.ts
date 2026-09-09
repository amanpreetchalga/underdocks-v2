import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME || "UnderdocksReceiptsV2";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const receiptId = event.pathParameters?.id;
    if (!receiptId) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Missing receipt ID' }) };
    }

    await ddbDocClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { id: receiptId },
      })
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Receipt deleted successfully' }),
    };
  } catch (error: any) {
    console.error('Error deleting receipt:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: error.message || 'Internal Server Error' }),
    };
  }
};
