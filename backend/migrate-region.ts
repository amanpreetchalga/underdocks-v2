import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const sourceClient = new DynamoDBClient({ 
  endpoint: 'http://127.0.0.1:8000',
  region: 'local',
  credentials: { accessKeyId: 'dummy', secretAccessKey: 'dummy' }
});
const targetClient = new DynamoDBClient({ region: 'eu-central-1' });

const sourceDdb = DynamoDBDocumentClient.from(sourceClient);
const targetDdb = DynamoDBDocumentClient.from(targetClient);

async function migrateRegions() {
  console.log("Scanning source table in us-east-1...");
  let lastEvaluatedKey = undefined;
  let totalMigrated = 0;

  do {
    const scanResult: any = await sourceDdb.send(new ScanCommand({
      TableName: 'UnderdocksInventoryV2',
      ExclusiveStartKey: lastEvaluatedKey
    }));

    const items = scanResult.Items || [];
    console.log(`Found ${items.length} items in this batch.`);

    for (const item of items) {
      console.log(`Migrating item: ${item.name} (${item.id})`);
      await targetDdb.send(new PutCommand({
        TableName: 'UnderdocksInventoryV2',
        Item: item
      }));
      totalMigrated++;
    }

    lastEvaluatedKey = scanResult.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(`Migration complete! Successfully migrated ${totalMigrated} items to eu-central-1.`);
}

migrateRegions().catch(console.error);
