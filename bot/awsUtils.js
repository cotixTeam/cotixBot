const AWS = require('aws-sdk');
const FileSystem = require('fs');

/** Saves a string into an s3 bucket.
 * @param {String} bucket The domain of the bucket to save the body into.
 * @param {String} key The key of the object (folder/file) to save the body into.
 * @param {String} body The data to write into the bucket.
 */
exports.save = function save(bucket, key, body) {
    let s3 = new AWS.S3({
        apiVersion: '2006-03-01',
        region: 'eu-west-2',
    });

    if (process.env.NODE_ENV == 'production') {
        s3.upload(
            {
                Bucket: bucket,
                Key: key,
                Body: body,
            },
            (err, data) => {
                if (err) {
                    console.info('Error', err);
                }
                if (data) {
                    console.info('-\tUpload successful!');
                    console.info(data.Location);
                }
            }
        );
    } else {
        FileSystem.writeFileSync('./local/' + key, body);
    }
};

/** Loads a string from an s3 bucket.
 * @param {String} bucket The domain of the bucket to load the body from.
 * @param {String} key The key of the object (folder/file) to load the body from.
 * @returns {String} The contents of the file.
 */
exports.load = async function load(bucket, key) {
    let s3 = new AWS.S3({
        apiVersion: '2006-03-01',
        region: 'eu-west-2',
    });

    if (process.env.NODE_ENV == 'production') {
        let data = await s3
            .getObject(
                {
                    Bucket: bucket,
                    Key: key,
                },
                async (err, data) => {
                    if (err && err.code === 'NotFound') {
                        console.error(err);
                        console.info('Not Found');
                        return null;
                    } else if (err) {
                        console.error(err);
                        return null;
                    } else {
                        return JSON.parse(data.Body.toString());
                    }
                }
            )
            .promise();
        let jsonData = JSON.parse(data.Body.toString());
        return jsonData;
    } else {
        let data = FileSystem.readFileSync('./local/' + key);
        let jsonData = JSON.parse(data);
        return jsonData;
    }
};
