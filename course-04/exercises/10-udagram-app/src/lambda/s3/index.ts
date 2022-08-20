import { handlerPath } from '@libs/handler-resolver';

export const sendUploadNotifications = {
  handler: `${handlerPath(__dirname)}/sendNotifications.main`,
  environment: {
    STAGE: '${self:provider.stage}',
    REGION: '${self:provider.region}',
    API_ID: {
      Ref: 'WebsocketsApi',
    },
  },
  events: [
    {
      sns: {
        arn: 'arn:aws:sns:${aws:region}:${aws:accountId}:${self:custom.topicName}',
        topicName: '${self:custom.topicName}',
      },
    },
  ],
};

export const ResizeImage = {
  handler: `${handlerPath(__dirname)}/resizeImage.main`,
  events: [
    {
      sns: {
        arn: 'arn:aws:sns:${aws:region}:${aws:accountId}:${self:custom.topicName}',
        topicName: '${self:custom.topicName}',
      },
    },
  ],
};
