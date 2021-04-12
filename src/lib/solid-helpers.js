import auth from "solid-auth-client";
import SolidFileClient from "solid-file-client";

import {tryParseJsonResponse} from "./helpers";

export const getSolidSession = async () => {
    const session = await auth.currentSession();
    return session;
}

export const getOrEstablishSolidSession = async () => {
    let session = await auth.currentSession();

    // Let the user log in when that wasn't the case already.
    if (!session) {
        // TODO: add idp to configuration!!!
        // Not logged on to Solid
        const popupUri = 'https://solidcommunity.net/common/popup.html';
        session = await auth.popupLogin({popupUri})
    }
    return session
}

export const handleSolidLogout = async () =>  {
    console.log('@handleSolidLogout')
    try {
        await auth.logout();
    }catch (e) {
        console.error('Error while logging out from Solid')
    }
}


export const storeOnSolidPod = async (url, data, onSuccess=f=>f,onError=f=>f) => {
    const params = {
        method : 'PATCH',
        body : `INSERT DATA {${data}}`,
        headers : {
            'Content-Type': 'application/sparql-update'
        }
    }

    try {
        const response = await auth.fetch(url, params)
        if(response.status === 200)
            onSuccess(response)
    }catch (err) {
        onError(err)
    }
}

/**
 * Stores the provided content as a file on the Solid Pod.
 * @param url
 * @param content
 * @param contentType
 * @param onSuccess
 * @param onError
 * @returns {Promise<void>}
 */
export const storeFileOnSolidPod = async (url, content, contentType, onSuccess=f=>f, onError=f=>f) => {
    const fc = new SolidFileClient(auth);
    try {
        const response = await fc.postFile(url, content, contentType);
        onSuccess()
    }
    catch (err) {
        onError(err)
    }
}

/**
 * Handles operation on file specified by the path relative to the origin of the Solid pod.
 * Makes sure that the user has logged into the Solid Pod.
 * Afterwards, it handles the Solid operation specified by params.
 * Upon success, the resulting response will be passed on to onSuccess
 * @param params
 * @param onSuccess
 * @param onError
 * @returns {Promise<void>}
 */
export const handleSolidOperation = async (relativePath,params={}, onSuccess=f=>f,onError=f=>f) => {
    try {
        const s = await getOrEstablishSolidSession();
        if(s) {
            const origin = new URL(s.webId).origin.toString()
            const url = new URL(relativePath, origin).toString()
            const result = await auth.fetch(url, params)
            onSuccess(result)
        } else {
            throw Error('Not logged in to Solid pod')
        }
    }catch (err) {
        onError(err)
    }
}

export const fetchFromSolidPod = async (relativePath, onSuccess=f=>f,onError=f=>f) => {
    await handleSolidOperation(relativePath, {method:'GET'},onSuccess, onError)
}

export const removeFromSolidPod = async (relativePath, onSuccess=f=>f,onError=f=>f) => {
    await handleSolidOperation(relativePath, {method:'DELETE'},onSuccess, onError)
}

