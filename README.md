# Brightcove Dynamo Stream Call Back Updater

## Pre-requistes

### Install node and npm
#### Mac
```
$ brew install node
```

### Install Gulp
#### Mac
```
$ npm install gulp -g
```

# Building etc..

### AWS Credentials

#### Local
If deploying from a non-ec2 instance setup aws profile
http://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html#cli-multiple-profiles

#### Set default profile in shell
'''export set AWS_DEFAULT_PROFILE=staging'''
```

##  Deploying
```
$ gulp --env=test --role=arn:aws:iam::810385116814:role/JemRayfieldsLambdaExecutionRole
$ gulp --env=prod --role=arn:aws:iam::{accountId}:role/{role}
```

## Testing

```
$ npm install nodeunit -g
$ nodeunit test/index.good.test.js
```
