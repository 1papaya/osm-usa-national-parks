export const protectedLandsQuery = `
SELECT
  ?protectedLand
  ?protectedLandLabel
  ?osmRelationId
  ?wikipedia
  ?protection
  (GROUP_CONCAT(DISTINCT ?state; separator=";") AS ?states)

WHERE {
  # wd:Q34918903 = US National Park
  # wd:Q612741   = US National Forest
  
  VALUES ?protection { wd:Q34918903 }
  ?protectedLand wdt:P31 ?protection .
                 hint:Prior hint:runFirst true .
  
  
  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en" .
    ?protectedLand rdfs:label ?protectedLandLabel .
  }
  
  OPTIONAL {
    ?protectedLand wdt:P402 ?osmRelationId .
  }

  OPTIONAL {
    ?protectedLand wdt:P131 ?locatedIn .
    ?locatedIn wdt:P31 wd:Q35657 .
    SERVICE wikibase:label {
        bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en" .
        ?locatedIn rdfs:label ?state .
      }
  }
  
  ## Wikipedia
  OPTIONAL {
    VALUES ?langs { "[AUTO_LANGUAGE]" "en" }
    ?wikipedia schema:about ?protectedLand .
    ?wikipedia schema:inLanguage ?langs .
    FILTER (SUBSTR(str(?wikipedia), 11, 15) = ".wikipedia.org/")
  }
}
GROUP BY ?protectedLand ?protectedLandLabel ?osmRelationId ?wikipedia ?protection`.trim();

export interface ProtectedLand {
  name: string;
  wikidataId: string;
  protection: "National Forest" | "National Park";
  osmRelationId: string | null;
  states: string[];
  wikipedia: string | null;
}

export const getProtectedLands = () => {
  return fetch(
    `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(
      protectedLandsQuery
    )}`,
    { cache: "no-cache" }
  )
    .then((resp) => resp.json())
    .then(
      (wikidataJson: any) =>
        wikidataJson.results.bindings
          .map((record) => ({
            name: record.protectedLandLabel.value,
            wikidataId: record.protectedLand.value.split("/").pop(),
            osmRelationId:
              "osmRelationId" in record ? record.osmRelationId.value : null,
            states: record.states.value
              .split(";")
              .filter((state) => state !== ""),
            wikipedia:
              "wikipedia" in record
                ? record.wikipedia.value.split("/").pop()
                : null,
            protection:
              record.protection.value.split("/").pop() === "Q612741"
                ? "National Forest"
                : "National Park",
          }))
          .sort((a, b) => (a.name < b.name ? -1 : 1)) as ProtectedLand[]
    );
};
