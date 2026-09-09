import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { ddbDocClient } from "../lib/ddb";

const TABLE_NAME = process.env.TABLE_NAME || "UnderdocksSalesV2";

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,PATCH,DELETE',
};

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const saleId = event.pathParameters?.id;
    if (!saleId) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ message: 'Missing sale ID' }) };
    }

    await ddbDocClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { id: saleId },
      })
    );

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Sale deleted successfully' }),
    };
  } catch (error: any) {
    console.error('Error deleting sale:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: error.message || 'Internal Server Error' }),
    };
  }
};
