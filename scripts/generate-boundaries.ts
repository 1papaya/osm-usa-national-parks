import * as fs from "fs";
import osmtogeojson from "osmtogeojson";
import { OverpassJson, OverpassRelation } from "overpass-ts";
import stringify from "json-stringify-pretty-compact";
import turfSimplify from "@turf/simplify";

const rawDataPath = "./data/raw";
const boundaryPath = "./data/boundary";
const allBoundaryPath = "./data/boundaries.json";

(async () => {
  const simplifiedBoundaries = [];

  fs.promises.readdir(rawDataPath).then((files) =>
    Promise.all(
      files.map((file) =>
        fs.promises
          .readFile(`${rawDataPath}/${file}`, { encoding: "utf8" })
          .then((jsonText) => {
            const json = JSON.parse(jsonText) as OverpassJson;

            const boundary = json.elements.find(
              (el) => el.type === "relation"
            ) as OverpassRelation;
            const boundaryGeoJson = osmtogeojson({ elements: [boundary] })
              .features[0];

            // TODO check if osmtogeojson returns relation or way
            // is broken on single-way relations with no "outer" role

            if ((boundaryGeoJson.id as string).split("/")[0] === "relation") {
              simplifiedBoundaries.push(
                turfSimplify(boundaryGeoJson as any, { tolerance: 0.0001 })
              );

              return fs.promises.writeFile(
                `${boundaryPath}/${file}`,
                stringify(boundaryGeoJson)
              );
            }
          })
          .catch((error) => {
            console.log(`error processing boundary for ${file}`);
            throw error;
          })
      )
    ).then(() =>
      fs.promises.writeFile(
        allBoundaryPath,
        stringify({
          type: "FeatureCollection",
          features: simplifiedBoundaries,
        })
      )
    )
  );
})();
