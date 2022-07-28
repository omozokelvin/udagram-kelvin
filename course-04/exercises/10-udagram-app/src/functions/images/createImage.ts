import { formatJSONResponse, ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import * as uuid from 'uuid';
import schema from './schema/create-image-schema';

const docClient = new AWS.DynamoDB.DocumentClient();

const groupsTable = process.env.GROUPS_TABLE;
const imagesTable = process.env.IMAGES_TABLE;
const imageIdIndex = process.env.IMAGE_ID_INDEX;

const groupExists = async (groupId: string) => {
  const result = await docClient.get({
    TableName: groupsTable,
    Key: {
      id: groupId
    }
  }).promise();

  return !!result.Item;
}

const saveImage = async (groupId, imageId, event: Omit<APIGatewayProxyEvent, "body"> & { body: { title: string }; }) => {
  const timestamp = new Date().toISOString();

  const newImage = event.body;

  const newItem = {
    groupId,
    timestamp,
    imageId,
    ...newImage
  }

  console.log('storing new item: ', newItem);

  await docClient.put({
    TableName: imagesTable,
    Item: newImage
  }).promise();

  return newImage;
}

const createImage: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event): Promise<APIGatewayProxyResult> => {

  console.log('Processing event ', event);
  const groupId = event.pathParameters.groupId;

  const validGroupId = await groupExists(groupId)

  if (!validGroupId) {
    return formatJSONResponse({
      error: 'Group does not exist'
    }, 404)
  }

  const imageId = uuid.v4();

  const newItem = await saveImage(groupId, imageId, event);

  return formatJSONResponse({
    newItem
  });
};

export const main = middyfy(createImage);
