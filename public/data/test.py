"""import sparql
 

#q = ('SELECT DISTINCT ?station, ?orbits WHERE { '
#     '?station a <http://dbpedia.org/ontology/SpaceStation> . '
#     '?station <http://dbpedia.org/property/orbits> ?orbits . '
#     'FILTER(?orbits > 50000) } ORDER BY DESC(?orbits)')
#result = sparql.query('http://dbpedia.org/sparql', q)

q = ('PREFIX skos: <http://www.w3.org/2004/02/skos/core#>'
	'SELECT distinct * '
	'WHERE { '
		'GRAPH <http://194.250.19.133:9091/mimo> '
			'{ ?concept skos:topConceptOf <http://www.mimo-db.eu/InstrumentsKeywords> . }'
	'}'
	' LIMIT 1000')
result = sparql.query('http://194.250.19.133:9091/sparql', q)

for row in result:
    print(row)"""








from SPARQLWrapper import SPARQLWrapper, JSON
 
sparql = SPARQLWrapper("http://194.250.19.133:9091/sparql")
sparql.setQuery("""
  PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
  PREFIX mimo-gr: <http://194.250.19.133:9091/mimo>
  PREFIX mimo: <http://www.mimo-db.eu/InstrumentsKeywords>
  SELECT distinct ?concept ?prefLabel ?altLabel
  FROM mimo-gr: 
  WHERE 
  { 
    ?concept skos:topConceptOf mimo: . 
    ?concept skos:prefLabel ?prefLabel .
    FILTER (lang(?prefLabel) = "en")
  }
  ORDER BY ?prefLabel
  LIMIT 100
""")
sparql.setReturnFormat(JSON)
results = sparql.query().convert()
 
for result in results["results"]["bindings"]:
    print(result["prefLabel"]["value"], result["concept"]["value"])



