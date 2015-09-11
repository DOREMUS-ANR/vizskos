import http.client as client
import urllib.parse as parse
from pyld import jsonld
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

  
  #g = Graph().parse(data=respAsString, format='n3')
  #print(g.serialize(format='json-ld', context=context, indent=4))

  """
  jsonData = json.JSONDecoder().decode(respAsString)

  doc = jsonData["results"]["bindings"]

  context = {
    "xsd": "http://www.w3.org/2001/XMLSchema#",
    "inScheme" : {"@id": "http://www.w3.org/2004/02/skos/core#inScheme", "@type": "@id"},
    "prefLabel" : {"@id": "http://www.w3.org/2004/02/skos/core#prefLabel", "@type": "xsd:literal"},
    "altLabel" : {"@id": "http://www.w3.org/2004/02/skos/core#altLabel", "@type": "xsd:literal"},
    "closeMatch" : {"@id": "http://www.w3.org/2004/02/skos/core#closeMatch", "@type": "@id"},
    "exactMatch" : {"@id": "http://www.w3.org/2004/02/skos/core#exactMatch", "@type": "@id"}}

  compacted = jsonld.compact(doc, context)
  print(json.dumps(compacted, indent=2))"""
 
  
else :
  print("Erreur : " + str(resp.status))
