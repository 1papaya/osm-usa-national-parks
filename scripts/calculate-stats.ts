import * as fs from "fs";
import { OverpassJson } from "overpass-ts";

const rawDataPath = "./data/raw";
const statsPath = "./data/stats.csv";

(async () => {
  let csvLines = [];
  let date = null;

  return fs.promises
    .readdir(rawDataPath)
    .then((files) =>
      Promise.all(
        files.map((file) =>
          fs.promises
            .readFile(`${rawDataPath}/${file}`, { encoding: "utf8" })
            .then((jsonText) => {
              const json = JSON.parse(jsonText) as OverpassJson;
              date = json.osm3s["timestamp_data_base"]; // added by update script

              const stats = {
                highwayNum: 0,
                footNum: 0,
                operatorNum: 0,
                accessNum: 0,
              };

              for (let el of json.elements) {
                if (el.type == "way" && "highway" in el.tags) {
                  stats.highwayNum++;
                  if ("foot" in el.tags) stats.footNum++;
                  if ("operator" in el.tags) stats.operatorNum++;
                  if ("access" in el.tags) stats.accessNum++;
                }
              }

              const csvLine = `${[
                `"${file.split(".")[0]}"`, // osm Relation id
                `"${date}"`,
                stats.highwayNum,
                stats.footNum,
                stats.operatorNum,
                stats.accessNum,
              ].join(",")}`;

              csvLines.push(csvLine);
            })
        )
      )
    )
    .then(() =>
      fs.promises.readFile(statsPath, { encoding: "utf8" }).then((csvText) => {
        if (csvText.includes(date))
          console.log(`already recorded stats for ${date}`);
        else
          return fs.promises.appendFile(
            statsPath,
            csvLines.sort((a, b) => (a < b ? -1 : 1)).join("\n")
          );
      })
    );
})();
