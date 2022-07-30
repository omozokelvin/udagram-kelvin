import { formatJSONResponse, ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import * as uuid from 'uuid';
import schema from './schema/create-image-schema';

const docClient = new AWS.DynamoDB.DocumentClient();

const s3 = new AWS.S3({
  signatureVersion: 'v4'
})

const groupsTable = process.env.GROUPS_TABLE;
const imagesTable = process.env.IMAGES_TABLE;
const bucketName = process.env.IMAGES_S3_BUCKET;
const urlExpiration = process.env.SIGNED_URL_EXPIRATION;

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

  const parsedBody = event.body;

  const newItem = {
    groupId,
    timestamp,
    imageId,
    ...parsedBody,
    imageUrl: `https://${bucketName}.s3.amazonaws.com/${imageId}`
  }

  console.log('storing new item: ', newItem);

  await docClient.put({
    TableName: imagesTable,
    Item: newItem
  }).promise();

  return newItem;
}


const getUploadUrl = (imageId:string) => {
  return s3.getSignedUrl('putObject', {
    Bucket: bucketName,
    Key: imageId,
    Expires: parseInt(urlExpiration)
  })
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

  const uploadUrl = getUploadUrl(imageId)

  return formatJSONResponse({
    newItem,
    uploadUrl
  });
};

export const main = middyfy(createImage);
