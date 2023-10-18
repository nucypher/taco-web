const bodyParser = require('body-parser');
const cors = require('cors');
const express = require('express');
const router = require('express').Router();
const nucypher = require('@nucypher/nucypher-ts');

router.get('/', (req, res) => {
  const config = {
    // Public Porter endpoint on Tapir network
    porterUri: 'https://porter-tapir.nucypher.community',
  };

  const secretKey = nucypher.SecretKey.fromBytes(Buffer.from('fake-secret-key-32-bytes-bob-xxx'));
  const bob = nucypher.Bob.fromSecretKey(config, secretKey);

  res.send(bob.decryptingKey.toString());
});

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(router);

const port = 3000;
app.listen(port, () => console.log(`Listening on port ${port}!`));
