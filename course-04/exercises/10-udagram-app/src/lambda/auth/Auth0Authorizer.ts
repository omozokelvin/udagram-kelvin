import { middyfy } from '@libs/lambda';
import { APIGatewayAuthorizerHandler, APIGatewayAuthorizerResult, APIGatewayTokenAuthorizerEvent } from 'aws-lambda';
import { verify } from 'jsonwebtoken';
import { JwtToken } from 'src/_types/JwtToken';
import * as AWS from 'aws-sdk';

const secretId = process.env.AUTH_O_SECRET_ID;
const secretField = process.env.AUTH_O_SECRET_FIELD;

const client = new AWS.SecretsManager();

// Cache secret if a lambda function is reused
let cachedSecret: string;

const getSecret = async () => {
  if (cachedSecret) {
    return cachedSecret;
  }

  const data = await client.getSecretValue({ SecretId: secretId }).promise();

  cachedSecret = data.SecretString;

  return JSON.parse(cachedSecret);
};

const verifyToken = async (authHeader: string) => {
  if (!authHeader) {
    throw new Error('No authorization header');
  }

  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    throw new Error('Invalid authorization header');
  }

  const split = authHeader.split(' ');
  const token = split[1];

  const secretObject = await getSecret();
  const secret = secretObject[secretField];

  return verify(token, secret) as JwtToken;
};

const handler: APIGatewayAuthorizerHandler = async (
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  try {
    const decodedToken = await verifyToken(event.authorizationToken);
    console.log('User was authorized');

    return {
      principalId: decodedToken.sub,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: '*',
          },
        ],
      },
    };
  } catch (error) {
    console.log('User was not authorized', error);

    return {
      principalId: 'user',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Deny',
            Resource: '*',
          },
        ],
      },
    };
  }
};

export const main = middyfy(handler);
