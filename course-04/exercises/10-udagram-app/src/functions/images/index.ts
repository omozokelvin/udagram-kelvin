
import { handlerPath } from '@libs/handler-resolver';
import createImageSchema from './schema/create-image-schema';

export const getImage =  {
  handler: `${handlerPath(__dirname)}/getImage.main`,
  events: [
    {
      http: {
        method: 'get',
        path: 'images/{imageId}',
        cors: true
      },
    },
  ],
};

export const createImage =  {
  handler: `${handlerPath(__dirname)}/createImage.main`,
  events: [
    {
      http: {
        method: 'post',
        path: 'groups/{groupId}/images',
        cors: true,
        request: {
          schemas: {
            'application/json': createImageSchema,
          },
        }
      },
    },
  ],
};
