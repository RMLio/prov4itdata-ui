import auth from "solid-auth-client";

export const STORAGE_KEYS = {
    MAPPING_CONTENT: 'MAPPING_CONTENT',
    MAPPING_URL: 'MAPPING_URL',
    EXECUTION_ATTEMPTS: 'EXECUTE_ATTEMPTS'
}

export const handleSolidLogout = async () =>  {
    console.log('@handleSolidLogout')
    try {
        await auth.logout();
    }catch (e) {
        console.error('Error while logging out from Solid')
    }
}
export const handleSolidLogin = async () => {
    let session = await auth.currentSession();

    // Let the user log in when that wasn't the case already.
    if (!session) {
        // Not logged on to Solid
        const popupUri = 'https://solidcommunity.net/common/popup.html';
        session = await auth.popupLogin({popupUri})
    }
    return session
}

/**
 * Makes sure that the user has logged into the Solid Pod.
 * Afterwards, it handles the Solid operation specified by solidFetchParams.
 * Upon success, the resulting response will be passed on to onSuccess
 * @param solidFetchParams
 * @param onSuccess
 * @returns {Promise<void>}
 */
export const handleSolidOperation = async (solidFetchParams, onSuccess, onError) => {
    let session = await handleSolidLogin();

    try {

        if (!session)
            throw 'You are not logged in to your Solid Pod.'

        const mappingUrl = localStorage.getItem(STORAGE_KEYS.MAPPING_URL)
        const provider = mappingUrl ? extractProviderFromMappingUrl(mappingUrl) : undefined
        if (!provider)
            throw 'Mapping provider not specified';

        // Obtain the Solid Configuration (i.e. storage location for the current provider)
        const solidConfig = await getSolidConfiguration(provider)

        // Construct the URL of the file we want to fetch from the Solid Pod
        const podUrl = new URL(session.webId).origin
        const relativePath = [solidConfig.storageDirectory, solidConfig.filename].join('/')
        const url = new URL(relativePath, podUrl).toString()

        // Process response
        const response = await auth.fetch(url, solidFetchParams)
        if (response.status === 200)
            onSuccess(response)
        else {
            const errMessage = `Request unsuccesful! Status (${response.status}): ${response.statusText}`;
            throw errMessage;
        }

    } catch (e) {
        onError(e)
    }
}

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
    const response = await fetch(url, {
        method: 'GET',
    })

    if (response.ok && response.status === 200) {
        const body = await readAndDecodeBody(response)
        const status = JSON.parse(body)
        return status.connected;
    } else {
        console.error("Error: response NOT OK: ", response)
        return false;
    }
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
        method: 'GET',
    })

    if (response.ok && response.status === 200) {
        const connectData = await readAndDecodeBody(response)
        return JSON.parse(connectData).url;
    } else {
        console.error("Error: response NOT OK: ", response)
        return null;
    }
}

/**
 * Gets Solid Configuration for the given provider from the backend.
 * @param provider
 * @returns {Promise<null|any>}
 */
export async function getSolidConfiguration(provider) {
    const url = `/configuration/${provider}/solid`
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })

    if (response.ok) {
        const conf = await readAndDecodeBody(response)
        return JSON.parse(conf);
    } else {
        console.error("Error: response NOT OK: ", response)
        return null;
    }
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

export const handleResponse = (response, onSuccess, onError) =>  {
    if(response.status === 200)
        onSuccess(response)
    else
        onError(response)
}

/**
 * Executes POST request to /logout endpoint on backend.
 * @param onSuccess: callback
 * @param onError: callback
 * @returns {Promise<void>}
 */
export const handleLogout = async (onSuccess, onError) =>  {
    const response = await fetch('/logout', {method:'POST'})
    handleResponse(response, onSuccess, onError)
}
