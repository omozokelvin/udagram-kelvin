import { handlerPath } from '@libs/handler-resolver';

export const SyncWithElasticsearch = {
  handler: `${handlerPath(__dirname)}/elasticSearchSync.handler`,
  events: [
    {
      stream: {
        type: 'dynamodb',
        arn: {
          'Fn::GetAtt': ['ImagesDynamoDBTable', 'StreamArn'],
        },
      },
    },
  ],
  environment: {
    ES_ENDPOINT: {
      'Fn::GetAtt': ['ImagesSearch', 'DomainEndpoint'],
    },
  },
};
