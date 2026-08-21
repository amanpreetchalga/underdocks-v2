import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
  endpoint: 'http://127.0.0.1:8000',
  region: 'local',
  credentials: { accessKeyId: 'dummy', secretAccessKey: 'dummy' }
});

const ddb = DynamoDBDocumentClient.from(client);

async function migrate() {
  const scan = await ddb.send(new ScanCommand({ TableName: 'UnderdocksInventoryV2' }));
  
  for (const item of scan.Items || []) {
    if (item.unit === 'kg' && item.altUnit?.toLowerCase().includes('piece')) {
      console.log(`Migrating ${item.name}...`);
      
      const newCurrentStock = item.currentStock / item.altUnitFactor;
      
      await ddb.send(new UpdateCommand({
        TableName: 'UnderdocksInventoryV2',
        Key: { id: item.id },
        UpdateExpression: 'SET #unit = :unit, #altUnit = :altUnit, #currentStock = :currentStock',
        ExpressionAttributeNames: {
          '#unit': 'unit',
          '#altUnit': 'altUnit',
          '#currentStock': 'currentStock'
        },
        ExpressionAttributeValues: {
          ':unit': 'piece',
          ':altUnit': 'kg',
          ':currentStock': newCurrentStock
        }
      }));
      console.log(`Migrated ${item.name}: Stock changed from ${item.currentStock} kg to ${newCurrentStock} pieces`);
    }
  }
}

migrate().catch(console.error);
