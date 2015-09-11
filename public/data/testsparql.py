"""
Pour Python 3.3
"""

import http.client as client
import urllib.parse as parse
import json

hostName = "194.250.19.133:9091"
headers = {"Accept" : "application/json"}

queryString = """ PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
  PREFIX mimo-gr: <http://194.250.19.133:9091/mimo>
  SELECT DISTINCT ?concept ?prefLabel 
  FROM mimo-gr:
  WHERE {
    ?concept rdf:type skos:Concept .
    OPTIONAL { ?concept skos:prefLabel+ ?prefLabel } .
  }
  ORDER BY ?concept
  LIMIT 100
"""

params = {"query" : queryString}
encodedQuery = parse.urlencode(params)

connection = client.HTTPConnection(hostName)
connection.request("GET","/sparql?" + encodedQuery, "", headers)

resp = connection.getresponse()
print ("Content-type: text/html")
print()
print("<HTML>")
print("<HEAD>")
print("</HEAD>")
print("<BODY>")
print("yo")
print("</BODY>")
print("</HTML")



if resp.status == client.OK :
        respAsString = bytes.decode(resp.read())
        jsonData = json.JSONDecoder().decode(respAsString)
        for binding in jsonData["results"]["bindings"] :
                print (binding)
                #dep = binding["nom"]["value"]
                #pop = binding["population"]["value"]
                #print("Nom : %s ; Population : %s" %(dep,pop))
else :
        print("Erreur : " + str(resp.status))
