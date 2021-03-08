export const queryRecords = {
    "construct_image_triples": {
        "description": "Construct image triples",
        "query":
            `
             PREFIX schema: <http://schema.org/> 
            PREFIX dcat: <http://www.w3.org/ns/dcat#> 
            
            CONSTRUCT { ?s ?p ?o .   } WHERE { 
                {
                    ?s ?p ?o .
                    FILTER EXISTS { ?s a schema:ImageObject}
                }
                UNION
                {
                    ?s ?p ?o .
                    FILTER EXISTS { ?s a dcat:Distribution}
                }
            
            }
            `
    },
    "construct_image_collections": {
        "description": "Construct image collections",
        "query":
            `
            PREFIX schema: <http://schema.org/> 
            PREFIX dcat: <http://www.w3.org/ns/dcat#> 
            
            CONSTRUCT { ?s ?p ?o .   } WHERE { 
                {
                    ?s ?p ?o .
                    FILTER EXISTS { ?s a schema:ImageGallery}
                }
                UNION
                {
                    ?s ?p ?o .
                    FILTER EXISTS { ?s a dcat:Catalog}
                }
            }
            `

    }
}
