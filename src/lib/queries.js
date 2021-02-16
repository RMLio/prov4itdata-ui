export const queryRecords = {
        "construct_image_triples": {
        "description" : "Construct image triples",
        "query":
            `
            PREFIX schema: <http://schema.org/> 
            PREFIX dcat: <http://www.w3.org/ns/dcat#> 
            
            CONSTRUCT { ?s ?p ?o .   } WHERE { 
                {
                    ?s rdf:type schema:ImageObject .
                    BIND(rdf:type AS ?p)
                    BIND(schema:ImageObject as ?o)
                }
                UNION
                {
                    ?s rdf:type dcat:Distribution .
                    BIND(rdf:type AS ?p)
                    BIND(dcat:Distribution as ?o)
                }
            
            }
            `
    }
}
