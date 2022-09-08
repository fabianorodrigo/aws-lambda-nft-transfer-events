# NFT Transfer Events

This project consist of two lambda functions. One is triggered by a Scheduled event (every 10 minutes) and is responsible for monitor the Transfer events of a NFT smart contract (ERC-721) and persists the caught events into a DyanmoDB Table named `NFTEvents`; the other lambda is available through an endpoint that will list the registries of NFT Transfer Events persisted by the former.

This project contains source code and supporting files for a serverless application that you can deploy with the SAM CLI. It includes the following files and folders.

- nft-lambdas - Code for the application's Lambda functions written in TypeScript.
- nft-lambdas/dynamodb - features related to DynamoDB operations
- nft-lambdas/web3 - features related to interaction with NFT smart contract
- nft-lambdas/tests - Unit tests for the application code. 
- template.yaml - A template that defines the application's AWS resources and parameters.
- events - Invocation events that you can use to invoke the function.

The application uses several AWS resources, including Lambda functions, an API Gateway API and a CloudWatch Event. These resources are defined in the `template.yaml` file in this project.

## Deploy

The Serverless Application Model Command Line Interface (SAM CLI) is an extension of the AWS CLI that adds functionality for building and testing Lambda applications. It uses Docker to run your functions in an Amazon Linux environment that matches Lambda. It can also emulate your application's build environment and API.

To use the SAM CLI, you need the following tools.

* SAM CLI - [Install the SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)
* Node.js - [Install Node.js 16](https://nodejs.org/en/), including the NPM package management tool.
* Docker - [Install Docker community edition](https://hub.docker.com/search/?type=edition&offering=community)

When deploying the app using just `sam deploy --guided` an error was thrown: `Unzipped size must be smaller than 262144000 bytes`. The solution was to build with the Package Type `Image` in spite of zip:

```bash
sam build --use-container --beta-features
sam deploy --guided
```

The first command build the source of the application in a container image, which includes the base operating system, runtime, and extensions, in addition to application code and its dependencies. Since the use of esbuild to build Typescript code is still experimental, the `--beta-features` is necessary or a prompt to confirme the use of this beta feature will be shown: *Please confirm if you would like to proceed with using esbuild to build your function. You can also enable this beta feature with 'sam build --beta-features'*


The second command packages and deploys the application to AWS, with a series of prompts:

* **Stack Name**: The name of the stack to deploy to CloudFormation. This should be unique to your account and region, and a good starting point would be something matching your project name.
  
* **AWS Region**: The AWS region you want to deploy your app to.

* **Parameter StageName**: The Stage you want to deploy your app to (dev or prod).
  
* **Parameter EthProviderParameter**: This is the Ethereum Provider URL endpoint that will be used by the application. Typically, you should make a register in Ethereum Providers, like Alchemy or Infura, and it will be generated this URL. Example of an app to connect to Polygon Mumbai Network at Alchemy: [https://polygon-mumbai.g.alchemy.com/v2/<a secret key>](https://docs.alchemy.com/docs/alchemy-quickstart-guide#1key-create-an-alchemy-key)
  
* **Parameter ERC721AddressParameter**: The address of the ERC-721 contract that you want to watch the transfer events.
  
* **Confirm changes before deploy**: If set to yes, any change sets will be shown to you before execution for manual review. If set to no, the AWS SAM CLI will automatically deploy application changes.
  
* **Allow SAM CLI IAM role creation**: Many AWS SAM templates, including this example, create AWS IAM roles required for the AWS Lambda function(s) included to access AWS services. By default, these are scoped down to minimum required permissions. To deploy an AWS CloudFormation stack which creates or modifies IAM roles, the `CAPABILITY_IAM` value for `capabilities` must be provided. If permission isn't provided through this prompt, to deploy this example you must explicitly pass `--capabilities CAPABILITY_IAM` to the `sam deploy` command.
  
* **Save arguments to samconfig.toml**: If set to yes, your choices will be saved to a configuration file inside the project, so that in the future you can just re-run `sam deploy` without parameters to deploy changes to your application.

You can find your API Gateway Endpoint URL in the output values displayed after deployment.

## Use the SAM CLI to build and test locally

Build your application with the `sam build` command.

```bash
$ sam build
```

The SAM CLI installs dependencies defined in `nft-transfer-events/package.json`, compiles TypeScript with esbuild, creates a deployment package, and saves it in the `.aws-sam/build` folder.

Test a single function by invoking it directly with a test event. An event is a JSON document that represents the input that the function receives from the event source. Test events are included in the `events` folder in this project.

Run functions locally and invoke them with the `sam local invoke` command.

```bash
$ sam local invoke NFTTransferEventsMonitorFunction --event events/event-cloudwatch.json

$ sam local invoke NFTTransferEventsViewFunction --event events/event-API-Gateway.json
```

The SAM CLI can also emulate your application's API. Use the `sam local start-api` to run the API locally on port 3000.

```bash
$ sam local start-api
$ curl http://localhost:3000/
```

The SAM CLI reads the application template to determine the API's routes and the functions that they invoke. The `Events` property on each function's definition includes the route and method for each path.

```yaml
      Events:
        HelloWorld:
          Type: Api
          Properties:
            Path: /nft-transfers
            Method: get
```

## Add a resource to your application
The application template uses AWS Serverless Application Model (AWS SAM) to define application resources. AWS SAM is an extension of AWS CloudFormation with a simpler syntax for configuring common serverless application resources such as functions, triggers, and APIs. For resources not included in [the SAM specification](https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md), you can use standard [AWS CloudFormation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-template-resource-type-ref.html) resource types.

## Fetch, tail, and filter Lambda function logs

To simplify troubleshooting, SAM CLI has a command called `sam logs`. `sam logs` lets you fetch logs generated by your deployed Lambda function from the command line. In addition to printing the logs on the terminal, this command has several nifty features to help you quickly find the bug.

`NOTE`: This command works for all AWS Lambda functions; not just the ones you deploy using SAM.

```bash
$ sam logs -n NFTTransferEventsMonitorFunction --stack-name nft-transfer-events --tail
```

You can find more information and examples about filtering Lambda function logs in the [SAM CLI Documentation](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-logging.html).

## Unit tests

Tests are defined in the `nft-lambdas/tests` folder in this project. Use NPM to install the [Jest test framework](https://jestjs.io/) and run unit tests.

```bash
$ cd nft-lambdas
$ pnpm install
$ pnpm run test
```

## Cleanup

To delete the sample application that you created, use the AWS CLI. Assuming you used your project name for the stack name, you can run the following:

```bash
aws cloudformation delete-stack --stack-name nft-transfer-events
```

## Resources

See the [AWS SAM developer guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html) for an introduction to SAM specification, the SAM CLI, and serverless application concepts.

Next, you can use AWS Serverless Application Repository to deploy ready to use Apps that go beyond hello world samples and learn how authors developed their applications: [AWS Serverless Application Repository main page](https://aws.amazon.com/serverless/serverlessrepo/)
