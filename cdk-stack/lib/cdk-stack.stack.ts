import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as sns from "aws-cdk-lib/aws-sns";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import path = require('path');
import { CdkStackEnv } from './cdk-stack.model';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dotenv from 'dotenv';

dotenv.config();

export class CdkStackStack extends cdk.Stack {

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {

    super(scope, id, props);

    // SNS topics

    const todoCreateTopic = new sns.Topic(this, "TodoCreateTopic");
    const todoUpdateTopic = new sns.Topic(this, "TodoUpdateTopic");
    const todoDeleteTopic = new sns.Topic(this, "TodoDeleteTopic");

    // Lambdas

    let gatewayFunc, todoCreateFunc, todoUpdateFunc, todoDeleteFunc: lambda.Function;
    
    switch (process.env['STACK_ENV']) {

      case CdkStackEnv.PROD:
        gatewayFunc = new lambda.DockerImageFunction(this, 'GatewayFunction', {
          code: lambda.DockerImageCode.fromImageAsset(path.resolve('../cdk-src'), {
            buildArgs: {
              'HANDLER_FILE': 'src/lambda/gateway/index.js',
              'HANDLER_ENTRY': 'index.handler'
            }
          }),
          environment: {
            'TODO_CREATE_TOPIC_ARN': todoCreateTopic.topicArn,
            'TODO_UPDATE_TOPIC_ARN': todoUpdateTopic.topicArn,
            'TODO_DELETE_TOPIC_ARN': todoDeleteTopic.topicArn
          },
          timeout: cdk.Duration.minutes(5)
        });
        todoCreateFunc = new lambda.DockerImageFunction(this, 'TodoCreateFunction', {
          code: lambda.DockerImageCode.fromImageAsset(path.resolve('../cdk-src'), {
            buildArgs: {
              'HANDLER_FILE': 'src/lambda/todo/create.js',
              'HANDLER_ENTRY': 'create.handler'
            }
          }),
          timeout: cdk.Duration.minutes(5)
        });
        todoUpdateFunc = new lambda.DockerImageFunction(this, 'TodoUpdateFunction', {
          code: lambda.DockerImageCode.fromImageAsset(path.resolve('../cdk-src'), {
            buildArgs: {
              'HANDLER_FILE': 'src/lambda/todo/update.js',
              'HANDLER_ENTRY': 'update.handler'
            }
          }),
          timeout: cdk.Duration.minutes(5)
        });
        todoDeleteFunc = new lambda.DockerImageFunction(this, 'TodoDeleteFunction', {
          code: lambda.DockerImageCode.fromImageAsset(path.resolve('../cdk-src'), {
            buildArgs: {
              'HANDLER_FILE': 'src/lambda/todo/delete.js',
              'HANDLER_ENTRY': 'delete.handler'
            }
          }),
          timeout: cdk.Duration.minutes(5)
        });
        break;

      case CdkStackEnv.LOCAL:
        gatewayFunc = new NodejsFunction(this, 'GatewayFunction', {
          entry: path.resolve('../cdk-src/src/lambda/gateway/index.js'),
          handler: 'handler',
          runtime: lambda.Runtime.NODEJS_18_X,
          environment: {
            'TODO_CREATE_TOPIC_ARN': todoCreateTopic.topicArn,
            'TODO_UPDATE_TOPIC_ARN': todoUpdateTopic.topicArn,
            'TODO_DELETE_TOPIC_ARN': todoDeleteTopic.topicArn
          },
          timeout: cdk.Duration.minutes(5)
        });
        todoCreateFunc = new NodejsFunction(this, 'TodoCreateFunction', {
          entry: path.resolve('../cdk-src/src/lambda/todo'),
          handler: 'create.handler',
          runtime: lambda.Runtime.NODEJS_18_X,
          timeout: cdk.Duration.minutes(5)
        });
        todoUpdateFunc = new NodejsFunction(this, 'TodoUpdateFunction', {
          entry: path.resolve('../cdk-src/src/lambda/todo'),
          handler: 'update.handler',
          runtime: lambda.Runtime.NODEJS_18_X,
          timeout: cdk.Duration.minutes(5)
        });
        todoDeleteFunc = new NodejsFunction(this, 'TodoDeleteFunction', {
          entry: path.resolve('../cdk-src/src/lambda/todo'),
          handler: 'delete.handler',
          runtime: lambda.Runtime.NODEJS_18_X,
          timeout: cdk.Duration.minutes(5)
        });
        break;

      default: {
        throw new Error(`Unkown stack environment - ${process.env['STACK_ENV']}`);
      }
    }

    // API gateway

    const gateway = new apigateway.RestApi(this, 'ApiGateway', {
      restApiName: 'Gateway Service',
      description: 'Cdk Intro Todo App API Gateway'
    });
    const gatewayRootPathResource = gateway.root;
    const gatewayIdPathResource = gatewayRootPathResource.addResource('{id}');

    gatewayRootPathResource.addMethod('GET', new apigateway.LambdaIntegration(gatewayFunc));
    gatewayRootPathResource.addMethod('POST', new apigateway.LambdaIntegration(gatewayFunc));
    gatewayIdPathResource.addMethod('PUT', new apigateway.LambdaIntegration(gatewayFunc));
    gatewayIdPathResource.addMethod('DELETE', new apigateway.LambdaIntegration(gatewayFunc));


    // SQS queues

    const todoCreateSqs = new sqs.Queue(this, 'TodoCreateQueue', {
      visibilityTimeout: cdk.Duration.minutes(5)
    });
    const todoUpdateSqs = new sqs.Queue(this, 'TodoUpdateQueue', {
      visibilityTimeout: cdk.Duration.minutes(5)
    });
    const todoDeleteSqs = new sqs.Queue(this, 'TodoDeleteQueue', {
      visibilityTimeout: cdk.Duration.minutes(5)
    });

    todoCreateFunc?.addEventSource( new SqsEventSource(todoCreateSqs) );
    todoUpdateFunc?.addEventSource( new SqsEventSource(todoUpdateSqs) );
    todoDeleteFunc?.addEventSource( new SqsEventSource(todoDeleteSqs) );

    todoCreateTopic.addSubscription( new subscriptions.SqsSubscription(todoCreateSqs) );
    todoUpdateTopic.addSubscription( new subscriptions.SqsSubscription(todoUpdateSqs) );
    todoDeleteTopic.addSubscription( new subscriptions.SqsSubscription(todoDeleteSqs) );
    
  }

}
