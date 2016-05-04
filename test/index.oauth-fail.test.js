var aws = require('aws-sdk-mock');
var nock = require('nock');
var brightcoveNotificationStreamLambda = require('../index.js')
const context = require('aws-lambda-mock-context');
const ctx = context();

var oauthEndpoint = "https://oauth.brightcove.com/v3/access_token";
var entityId = 4857688305001;
var event = {
    "Records": [
        {
            "eventID": "1",
            "eventVersion": "1.0",
            "dynamodb": {
                "Keys": {
                    "Id": {
                        "N": "123"
                    }
                },
                "NewImage": {
                    "actionType": {
                        "S": "CREATE"
                    },
                    "entity": {
                        "S": entityId
                    },
                    "entityStatus": {
                        "S": "MAYBE_SUCCESS"
                    },
                    "entityType": {
                        "S": "TITLE"
                    },
                    "versionNumber": {
                        "S": "1"
                    },
                    "notificationDateTime": {
                        "S": "xxx"
                    }
                },
                "StreamViewType": "NEW_AND_OLD_IMAGES",
                "SequenceNumber": "111",
                "SizeBytes": 26
            },
            "awsRegion": "us-west-2",
            "eventName": "INSERT",
            "eventSourceARN": "arn:aws:dynamodb:us-west-2:account-id:table/ExampleTableWithStream/stream/2015-06-27T00:48:05.899",
            "eventSource": "aws:dynamodb"
        }
    ]
};

exports.testBrightCoveStreamCallbackUpdateOAuthFail = function(test) {
    // Mock Dynamo update Item
    aws.mock('DynamoDB', 'updateItem', function (params, callback){
        callback(null, "successfully put item in database");
    });
    // Mock BC oauth
    var oauthResource = "";
    var accessToken = "XXXXTOKEN";
    var client_id = "c14ad44d-43d4-45e6-a81c-cc7378ca3f55";
    var client_secret = "9BTPw1H0sWfRpOfBTPTildMQyE5RJprIWEFZ67yroNnVHrqrmvKHch68WgcLAp-svH43nWndgUcDlg8MJHQ3AQ";
    var body = "grant_type=client_credentials&client_id=" + client_id + "&client_secret=" + client_secret ;
    nock(oauthEndpoint, {reqheaders: {'Content-Type': 'application/x-www-form-urlencoded'}})
        .post(oauthResource, body)
        .reply(500, {});
    // Mock BC video sources
    var bcCMSEndpoint = "https://cms.api.brightcove.com";
    var accountId = 2221711291001;
    var resource = "/v1/accounts/" + accountId + /videos/ + entityId + "/sources";
    nock(bcCMSEndpoint + resource, {reqheaders: {'Content-Type': 'application/json', 'Authorization': "Bearer " + accessToken}})
        .get("")
        .reply(200, [{
                "app_name": "rtmp://brightcove.fcod.llnwd.net/a500/e1/uds/rtmp/ondemand",
                "asset_id": "4541302443001",
                "codec": "H264",
                "container": "MP4",
                "duration": 31487,
                "encoding_rate": 983000,
                "height": 360,
                "remote": false,
                "size": 3887659,
                "stream_name": "mp4:57838016001/57838016001_4541302443001_4541288158001.mp4&1445288400000&3121d01e3ac4b1edb4f23509a627321b",
                "uploaded_at": "2015-10-08T02:03:43.621Z",
                "width": 640
            }]
        );
    brightcoveNotificationStreamLambda.handler(event, ctx, function(){});
    test.ok(ctx.Promise.then(), "Brightcove updateItem passed OK");
    test.done();
};