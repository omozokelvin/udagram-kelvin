import { handlerPath } from '@libs/handler-resolver';

export const sendUploadNotifications = {
  handler: `${handlerPath(__dirname)}/sendNotifications.main`,
  environment: {
    STAGE: '${self:provider.stage}',
    REGION: '${self:provider.region}',
  },
};
