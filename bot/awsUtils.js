exports.save = function (bucket, key, body) {
    const AWS = require('aws-sdk');
    let s3 = new AWS.S3({
        apiVersion: '2006-03-01',
        region: "eu-west-2"
    });

    s3.upload({
        Bucket: bucket,
        Key: key,
        Body: body
    }, (err, data) => {
        if (err) {
            console.log("Error", err);
        }
        if (data) {
            console.log("-\tUpload successful!");
            console.log(data.Location);
        }
    });
}

exports.load = async function (bucket, key) {
    const AWS = require('aws-sdk');
    let s3 = new AWS.S3({
        apiVersion: '2006-03-01',
        region: "eu-west-2"
    });

    let data = await s3.getObject({
        Bucket: bucket,
        Key: key
    }, (err, data) => {
        if (err && err.code === 'NotFound') {
            console.error(err);
            console.log("Not Found");
        } else if (err) {
            console.error(err);
        } else {
            return JSON.parse(data.Body.toString());
        }
    }).promise();

    return data;
}