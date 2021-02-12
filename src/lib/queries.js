export const queryRecords = {
    "get_containers" :
        {
            "description" : "Get container resources",
            "query" :
                `PREFIX ldp: <http://www.w3.org/ns/ldp#> 
                        SELECT ?s WHERE { ?s a ldp:Container . }`
        },
    "get_turtle_resources" :
        {
            "description" : "Get turtle resources",
            "query" :  `PREFIX tur: <http://www.w3.org/ns/iana/media-types/text/turtle#> 
                         SELECT ?s WHERE { ?s a tur:Resource . }`
        },
    "get_all_triples" :
        {
            "description" : "Get all triples",
            "query" :  `SELECT ?s ?p ?o WHERE { ?s ?p ?o . }`
        },
    "get_schema_images" :
        {
            "description" : "Get schema.org Image resources",
            "query" :
                `
                PREFIX schema: <http://schema.org/> 
                SELECT ?s ?imageUrl WHERE { 
                    ?s a schema:ImageObject .
                    OPTIONAL{ ?s schema:image ?imageUrl . } 
                }`
        },
    "get_schema_image_galleries" :
        {
            "description" : "Get schema.org ImageGallery resources",
            "query" :
                `
                PREFIX schema: <http://schema.org/> 
                SELECT ?s  WHERE { 
                    ?s a schema:ImageGallery . 
                }`
        },
}
