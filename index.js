'use strict';

const webPush = require('web-push');
const aws = require("aws-sdk");
const sts = new aws.STS();
const s3 = new aws.S3();

webPush.setVapidDetails(
  process.env.DOMAIN,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const map = { mr: 'bbc_marathi_tv', hi: 'bbc_hindi_tv' };

exports.handler = async event => {
  //console.log('Received event:', JSON.stringify(event));
  let message = null;
  for (let i = 0; i < event.Records.length; i++) {
    const r = event.Records[i];
    switch (r.EventSource) {
      case 'aws:sns':
        message = JSON.parse(r.Sns.Message);
        if (message.hasOwnProperty("Records")) {
          const r = message.Records[0];
          if(r.s3.object.key.startsWith('schedule')) {
            console.log(r.s3.object.key);
          }
          else {
            await handle_appw(r);
          }
        }
        else {
          console.log('unrecognised SNS message',message);
        }
        break;
      default:
      	console.log('Received unknown event:', JSON.stringify(r));
    }
  }
  return `Successfully processed ${event.Records.length} messages.`;
};

function response(statusCode, body) {
  let payload = {
    statusCode,
    body: typeof (body) === 'string' ? body : JSON.stringify(body, null, 2)
  };
  console.log('RESPOND', payload);
  return payload;
}

async function getSubscriptions(sid) {
  const s = await s3.getObject({ Bucket: process.env.STATE_BUCKET, Key: `${sid}/subscriptions`}).promise();
  return JSON.parse(s.Body.toString("utf-8"));
}

function send(subscriptions, payload, options) {
  console.log('send', subscriptions, payload, options);
  const payload_string = typeof (payload) === 'string' ? payload : JSON.stringify(payload)

  return new Promise((success) => {

    Promise.all(subscriptions.map((each_subscription) => {
      return webPush.sendNotification(each_subscription, payload_string, options);
    }))
      .then(function () {
        success(response(201, {}));
      }).catch(function (error) {
        console.log('ERROR>', error);
        success(response(500, { error: error }));
      });
  });
}

async function handle_appw(message) {
  //console.log('handle_appw', JSON.stringify(message));
  const path = message.s3.object.key.split("/");
  let pid = null;
  let entity_type = null;
  let doc = null;
  if(message.s3.bucket.name === process.env.APPW_EXTENSION_BUCKET) {
    entity_type = path[1];
    pid = path[2].split('.')[1];
    const r = await s3.getObject({ Bucket: message.s3.bucket.name, Key: message.s3.object.key }).promise();
    doc = JSON.parse(r.Body.toString("utf-8"));
  }
  else {
    entity_type = path[4];
    pid = path[5].split('.')[1];
    doc = await get_appw(message.s3.bucket.name, message.s3.object.key);
  }
  switch (entity_type) {
    case 'clip':
    case 'episode':
      {
        const entity = doc.pips[entity_type];
        //console.log(JSON.stringify(entity));
        if(entity.languages) {
          const lang = entity.languages.language[0].$;
          if(map.lang) {
            const payload = {
              msg: `new or changed ${entity_type} ${pid}`,
              pid: pid,
              entity_type: entity_type,
              entity: entity
            };
            console.log(`new or changed ${entity_type} ${pid}`);
            const subscriptions = await getSubscriptions(map[lang]);
            await send(subscriptions, payload, { TTL: 5 }, 0);
          }
        }
      }
      break;
      
    case 'availability':      // safe to ignore, but should we even be getting them here?
    case 'brand':
    case 'series':
      break;
      
    default:
      console.log(JSON.stringify(doc));
  }
}

async function get_appw(bucket, key) {
  console.log('get_appw', bucket, key);
  const appw = await sts
    .assumeRole({
      RoleArn: process.env.APPW_ROLE,
      RoleSessionName: "dazzler-test"
    })
    .promise();

  const appwS3 = new aws.S3({
    accessKeyId: appw.Credentials.AccessKeyId,
    secretAccessKey: appw.Credentials.SecretAccessKey,
    sessionToken: appw.Credentials.SessionToken
  });
  try {
    const appw_doc = await appwS3
      .getObject({ Bucket: bucket, Key: key })
      .promise();
    return JSON.parse(appw_doc.Body.toString("utf-8"));
  }
  catch(error) {
    return null;
  }
}
