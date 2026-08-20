import { DynamoDBClient, CreateTableCommand, ListTablesCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'us-east-1',
  credentials: { accessKeyId: 'dummy', secretAccessKey: 'dummy' },
});

const TABLE_NAME = 'UnderdocksInventoryV2';

async function setup() {
  try {
    const { TableNames } = await client.send(new ListTablesCommand({}));
    
    if (TableNames?.includes(TABLE_NAME)) {
      console.log(`Table ${TABLE_NAME} already exists!`);
      return;
    }

    console.log(`Creating table ${TABLE_NAME}...`);
    await client.send(new CreateTableCommand({
      TableName: TABLE_NAME,
      AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
      KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
      BillingMode: 'PAY_PER_REQUEST'
    }));
    
    console.log(`Table ${TABLE_NAME} created successfully!`);
  } catch (error) {
    console.error('Error setting up DynamoDB Local:', error);
    process.exit(1);
  }
}

setup();
