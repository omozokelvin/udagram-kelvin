import { formatJSONResponse, ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import * as AWS from 'aws-sdk';
import * as uuid from 'uuid';
import schema from './schema/create-group-schema';

const docClient = new AWS.DynamoDB.DocumentClient();

const groupsTable = process.env.GROUPS_TABLE;

const createGroup: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  console.log('Processing event ', event);

  const itemId = uuid.v4();

  const parsedBody = event.body;

  const newItem = {
    id: itemId,
    ...parsedBody,
  };

  await docClient
    .put({
      TableName: groupsTable,
      Item: newItem,
    })
    .promise();

  return formatJSONResponse(
    {
      newItem,
    },
    201
  );
};

export const main = middyfy(createGroup);
