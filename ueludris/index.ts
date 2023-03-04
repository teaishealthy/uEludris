import express from "express";
import { Router } from "express";
import { EventEmitter } from "events";
import { InstanceInfo, Message } from "eludris-api-types/oprish";
import toml from "toml";
import cors from "cors";
import { readFileSync } from "fs";
import expressWs from "express-ws";
import bodyParser from "body-parser";

const config = toml.parse(readFileSync("Eludris.toml", "utf-8"));

const eventEmitter = new EventEmitter();

const router = Router();
const app = express();

app.use(cors());
app.use(bodyParser.text());
expressWs(app);

app.get("/", (req, res) => {
  const pandemoniumUrl = new URL("/pandemonium", process.env.OPRISH_URL!);
  pandemoniumUrl.protocol = pandemoniumUrl.protocol.replace("http", "ws");
  const instanceInfo: InstanceInfo = {
    instance_name: config.instance_name,
    description: config.description,
    version: "0.3.1",
    message_limit: config.message_limit,
    oprish_url: process.env.OPRISH_URL!,
    pandemonium_url: pandemoniumUrl.toString(),
    effis_url: "https://cdn.eludris.gay",
    file_size: config.effis.file_size,
    attachment_file_size: config.effis.attachment_file_size,
  };
  res.json(instanceInfo);
});

app.get("/ratelimits", (req, res) => {
  res.json({
    oprish: {
      info: {
        reset_after: 5,
        limit: 2,
      },
      message_create: {
        reset_after: 5,
        limit: 5,
      },
      rate_limits: {
        reset_after: 5,
        limit: 2,
      },
    },
    pandemonium: {
      reset_after: 10,
      limit: 5,
    },
    effis: {
      assets: {
        reset_after: 60,
        limit: 5,
        file_size_limit: 30000000,
      },
      attachments: {
        reset_after: 120,
        limit: 20,
        file_size_limit: 100000000,
      },
      fetch_file: {
        reset_after: 60,
        limit: 30,
      },
    },
  });
});

app.post("/messages", (req, res) => {
  const message = JSON.parse(req.body) as Message;
  eventEmitter.emit("message", message);
  res.json(message);
});

router.ws("/", (ws, req) => {
  eventEmitter.on("message", (data) => {
    ws.send(
      JSON.stringify({
        op: "MESSAGE_CREATE",
        d: data,
      })
    );
  });
  ws.on("message", (msg) => {
    const data = JSON.parse(msg.toString()) as any;

    if (data.op === "PING") {
      return ws.send(
        JSON.stringify({
          op: "PONG",
        })
      );
    }
  });
});

app.use("/pandemonium", router);

app.listen(3000, () => {
  console.log("Listening on port 3000");
});
