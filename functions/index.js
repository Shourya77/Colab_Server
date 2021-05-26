const functions = require("firebase-functions");
const express = require("express");
var cors = require('cors')

// const request = require("request");
const needle= require("needle");
const bodyParser = require("body-parser");
const PORT = 3000;
const app = express();
app.use(cors({origin: true}))

const token = functions.config().secret.token;
let retryAttempt=0;
const rules = [
  {
    value: "from:theshourya7",
    tag: "Brand Notification",
  },
];
app.options((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:19006");
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:19006");
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader("Access-Control-Allow-Headers", "*");
  next();
});
app.use(bodyParser.urlencoded({extended:true}))
const rulesURL = "https://api.twitter.com/2/tweets/search/stream/rules";
const streamURL = "https://api.twitter.com/2/tweets/search/stream?tweet.fields=public_metrics,entities";

app.get("/firstpost", async (req, res) => {
  const response = await needle("get", rulesURL, {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  if (response.statusCode !== 200) {
    console.log("Error:", response.statusMessage, response.statusCode);
    throw new Error(response.body);
  }
  // console.log(response.body)
  return res.json(response.body);
  
});

app.post("/test", async(req,res)=>{
  const rules = await needle(
    "get",
    "https://us-central1-colabthecommunity.cloudfunctions.net/app/firstpost",
    {headers: {
      "Content-Type": "application/json"
    }}
  );
  const temp=rules.body

  // console.log(temp)
  if (!Array.isArray(temp.data)) {
    res.status(200).send("Empty rules.data");
  }
  const ids = temp.data.map((rule) => rule.id);
  // console.log(ids)
  const data = {
    delete: {
      ids: ids,
    },
  };

  const response = await needle("post", rulesURL,
  data, {
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
  })

  // console.log(response.body)
  res.status(200).json(response.body)
})

app.post("/setrules", async(req,res)=>{
  const data = {
    add: rules,
  };

  const response = await needle("post", rulesURL, data, {
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
  });

  if (response.statusCode !== 201) {
    // console.log("JERE")
    throw new Error(response.body);
  }

  return res.status(200).json(response.body);
})

app.get("/stream",async (req,res)=>{
  // THIS IS TIMING OUT
  const stream = needle.get(streamURL, {
    headers: {
      "User-Agent": "v2FilterStreamJS",
      Authorization: `Bearer ${token}`,
    },
    timeout: 2000,
  });

  stream
    .on("data", (data) => {
      try {
        const json = JSON.parse(data);
        const final={"json":json,"stream":stream}
        console.log(final)
        res.status(200).json(json)
        return
        // res.status(200).json(final)
        // A successful connection resets retry count.
        retryAttempt = 0;
      } catch (e) {
        if (
          data.detail ===
          "This stream is currently at the maximum allowed connection limit."
        ) {
          //console.log(data.detail);
          process.exit(1);
        } else {
          // Keep alive signal received. Do nothing.
        }
      }
    })
    .on("err", (error) => {
      if (error.code !== "ECONNRESET") {
        //console.log(error.code);
        process.exit(1);
      } else {
        // This reconnection logic will attempt to reconnect when a disconnection is detected.
        // To avoid rate limits, this logic implements exponential backoff, so the wait time
        // will increase if the client cannot reconnect to the stream.
        setTimeout(() => {
          console.warn("A connection error occurred. Reconnecting...");
          streamConnect(+A+retryAttempt);
        }, 2 ** retryAttempt);
      }
    });

  
})

app.listen(PORT, () => {
  console.log("Server is running on PORT", PORT);
});

// exporting the entire app as a firebase function
exports.app = functions.https.onRequest(app);
