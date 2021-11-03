import { getProtectedLands } from "../lib/wikidata";
import { OverpassEndpoint, OverpassArea, endpoints } from "overpass-ts";
import { todayISO } from "../lib/common";
import stringify from "json-stringify-pretty-compact";
import * as fs from "fs";

const dataPath = "./data/raw";
const errorLands = [];
const today = todayISO();

(async () => {
  const overpass = new OverpassEndpoint(endpoints.kumi, {
    verbose: true,
  });

  await getProtectedLands().then(async (lands) => {
    // lands with no osm relation id
    lands
      .filter((land) => land.osmRelationId === null)
      .forEach(({ name, wikidataId, osmRelationId }) => {
        errorLands.push({
          name,
          wikidataId,
          osmRelationId,
          reason: "missing osm relation id",
        });
      });

    return Promise.all(
      lands
        .filter((land) => land.osmRelationId !== null)
        .filter((land) => land.wikidataId === "Q1137669")
        .map(({ name, wikidataId, osmRelationId }) => {
          const landAreaId = parseInt(osmRelationId) + 3600000000;

          overpass
            .queryJson({
              name: `${landAreaId} ${name}`,
              query: [
                `[out:json][date:"${today}"];`,
                `area(${landAreaId}) -> .park; .park out meta;`,
                `rel(${osmRelationId}); out meta geom;`,
                `way(area.park)[highway=path]; out meta geom;`,
                `way(area.park)[highway=track]; out meta geom;`,
                `way(area.park)[highway=footway]; out meta geom;`,
                `way(area.park)[highway=bridleway]; out meta geom;`,
              ].join("\n"),
            })
            .then((json) => {
              // add timestamp_data_base to output json
              json.osm3s = {
                ...{ timestamp_data_base: today },
                ...json.osm3s,
              };

              const areaElement = json.elements.find(
                (el) => el.id === landAreaId
              ) as OverpassArea;

              if (!areaElement)
                errorLands.push({
                  name,
                  wikidataId,
                  osmRelationId,
                  reason: `cannot find area element ${landAreaId}`,
                });
              else if (!("boundary" in areaElement.tags))
                errorLands.push({
                  name,
                  wikidataId,
                  osmRelationId,
                  reason: "osm relation is not boundary",
                });
              else {
                console.log(`saving ${name}`);

                return fs.promises.writeFile(
                  `${dataPath}/${osmRelationId}.json`,
                  stringify(json)
                );
              }
            })
            .catch((error) => {
              errorLands.push({
                name,
                wikidataId,
                osmRelationId,
                reason: error.message,
              });
            });
        })
    );
  });
})();
