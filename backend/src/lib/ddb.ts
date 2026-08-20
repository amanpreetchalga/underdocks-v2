import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const isLocal = process.env.AWS_SAM_LOCAL === 'true';

const client = new DynamoDBClient({
  ...(isLocal && {
    endpoint: 'http://dynamodb-local:8000',
    region: 'us-east-1',
    credentials: { accessKeyId: 'dummy', secretAccessKey: 'dummy' },
  }),
});

export const ddbDocClient = DynamoDBDocumentClient.from(client);

export const TABLE_NAME = process.env.TABLE_NAME || 'UnderdocksInventoryV2';
