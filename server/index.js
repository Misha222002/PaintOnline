const express = require("express");
const app = express();
const WSServer = require("express-ws")(app);
const aWss = WSServer.getWss();
const cors = require("cors");
const PORT = process.env.PORT || 5000;
const fs = require("fs");
const path = require("path");

app.use(cors());
app.use(express.json());

app.ws("/", function (ws, req) {
  console.log("Подключение установлено");
  ws.on("message", function (msg) {
    msg = JSON.parse(msg);
    switch (msg.method) {
      case "connection":
        connectionHandler(ws, msg);
        break;
      case "draw":
        broadcastConnection(ws, msg);
        break;
    }
  });
});

app.post("/image", (req, res) => {
  try {
    console.log(req.query);
    const data = req.body.img.replace("data:image/png;base64,", "");
    fs.writeFileSync(
      path.resolve(__dirname, `files`, `${req.query.id}.jpg`),
      data,
      "base64"
    );
    return res.json({ message: "Загрузка" });
  } catch (e) {
    console.log(e);
    return res.status(500).json("error");
  }
});
app.get("/image", (req, res) => {
  try {
    const file = fs.readFileSync(
      path.resolve(__dirname, `files`, `${req.query.id}.jpg`)
    );
    const data = "data:image/png;base64," + file.toString("base64");
    return res.json(data);
  } catch (e) {
    console.log(e);
    return res.status(500).json("error");
  }
});

app.listen(PORT, () => console.log(`server started on port = ${PORT}`));

const connectionHandler = (ws, msg) => {
  ws.id = msg.id;
  broadcastConnection(ws, msg);
};

const broadcastConnection = (ws, message) => {
  aWss.clients.forEach((client) => {
    if (client.id == message.id) {
      client.send(JSON.stringify(message));
    }
  });
};
