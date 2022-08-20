import { middyfy } from '@libs/lambda';
import { SNSHandler, SNSEvent, S3EventRecord } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import Jimp from 'jimp/es';

const s3 = new AWS.S3();

const imagesBucketName = process.env.IMAGES_S3_BUCKET;
const thumbnailsBucketName = process.env.THUMBNAILS_S3_BUCKET;

const processImage = async (record: S3EventRecord) => {
  const key = record.s3.object.key;
  console.log(`Processing S3 item with key : ${key}`);

  const response = await s3
    .getObject({
      Bucket: imagesBucketName,
      Key: key,
    })
    .promise();

  const body = response.Body;
  const image = await Jimp.read(body as string);

  console.log('Resizing image');
  image.resize(150, Jimp.AUTO);

  const convertedBuffer = await image.getBufferAsync(Jimp.AUTO as unknown as string);

  console.log(`writing image back to s3 bucket: ${thumbnailsBucketName}`);

  await s3
    .putObject({
      Bucket: thumbnailsBucketName,
      Key: `${key}.jpeg`,
      Body: convertedBuffer,
      ContentType: 'image/png',
    })
    .promise();
};

const handler: SNSHandler = async (event: SNSEvent) => {
  console.log('Processing SNS event: ', JSON.stringify(event));

  for (const snsRecord of event.Records) {
    const s3EventStr = snsRecord.Sns.Message;
    console.log('Processing S3 event: ', JSON.stringify(s3EventStr));
    const s3Event = JSON.parse(s3EventStr);

    for (const record of s3Event.Records) {
      try {
        await processImage(record);
      } catch (error) {
        console.log('Failed to process image', JSON.stringify(error));
      }
    }
  }
};

export const main = middyfy(handler);
