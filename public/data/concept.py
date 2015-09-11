import http.client as client
import urllib.parse as parse
import json

hostName = "194.250.19.133:9091"
headers = {"Accept" : "application/json"}

queryString = """
  PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
  PREFIX mimo-gr: <http://194.250.19.133:9091/mimo>
  SELECT DISTINCT ?concept 
  ?prefLabel ?prefLabelEn ?prefLabelFr ?prefLabelIt ?prefLabelDe ?prefLabelNl ?prefLabelSv ?prefLabelCa 
  ?altLabel ?exactMatch ?closeMatch
  FROM mimo-gr:
  WHERE {
    ?concept rdf:type skos:Concept .
    OPTIONAL { ?concept skos:prefLabel+ ?prefLabel . FILTER (lang(?prefLabel) = "") } .
    OPTIONAL { ?concept skos:prefLabel ?prefLabelEn . FILTER (lang(?prefLabelEn) = "en") } .
    OPTIONAL { ?concept skos:prefLabel ?prefLabelFr . FILTER (lang(?prefLabelFr) = "fr") } .
    OPTIONAL { ?concept skos:prefLabel ?prefLabelIt . FILTER (lang(?prefLabelIt) = "it") } .
    OPTIONAL { ?concept skos:prefLabel ?prefLabelDe . FILTER (lang(?prefLabelDe) = "de") } .
    OPTIONAL { ?concept skos:prefLabel ?prefLabelNl . FILTER (lang(?prefLabelNl) = "nl") } .
    OPTIONAL { ?concept skos:prefLabel ?prefLabelSv . FILTER (lang(?prefLabelSv) = "sv") } .
    OPTIONAL { ?concept skos:prefLabel ?prefLabelCa . FILTER (lang(?prefLabelCa) = "ca") } .
    OPTIONAL { ?concept skos:altLabel+ ?altLabel} .
    OPTIONAL { ?concept skos:exactMatch+ ?exactMatch} .
    OPTIONAL { ?concept skos:closeMatch+ ?closeMatch} 
  }
  ORDER BY ?concept
  
"""


params = {"query" : queryString}
encodedQuery = parse.urlencode(params)

connection = client.HTTPConnection(hostName)
connection.request("GET","/sparql?" + encodedQuery, "", headers)

resp = connection.getresponse()

cleaned_set = {}

print()

if resp.status == client.OK :
  respAsString = bytes.decode(resp.read())
  jsonData = json.JSONDecoder().decode(respAsString)
  for binding in jsonData["results"]["bindings"] :
    #print (binding)
    uri =  binding["concept"]["value"]
    
    if uri in cleaned_set:
      concept_object = cleaned_set[uri]
    else:
      concept_object = {"uri" :  binding["concept"]["value"]}
    
    if "prefLabel" in binding:
      if "value" in binding["prefLabel"]:
        if "prefLabel" not in concept_object:
          concept_object["prefLabel"] = {}
        concept_object["prefLabel"]["pivot"] = binding["prefLabel"]["value"]
    if "prefLabelEn" in binding:
      concept_object["prefLabel"]["en"] = binding["prefLabelEn"]["value"]
    if "prefLabelFr" in binding:
      concept_object["prefLabel"]["fr"] = binding["prefLabelFr"]["value"]
    if "prefLabelIt" in binding:
      concept_object["prefLabel"]["it"] = binding["prefLabelIt"]["value"]
    if "prefLabelDe" in binding:
      concept_object["prefLabel"]["de"] = binding["prefLabelDe"]["value"]
    if "prefLabelNl" in binding:
      concept_object["prefLabel"]["nl"] = binding["prefLabelNl"]["value"]
    if "prefLabelSv" in binding:
      concept_object["prefLabel"]["sv"] = binding["prefLabelSv"]["value"]
    if "prefLabelCa" in binding:
      concept_object["prefLabel"]["ca"] = binding["prefLabelCa"]["value"]
    
    if "altLabel" in binding:
      if "value" in binding["altLabel"]:
        if "altLabel" not in concept_object:
          concept_object["altLabel"] = {}
        if "xml:lang" in binding["altLabel"]:
          if "xml:lang" not in  concept_object["altLabel"]:
            concept_object["altLabel"][binding["altLabel"]["xml:lang"]] = []
          concept_object["altLabel"][binding["altLabel"]["xml:lang"]].append(binding["altLabel"]["value"])
        else:
          if "pivot" not in  concept_object["altLabel"]:
            concept_object["altLabel"]["pivot"] = []
          concept_object["altLabel"]["pivot"].append(binding["altLabel"]["value"])

    if "exactMatch" in binding:
      if "value" in binding["exactMatch"]:
        if "exactMatch" not in concept_object:
          concept_object["exactMatch"] = []
        concept_object["exactMatch"].append(binding["exactMatch"]["value"])

    if "closeMatch" in binding:
      if "value" in binding["closeMatch"]:
        if "closeMatch" not in concept_object:
          concept_object["closeMatch"] = []
        concept_object["closeMatch"].append(binding["closeMatch"]["value"])

    cleaned_set[uri] = concept_object
    #print (cleaned_set[uri])
                #dep = binding["nom"]["value"]
                #pop = binding["population"]["value"]
                #print("Nom : %s ; Population : %s" %(dep,pop))
  for concept in cleaned_set:
    print (cleaned_set[concept])
else :
  print("Erreur : " + str(resp.status))
