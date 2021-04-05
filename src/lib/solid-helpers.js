import auth from "solid-auth-client";

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
