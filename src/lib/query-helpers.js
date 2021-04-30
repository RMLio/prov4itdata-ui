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
                // The metadata needs some preprocessing first
                console.log('preprocessing metadata!')
                const processedMetadata = await processQueryResultMetadata(queryResult)
                console.log('preprocessed metadata:  ', processedMetadata)
                onMetadataAvailable(processedMetadata)
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

/**
 * Returns promise to the processed metadata of the query result
 * @param queryResult: query result from the comunica engine
 * @returns {Promise<{}>}
 */
const processQueryResultMetadata = async (queryResult) => {

    return new Promise(async (resolve, reject)=>{
        try {
            if (queryResult.metadata) {
                // Extract metadata from query result
                const metadataPromise = await queryResult.metadata();

                // Helper for processing an observation record.
                const processObservationRecord = async (or) => {
                    const metadata = await or.metadata()

                    // Following keys are excluded to reduce verbosity
                    const actionKeysToExclude = ['context']
                    actionKeysToExclude.forEach(k => {
                        delete or.action[k]
                    })

                    return  {
                        ...or,
                        metadata,
                    }
                }

                const { observationRecords } = metadataPromise;
                // skip first observation record (duplicate)
                const [_,...processedObservationRecords] = await Promise.all(observationRecords.map(processObservationRecord));

                // Update metadata with processed observation records
                const result = {
                    result : {
                        ...metadataPromise,
                        observationRecords: processedObservationRecords
                    }
                }

                // Resolve the promise
                resolve(result)
            }
        } catch (err) {
            reject(err)
        }
    })
}
