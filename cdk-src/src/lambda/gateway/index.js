const { SNS } = require('aws-sdk');

exports.handler = async (event) => {

  const notification = new SNS({ region: process.env['AWS_REGION'] });
  const method = event.httpMethod;
  const payload = event.body;
  const params = event.pathParameters;
  
  switch (method) {

    case "POST":
      await notification.publish({
        TopicArn: process.env['TODO_CREATE_TOPIC_ARN'],
        Message: payload
      });
      break;
  
    case "PUT":
      await notification.publish({
        TopicArn: process.env['TODO_UPDATE_TOPIC_ARN'],
        Message: payload
      });
      break;

    case "DELETE":
      await notification.publish({
        TopicArn: process.env['TODO_DELETE_TOPIC_ARN'],
        Message: params['id']
      });
      break;

    default: {
      throw new Error(`Cannot process http request. Unknown http method - ${method}`);
    }
  }

};
