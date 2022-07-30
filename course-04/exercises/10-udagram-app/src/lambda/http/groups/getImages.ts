import { formatJSONResponse } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import * as AWS from 'aws-sdk';

const docClient = new AWS.DynamoDB.DocumentClient();

const groupsTable = process.env.GROUPS_TABLE;
const imagesTable = process.env.IMAGES_TABLE;

const groupExists = async (groupId:string) => {
  const result = await docClient.get({
    TableName: groupsTable,
    Key: {
      id: groupId
    }
  }).promise();

  return !!result.Item;
}

const getImagesPerGroup = async (groupId:string) => {
  const result = await docClient.query({
    TableName: imagesTable,
    KeyConditionExpression: 'groupId = :groupId',
    ExpressionAttributeValues: {
      ':groupId': groupId
    },
    ScanIndexForward: false
  }).promise();

  return result.Items;
}

const getImages: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Processing event ', event);

  const groupId = event.pathParameters.groupId;

  const validGroupId = await groupExists(groupId)

  if(!validGroupId) {
    return formatJSONResponse({
      error: 'Group does not exist'
    }, 404)
  }

  const images = await getImagesPerGroup(groupId);

  return formatJSONResponse({
    items:images
  });
};

export const main = middyfy(getImages);
