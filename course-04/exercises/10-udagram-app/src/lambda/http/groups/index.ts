import { handlerPath } from '@libs/handler-resolver';
import createGroupSchema from './schema/create-group-schema';

export const getGroups = {
  handler: `${handlerPath(__dirname)}/getGroups.main`,
  events: [
    {
      http: {
        method: 'get',
        path: 'groups',
        cors: true,
      },
    },
  ],
};

export const createGroup = {
  handler: `${handlerPath(__dirname)}/createGroup.main`,
  events: [
    {
      http: {
        method: 'post',
        path: 'groups',
        cors: true,
        authorizer: 'Auth',
        request: {
          schemas: {
            'application/json': createGroupSchema,
          },
        },
      },
    },
  ],
};

export const getImages = {
  handler: `${handlerPath(__dirname)}/getImages.main`,
  events: [
    {
      http: {
        method: 'get',
        path: 'groups/{groupId}/images',
        cors: true,
      },
    },
  ],
};
