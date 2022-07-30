import { handlerPath } from '@libs/handler-resolver';

export const ConnectHandler = {
  handler: `${handlerPath(__dirname)}/connect.handler`,
  events: [
    {
      websocket: {
        route: '$connect',
      },
    },
  ],
};

export const DisconnectHandler = {
  handler: `${handlerPath(__dirname)}/disconnect.handler`,
  events: [
    {
      websocket: {
        route: '$disconnect',
      },
    },
  ],
};
