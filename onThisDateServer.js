const http = require("http");
const path = require("path");
const express = require("express");
const app = express();
const portNumber = 5000;
const bodyParser = require("body-parser");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

require("dotenv").config({ path: path.resolve(__dirname, "./.env") });

const db = "CMSC335_Final";
const collection = "events";

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://mparadise:Wolfpack10@cluster0.wf96avh.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", (request, response) => {
  response.render("onThisDate", {});
});

app.post("/selectedDate", (request, response) => {
  const { day, month } = request.body;
  const url = `https://numbersapi.p.rapidapi.com/${month}/${day}/date?fragment=true&json=true`;
  const options = {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": "f3e5827657msh04824902c177f07p148f26jsn64447aec5bce",
      "X-RapidAPI-Host": "numbersapi.p.rapidapi.com",
    },
  };

  fetch(url, options)
    .then((res) => res.json())
    .then((json) => {
      
      let str = `On ${convert(month)} ${day}, ${json.year} ${json.text}`;
      const variables = {
        "day": Number(day),
        "month": month,
        "year": json.year,
        "text": json.text
      }
      console.log(variables);
      addData(variables);
      response.render("selectedDate", { text: str });
    })
    .catch((err) => console.error("error:" + err));
});

app.post("/previousEvents", (request, response) => {
  let str = "";
  let events = getData();
  events.then(e => {
    e.forEach(event => {
      let uppercase = event.text.charAt(0).toUpperCase() + event.text.slice(1);
      str += `<strong>${convert(event.month)} ${event.day}, ${event.year}:</strong><br>`;
      str += `<i>${uppercase}</i><br><br>`;   
    });
    response.render("previousEvents", {string: str});
  });
});

let convert = (num) => {
  const months = new Map([
    ["1", "January"],
    ["2", "February"],
    ["3", "March"],
    ["4", "April"],
    ["5", "May"],
    ["6", "June"],
    ["7", "July"],
    ["8", "August"],
    ["9", "September"],
    ["10", "October"],
    ["11", "November"],
    ["12", "December"],
  ]);
  return months.get(num);
};

async function addData(data) {

  try {
    await client.connect();
    const result = await client.db(db).collection(collection).insertOne(data);

    console.log(`Historical event added with id ${result.insertedId}`);
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
}

async function getData() {

  try {
    await client.connect();
    const cursor = client.db(db).collection(collection).find({});
    const result = await cursor.sort({year: 1, month: 1, day: 1}).toArray();
    console.log(`Found: ${result.length} events`);
    return result;
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
}

app.listen(portNumber);
console.log(`Web server started and running at https://onthisdate.onrender.com/`);
process.stdout.write("Stop to shutdown the server: \n");
process.stdin.setEncoding("utf8");
process.stdin.on("readable", () => {
  let dataInput = process.stdin.read();

  while (dataInput !== null) {
    let command = dataInput.trim();
    if (command === "stop") {
      console.log("Shutting down the server");
      process.exit(0);
    }
    process.stdout.write("Stop to shutdown the server: \n");
    dataInput = process.stdin.read();
  }
});


