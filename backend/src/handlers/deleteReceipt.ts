import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { ddbDocClient } from "../lib/ddb";

const TABLE_NAME = process.env.TABLE_NAME || "UnderdocksReceiptsV2";

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,PATCH,DELETE',
};

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const receiptId = event.pathParameters?.id;
    if (!receiptId) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ message: 'Missing receipt ID' }) };
    }

    await ddbDocClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { id: receiptId },
      })
    );

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Receipt deleted successfully' }),
    };
  } catch (error: any) {
    console.error('Error deleting receipt:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: error.message || 'Internal Server Error' }),
    };
  }
};
