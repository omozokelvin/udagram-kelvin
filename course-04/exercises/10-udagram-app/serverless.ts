import type { AWS } from '@serverless/typescript';

import { getGroups, createGroup, getImages } from 'src/lambda/http/groups';
import { getImage, createImage } from 'src/lambda/http/images';
import { ResizeImage, sendUploadNotifications } from 'src/lambda/s3';
import { ConnectHandler, DisconnectHandler } from 'src/lambda/websocket';
import { SyncWithElasticsearch } from 'src/lambda/dynamoDb';
import { Auth } from 'src/lambda/auth';

const serverlessConfiguration: AWS = {
  service: 'serverless-udagram-app',
  frameworkVersion: '3',
  plugins: ['serverless-esbuild'],
  provider: {
    name: 'aws',
    runtime: 'nodejs14.x',
    stage: "${opt:stage, 'dev'}",
    region: 'us-east-1',
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      NODE_OPTIONS: '--enable-source-maps --stack-trace-limit=1000',
      GROUPS_TABLE: 'Groups-${self:provider.stage}',
      IMAGES_TABLE: 'Images-${self:provider.stage}',
      IMAGE_ID_INDEX: 'ImageIdIndex',
      IMAGES_S3_BUCKET: 'serverless-34444499343267-bucket-${self:provider.stage}',
      SIGNED_URL_EXPIRATION: '300',
      CONNECTIONS_TABLE: 'Connections-${self:provider.stage}',
      REGION: '${self:provider.stage}',
      THUMBNAILS_S3_BUCKET: 'serverless-34444499343267-thumbnails-${self:provider.stage}',
      AUTH_0_SECRET_ID: 'Auth0Secret-${self:provider.stage}',
      AUTH_0_SECRET_FIELD: 'auth0Secret',
    },
    iamRoleStatements: [
      {
        Effect: 'Allow',
        Action: ['dynamodb:Scan', 'dynamodb:PutItem', 'dynamodb:GetItem'],
        Resource: 'arn:aws:dynamodb:${self:provider.region}:*:table/${self:provider.environment.GROUPS_TABLE}',
      },
      {
        Effect: 'Allow',
        Action: ['dynamodb:Query', 'dynamodb:PutItem'],
        Resource: 'arn:aws:dynamodb:${self:provider.region}:*:table/${self:provider.environment.IMAGES_TABLE}',
      },
      {
        Effect: 'Allow',
        Action: ['dynamodb:Query'],
        Resource:
          'arn:aws:dynamodb:${self:provider.region}:*:table/${self:provider.environment.IMAGES_TABLE}/index/${self:provider.environment.IMAGE_ID_INDEX}',
      },
      {
        Effect: 'Allow',
        Action: ['s3:GetObject', 's3:PutObject'],
        Resource: 'arn:aws:s3:::${self:provider.environment.IMAGES_S3_BUCKET}/*',
      },
      {
        Effect: 'Allow',
        Action: ['s3:PutObject'],
        Resource: 'arn:aws:s3:::${self:provider.environment.THUMBNAILS_S3_BUCKET}/*',
      },
      {
        Effect: 'Allow',
        Action: ['dynamodb:Scan', 'dynamodb:PutItem', 'dynamodb:DeleteItem'],
        Resource: 'arn:aws:dynamodb:${self:provider.region}:*:table/${self:provider.environment.CONNECTIONS_TABLE}',
      },
      {
        Effect: 'Allow',
        Action: ['execute-api:Invoke'],
        Resource: 'arn:aws:execute-api:*:*:**/@connections/*',
      },
      {
        Effect: 'Allow',
        Action: ['es:ESHttpPut', 'es:ESHttpGet'],
        Resource: {
          'Fn::Join': [
            '/',
            [
              {
                'Fn::GetAtt': ['ImagesSearch', 'DomainArn'],
              },
              '*',
            ],
          ],
        },
      },
      {
        Effect: 'Allow',
        Action: ['secretsmanager:GetSecretValue'],
        Resource: {
          Ref: 'Auth0Secret',
        },
      },
      {
        Effect: 'Allow',
        Action: ['kms:Decrypt'],
        Resource: {
          'Fn::GetAtt': ['KMSKey', 'Arn'],
        },
      },
    ],
  },
  // import the function via paths
  functions: {
    getGroups,
    createGroup,
    getImages,
    getImage,
    createImage,
    sendUploadNotifications,
    ConnectHandler,
    DisconnectHandler,
    SyncWithElasticsearch,
    ResizeImage,
    Auth,
  },
  package: { individually: true },
  custom: {
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ['aws-sdk'],
      target: 'node14',
      define: { 'require.resolve': undefined },
      platform: 'node',
      concurrency: 10,
    },
    topicName: 'imagesTopic-${self:provider.stage}',
    documentation: {
      api: {
        info: {
          version: '1.0.0',
          title: 'Udagram API',
          description: 'Serverless application for images sharing',
        },
      },
    },
  },
  resources: {
    Resources: {
      GatewayResponseDefault4XX: {
        Type: 'AWS::ApiGateway::GatewayResponse',
        Properties: {
          ResponseParameters: {
            'gatewayresponse.header.Access-Control-Allow-Origin': "'*'",
            'gatewayresponse.header.Access-Control-Allow-Headers':
              "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
            'gatewayresponse.header.Access-Control-Allow-Methods': "'OPTIONS,GET,POST'",
          },
          ResponseType: 'DEFAULT_4XX',
          RestApiId: {
            Ref: 'ApiGatewayRestApi',
          },
        },
      },
      GroupsDynamoDBTable: {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
          AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
          KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
          BillingMode: 'PAY_PER_REQUEST',
          TableName: '${self:provider.environment.GROUPS_TABLE}',
        },
      },
      ImagesDynamoDBTable: {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
          AttributeDefinitions: [
            { AttributeName: 'groupId', AttributeType: 'S' },
            { AttributeName: 'timestamp', AttributeType: 'S' },
            { AttributeName: 'imageId', AttributeType: 'S' },
          ],
          KeySchema: [
            { AttributeName: 'groupId', KeyType: 'HASH' },
            { AttributeName: 'timestamp', KeyType: 'RANGE' },
          ],
          GlobalSecondaryIndexes: [
            {
              IndexName: '${self:provider.environment.IMAGE_ID_INDEX}',
              KeySchema: [{ AttributeName: 'imageId', KeyType: 'HASH' }],
              Projection: {
                ProjectionType: 'ALL',
              },
            },
          ],
          BillingMode: 'PAY_PER_REQUEST',
          StreamSpecification: {
            StreamViewType: 'NEW_IMAGE',
          },
          TableName: '${self:provider.environment.IMAGES_TABLE}',
        },
      },
      ConnectionsDynamoDBTable: {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
          AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
          KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
          BillingMode: 'PAY_PER_REQUEST',
          TableName: '${self:provider.environment.CONNECTIONS_TABLE}',
        },
      },

      ImagesTopic: {
        Type: 'AWS::SNS::Topic',
        Properties: {
          DisplayName: 'Image bucket topic',
          TopicName: '${self:custom.topicName}',
        },
      },
      SNSTopicPolicy: {
        Type: 'AWS::SNS::TopicPolicy',
        DependsOn: ['ImagesTopic'],
        Properties: {
          PolicyDocument: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: {
                  AWS: '*',
                },
                Action: 'sns:Publish',
                Resource: {
                  Ref: 'ImagesTopic',
                },
                Condition: {
                  ArnLike: {
                    'AWS:SourceArn': 'arn:aws:s3:::${self:provider.environment.IMAGES_S3_BUCKET}',
                  },
                },
              },
            ],
          },
          Topics: [
            {
              Ref: 'ImagesTopic',
            },
          ],
        },
      },
      AttachmentsBucket: {
        Type: 'AWS::S3::Bucket',
        // DependsOn: ['SNSTopicPolicy'],
        Properties: {
          AccessControl: 'BucketOwnerFullControl',
          BucketName: '${self:provider.environment.IMAGES_S3_BUCKET}',
          NotificationConfiguration: {
            // LambdaConfigurations: [
            //   {
            //     Event: 's3:ObjectCreated:*',
            //     Function: {
            //       'Fn::GetAtt': ['SendUploadNotificationsLambdaFunction', 'Arn'],
            //     },
            //   },
            // ],
            // TopicConfigurations: [
            //   {
            //     Topic: {
            //       Ref: 'ImagesTopic',
            //     },
            //     Event: 's3:ObjectCreated:Put',
            //   },
            // ],
          },
          CorsConfiguration: {
            CorsRules: [
              {
                AllowedOrigins: ['*'],
                AllowedHeaders: ['*'],
                AllowedMethods: ['GET', 'PUT', 'DELETE', 'POST', 'HEAD'],
                MaxAge: 3000,
              },
            ],
          },
        },
      },

      // SendUploadNotificationsPermission: {
      //   Type: 'AWS::Lambda::Permission',
      //   Properties: {
      //     FunctionName: {
      //       Ref: 'SendUploadNotificationsLambdaFunction',
      //     },
      //     Principal: 's3.amazonaws.com',
      //     Action: 'lambda:InvokeFunction',
      //     SourceAccount: { Ref: 'AWS::AccountId' },
      //     SourceArn: 'arn:aws:s3:::${self:provider.environment.IMAGES_S3_BUCKET}',
      //   },
      // },
      BucketPolicy: {
        Type: 'AWS::S3::BucketPolicy',
        Properties: {
          PolicyDocument: {
            Id: 'MyPolicy',
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'PublicReadForGetBucketObjects',
                Effect: 'Allow',
                Principal: '*',
                Action: 's3:GetObject',
                Resource: 'arn:aws:s3:::${self:provider.environment.IMAGES_S3_BUCKET}/*',
              },
            ],
          },
          Bucket: {
            Ref: 'AttachmentsBucket',
          },
        },
      },
      ThumbnailsBucket: {
        Type: 'AWS::S3::Bucket',
        Properties: {
          AccessControl: 'BucketOwnerFullControl',
          BucketName: '${self:provider.environment.THUMBNAILS_S3_BUCKET}',
          CorsConfiguration: {
            CorsRules: [
              {
                AllowedOrigins: ['*'],
                AllowedHeaders: ['*'],
                AllowedMethods: ['GET', 'PUT', 'DELETE', 'POST', 'HEAD'],
                MaxAge: 3000,
              },
            ],
          },
        },
      },
      ImagesSearch: {
        Type: 'AWS::Elasticsearch::Domain',
        Properties: {
          ElasticsearchVersion: '7.10',
          DomainName: 'images-search-${self:provider.stage}',
          ElasticsearchClusterConfig: {
            DedicatedMasterEnabled: false,
            InstanceCount: 1,
            ZoneAwarenessEnabled: false,
            InstanceType: 't2.small.elasticsearch',
          },
          EBSOptions: {
            EBSEnabled: true,
            Iops: 0,
            VolumeSize: 10,
            VolumeType: 'gp2',
          },

          AccessPolicies: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: {
                  // AWS: ['arn:aws:iam::${aws:accountId}:user/serverless', '${aws:accountId}'],
                  // AWS: ['arn:aws:iam::${aws:accountId}:user/serverless', 'arn:aws:iam::${aws:accountId}:root'],
                  AWS: '*',
                },
                Action: 'es:*',
                Condition: {
                  IpAddress: {
                    'aws:SourceIp': ['160.152.113.3'],
                  },
                },
                // Resource:
                //   'arn:aws:es:${aws:region}:${aws:accountId}:domain/${self:resources.Resources.ImagesSearch.Properties.DomainName}/*',
                Resource: '*',
              },
            ],
          },
        },
      },
      KMSKey: {
        Type: 'AWS::KMS::Key',
        Properties: {
          Description: 'KMS key to encrypt Auth0 secret',
          KeyPolicy: {
            Version: '2012-10-17',
            // Id: 'key-default-1',
            Statement: [
              {
                $id: 'Allow administration of the key',
                Effect: 'Allow',
                Principal: {
                  AWS: '*',
                },
                Action: ['kms:*'],
                Resource: '*',
              },
            ],
          },
        },
      },
      KMSKeyAlias: {
        Type: 'AWS::KMS::Alias',
        Properties: {
          AliasName: 'alias/auth0Key-${self:provider.stage}',
          TargetKeyId: {
            Ref: 'KMSKey',
          },
        },
      },
      Auth0Secret: {
        Type: 'AWS::SecretsManager::Secret',
        Properties: {
          Name: '${self:provider.environment.AUTH_0_SECRET_ID}',
          Description: 'Auth0 secret',
          KmsKeyId: {
            Ref: 'KMSKey',
          },
        },
      },
    },
  },
};

module.exports = serverlessConfiguration;
