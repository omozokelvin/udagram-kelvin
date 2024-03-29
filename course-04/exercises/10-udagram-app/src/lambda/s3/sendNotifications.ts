import { middyfy } from '@libs/lambda';
import { S3Event, SNSEvent, SNSHandler } from 'aws-lambda';
import 'source-map-support/register';
import * as AWS from 'aws-sdk';

const docClient = new AWS.DynamoDB.DocumentClient();

const connectionsTable = process.env.CONNECTIONS_TABLE;
const stage = process.env.STAGE;
const apiId = process.env.API_ID;
const region = process.env.REGION;

const connectionParams = {
  apiVersion: '2018-11-29',
  endpoint: `https://${apiId}.execute-api.${region}.amazonaws.com/${stage}`,
};

console.log('connection params', connectionParams);

const apiGateway = new AWS.ApiGatewayManagementApi(connectionParams);

const sendMessageToClient = async (connectionId: string, payload: any) => {
  try {
    console.log('Sending message to client: ', payload);

    await apiGateway
      .postToConnection({
        ConnectionId: connectionId,
        Data: JSON.stringify(payload),
      })
      .promise();
  } catch (error) {
    console.log('Failed to send message', JSON.stringify(error));

    if (error.statusCode === 410) {
      console.log('Stale connection changed');

      await docClient
        .delete({
          TableName: connectionsTable,
          Key: {
            id: connectionId,
          },
        })
        .promise();
    }
  }
};
async function processS3events(event: S3Event) {
  for (const record of event.Records) {
    const key = record.s3.object.key;
    console.log(`Processing S3 event for key: ${key}`);

    const connections = await docClient
      .scan({
        TableName: connectionsTable,
      })
      .promise();

    const payload = {
      imageId: key,
    };

    for (const connection of connections.Items) {
      const connectionId = connection.id;
      await sendMessageToClient(connectionId, JSON.stringify(payload));
    }
  }
}

const handler: SNSHandler = async (event: SNSEvent) => {
  console.log('Processing SNS event: ', JSON.stringify(event));

  for (const snsRecord of event.Records) {
    const s3EventStr = snsRecord.Sns.Message;

    const s3Event = JSON.parse(s3EventStr);

    console.log('Processing S3 event: ', JSON.stringify(s3Event));

    await processS3events(s3Event);
  }
};

export const main = middyfy(handler);
