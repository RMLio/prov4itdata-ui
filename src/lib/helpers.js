import auth from "solid-auth-client";
import {filterRecordsByType, getConfigurationRecords} from "./configuration-helpers";
import {getOrEstablishSolidSession} from "./solid-helpers";
import {MIME_TYPES} from "./storage";


/**
 * Reads response as a stream & return decoded result.
 * @param response
 * @returns {Promise<string>}
 */
export async function readAndDecodeBody(response) {
    // Set up a StreamReader and UTF8 decoder
    const reader = response.body.getReader()
    const utf8Decoder = new TextDecoder("utf-8")

    // Read, decode, repeat
    var {done, value} = await reader.read()
    var decodedData = utf8Decoder.decode(value)

    // Return decoded data
    return decodedData
}


/**
 *
 * @param {*} metaData
 */
export function createOptionRecordsFromMetaData(mappingMeta) {
    // Get & flatten the values of the mappingMeta data (keys point to data providers, such as flickr, imgur, ...).
    // Then, add a 'value'-key to every mapping and set its value to the filename
    return Object.entries(mappingMeta).flatMap((entry) => {
        let [k, records] = entry
        return records.map((r) => {
            return {...r, value: `rml/${k}/${r.filename}`}
        })
    })
}



/**
 * Executes POST request to the backend for executing the RML Mapping referred to by urlMapping
 * @param {*} urlMapping : url of the RML Mapping
 */
export async function executeMappingOnBackend(provider, filename, onSuccess = f => f, onError = f => f) {
    const url = `/rmlmapper/${provider}/${filename}`

    console.log("@executeMappingOnBackend. POST ", url)

    fetch(url,
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(onSuccess)
        .catch(onError)
}

/**
 * Checks the backend for connection with the given provider.
 * @param provider
 * @returns {Promise<boolean|*>}
 */
export async function isProviderConnected(provider) {
    console.log("@isProviderConnected")
    const url = `/status/${provider}/connected`

    let isConnected = false;

    const parsedResponse = await tryParseJsonResponse(await fetch(url))
    if (parsedResponse.success && parsedResponse.body.hasOwnProperty('connected'))
        isConnected = parsedResponse.body.connected
    else
        console.error('Error while processing response body. Error: ', parsedResponse.reason)

    return isConnected
}

/**
 * Try to parse
 * @param input
 * @param options
 * @returns {Promise<{success: boolean, body: any}|{reason, success: boolean}>}
 */
export async function tryParseJsonResponse(response) {
    console.log('@tryParseJsonResponse (url: ', response.url);

    let result = {}
    try {
        const body = await response.json()
        result = {...result,
            success: true,
            body
        }
    } catch (err) {
        // Add error message as reason to the result
        result = {...result,
            success: false,
            reason: err.message
        }
    }

    return result
}

/**
 * Gets the connection url for the given provider from the backend.
 * @param provider
 * @returns {Promise<null|*>}
 */
export async function getConnectionUrlForProvider(provider) {
    console.log("@getConnectionUrlForProvider -- provider: ", provider)
    const url = `/configuration/${provider}/connect`
    const response = await fetch(url, {
        headers: {
            'Content-Type': MIME_TYPES.APPLICATION_JSON
        }
    })

    // Parse JSON response
    const parsedResponse = await tryParseJsonResponse(response)

    let connectionUrl = null
    // If the response was successful, and it contains a body object with an url, return that url.
    if (parsedResponse.success && parsedResponse.body && parsedResponse.body.hasOwnProperty('url'))
        connectionUrl = parsedResponse.body.url
    else {
        console.error('Error while getting the connection url')
    }

    return connectionUrl
}

/**
 *
 * @param url
 * @returns {Promise<null>}
 */
export async function fetchAndParseBodyToJson(url) {
    const response = await fetch(url, {
        headers: {
            'Content-Type': 'application/json'
        }
    })

    const parsedResponse = await tryParseJsonResponse(response)
    let jsonResponse = null
    if(parsedResponse.success)
        jsonResponse = parsedResponse.body
    else {
        console.error('Error while parsing JSON Response. Reason: ', parsedResponse.reason)
    }
    return jsonResponse
}
/**
 * Gets Solid Configuration for the given provider from the backend.
 * @param provider
 * @returns {Promise<null|any>}
 */
export async function getSolidConfiguration(provider) {
    const url = `/configuration/${provider}/solid`
    return await fetchAndParseBodyToJson(url);
}

export function makeAlert(variant, body) {
    return {variant, body}
}

export function makeWarningAlert(body) {
    return makeAlert('warning', body)
}

/**
 * This function extracts  & returns the provider from the mapping url.
 * Null is returned when unable to extract the provider.
 * @param mappingUrl: expects urls like: /rml/<provider>/<filename.ttl>
 */
export const extractProviderFromMappingUrl = (mappingUrl) => {
    if (!mappingUrl)
        throw 'MappingUrl is undefined!'

    const parts = mappingUrl.split('/')
    if (parts.length >= 2) {
        const [provider,] = parts.splice(-2);
        return provider;
    } else
        throw 'Cannot extract provider from mappingUrl!'
}


/**
 * Executes POST request to /logout endpoint on backend.
 * @param onSuccess: callback
 * @param onError: callback
 * @returns {Promise<void>}
 */
export const handleLogout = async (processBody, onError) => {
    const response = await fetch('/logout', {method: 'POST'})
    const parsedResponse = await tryParseJsonResponse(response)
    if (!parsedResponse.success)
        onError(parsedResponse.reason)
}

export const handleQuery = async (engine, query, sources) => {

    const s = await auth.currentSession();

    if(s) {

        const params = {
            sources
        }
        console.log('params: ', params)

        // Execute query & return promise to query result
        return await engine.query(query, params)



    }else {
        console.log('NOT LOGGED IN TO SOLID... CANT QUERY !')
        await getOrEstablishSolidSession()
    }

}

/**
 * Query Solid pod for intermediate datasets
 *
 * @param s: Solid Session
 * @param engine: Comunica Query Engine
 * @returns {Promise<[]>}
 */
const getRelativePathsOfIntermediateDatasets = async () => {
    console.log('@getRelativePathsOfIntermediateDatasets')
    const transferConfiguration = await getTransferConfiguration();
    if(!transferConfiguration)
        throw Error('Transfer configuration is undefined');
    // Map every provider in the transfer configuration to the relative path of its dataset file
    let relativeFilePaths = Object.keys(transferConfiguration).filter(k => k!= 'solid')
        .map(provider => transferConfiguration[provider]['solid']['filename'])
        .map(filename => `${transferConfiguration['solid']['storageDirectory']}/${filename}`);
    return relativeFilePaths
}

/**
 * Runs query on intermediate datasets on the Solid pod
 * @param engine
 * @param query
 * @param onResult: callback to be executed on the stringified result
 * @returns {Promise<void>}
 */
export const runQuery = async (engine, query, onResult, onMetadataAvailable, onError)=>{
    try {
        const solidSession = await auth.currentSession()
        if(!solidSession){
            onError('Not logged in to Solid');
            await getOrEstablishSolidSession()
        }
        else {
            // Get the relative paths from transfer configuration
            const relativePaths =   await getRelativePathsOfIntermediateDatasets()
            // Resolve relative paths relative to the origin of the current Solid Pod
            const originSolidPod = new URL(solidSession.webId).origin;
            const sources = relativePaths.map(rp => new URL(rp, originSolidPod)).map(url=>url.toString())
            // Execute Query
            const queryResult = await handleQuery(engine, query, sources)

            // Process result
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
        }
    }catch (err) {
        onError(err)
    }
}
export const storeRDFDataOnSolidPod = async (data, relativeFilepath, onSuccess = f=>f, onError = f=>f) => {
    try {
        const solidSession = await auth.currentSession()
        if(solidSession){
            const podUrl = new URL(solidSession.webId).origin
            const url = new URL(relativeFilepath, podUrl).toString();

            const params = {
                method : 'PATCH',
                body : `INSERT DATA {${data}}`,
                headers : {
                    'Content-Type': 'application/sparql-update'
                }
            }

            const response = await auth.fetch(url, params)
            if (response.status === 200)
                onSuccess(response)
            else {
                const errMessage = `Unable to store data on Solid Pod! (${response.status}): ${response.statusText}`;
                throw Error(errMessage);
            }
        }else {
            throw Error('Not Logged on to Solid');
        }
    }catch (err) {
        onError(err)
    }


}
export const getTransferConfiguration = async () => {
    const configurationRecords = await getConfigurationRecords()
    const solidConfigurationRecord = filterRecordsByType(configurationRecords, 'solidConfiguration')
    return {}
}




