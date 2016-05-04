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

## AWS Credentials
Setup your aws credentials in  ~/.aws/credentials
```
[default]
aws_access_key_id = XXXXXXXXXX
aws_secret_access_key = XXXXXXXXXX

[test]
aws_access_key_id = XXXXXXXXXX
aws_secret_access_key = XXXXXXXXXX

[prod]
aws_access_key_id = XXXXXXXXXX
aws_secret_access_key = XXXXXXXXXX
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
