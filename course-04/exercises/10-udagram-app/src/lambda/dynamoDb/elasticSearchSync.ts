import { DynamoDBStreamEvent, DynamoDBStreamHandler } from 'aws-lambda';
import { Client, Connection } from '@opensearch-project/opensearch';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { sign } from 'aws4';
// import { Client } from '@elastic/elasticsearch';
// import { awsGetCredentials, createAWSConnection } from '@libs/signAws';
import 'source-map-support/register';

const HOST = 'https://' + process?.env?.ES_ENDPOINT;

const createAwsConnector = (credentials) => {
  class AmazonConnection extends Connection {
    buildRequestObject(params) {
      const request = super.buildRequestObject(params);

      request.headers = request.headers || {};
      request.headers['host'] = request.hostname;

      return sign(request, credentials);
    }
  }
  return {
    Connection: AmazonConnection,
  };
};

const getClient = async () => {
  const credentials = await defaultProvider()();
  return new Client({
    ...createAwsConnector(credentials),
    node: HOST,
  });
};

export const handler: DynamoDBStreamHandler = async (event: DynamoDBStreamEvent) => {
  console.log('Processing events batch from DynamoDB', JSON.stringify(event));

  for (const record of event.Records) {
    console.log('Processing a record', JSON.stringify(record));

    if (record.eventName !== 'INSERT') {
      continue;
    }

    const newItem = record.dynamodb.NewImage;

    const imageId = newItem.imageId.S;

    const document = {
      imageId,
      groupId: newItem.groupId.S,
      imageUrl: newItem.imageUrl.S,
      title: newItem.title.S,
      timestamp: newItem.timestamp.S,
    };

    console.log('document -> ', JSON.stringify(document));

    try {
      const client = await getClient();

      // Create an index.
      // let index_name = 'images';
      // let response
      // = await client.indices.create({
      // //   index: index_name,
      // // });
      // console.log('Creating index:');
      // console.log(response);
      const response = await client.index({
        index: 'images',
        id: imageId,
        body: document,
      });

      console.log('response -> ', JSON.stringify(response));
    } catch (error) {
      console.log('error -> ', JSON.stringify(error));
    }
  }
};
