import {getOrEstablishSolidSession} from "./solid-helpers";

export const executeQuery = async (engine,
                                   query,
                                   sources,
                                   onResult = f=>f,
                                   onMetadataAvailable = f=>f,
                                   onError = f=>f,
) => {
    console.log('@executeQuery');
    console.log('query to execute: ', query);
    console.log('sources to query: ', sources);

    try {
        const solidSession = await getOrEstablishSolidSession();
        if(!solidSession)
            throw Error('Not logged in to Solid Pod!')

        const queryResult = await engine.query(query, {sources})
        if(queryResult) {
            // Process metadata, if any
            if(queryResult.metadata) {
                const metadata = await queryResult.metadata();
                onMetadataAvailable(metadata)
            }

            // Process the actual query result data
            const resultStream = await engine.resultToString(queryResult)
            resultStream.data.setEncoding('utf-8')

            // Collect chunks of data
            let chunks = []
            resultStream.data.on('data', (chunk)=> {
                chunks.push(chunk)
            })
            // When all chunks are collected, invoke callback with stringified result
            resultStream.data.on('end', ()=>{
                const strResult = chunks.join('')
                onResult(strResult)
            })
        }
        else {
            throw Error('No query result');
        }
    }catch (err) {
        onError(err)
    }


}
