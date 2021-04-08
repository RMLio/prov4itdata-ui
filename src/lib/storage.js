// Shorthands
const ls = localStorage;
export const STORAGE_KEYS = {
    MAPPING_CONTENT: 'MAPPING_CONTENT',
    MAPPING_URL: 'MAPPING_URL',
    EXECUTION_ATTEMPTS: 'EXECUTE_ATTEMPTS',
    EXECUTION_STATUS: 'EXECUTION_STATUS',
    AUTHORIZATION_ATTEMPTS: 'AUTHORIZATION_ATTEMPTS',
    AUTHORIZATION_STATE: 'AUTHORIZATION_STATE',
    QUERY_RESULT: 'QUERY_RESULT',
    SELECTED_PIPELINE_ID: 'SELECTED_PIPELINE_ID',
    CURRENT_PIPELINE_STEP_INDEX: 'CURRENT_PIPELINE_STEP_INDEX',
    CONFIGURATION_RECORDS: 'CONFIGURATION_RECORDS'
}
export const AUTHORIZATION_STATES = {
    AUTHORIZING: 'AUTHORIZING',
    AUTHORIZED: 'AUTHORIZED',
}
export const EXECUTION_STATES = {
    INIT: 'INIT',
    AUTHORIZING: 'AUTHORIZING',
    AUTHORIZED: 'AUTHORIZED',
    BUSY: 'BUSY',
    DONE: 'DONE',
    FAILED: 'FAILED'
}
export const MIME_TYPES = {
    APPLICATION_JSON: 'application/json'
}

const sk = STORAGE_KEYS;

class StorageObject {
    constructor(key,
                serializer=f=>f,
                deserializer=f=>f) {
        this.key = key
        this.serializer = serializer
        this.deserializer = deserializer
    }
    set(value) {
        const serializedValue = this.serializer(value);
        ls.setItem(this.key, serializedValue)
    }
    get() {return this.deserializer(ls.getItem(this.key)) }
    remove() {ls.removeItem(this.key)}
}


// Configuration
export const configurationRecords = new StorageObject(sk.CONFIGURATION_RECORDS, JSON.stringify, JSON.parse);

// Authorization
export const authorizationAttempts = new StorageObject(sk.AUTHORIZATION_ATTEMPTS, (x)=>x.toString(), (x)=>parseInt(x))

// Execution
export const executionStatus = new StorageObject(sk.EXECUTION_STATUS)

// Mapping content
export const mappingContent = new StorageObject(sk.MAPPING_CONTENT)

// Pipeline
export const pipelineId = new StorageObject(sk.SELECTED_PIPELINE_ID)

// Pipeline step
export const pipelineStep = new StorageObject(sk.CURRENT_PIPELINE_STEP_INDEX)

//
export const removePipelineVariablesFromStorage = () => {
    pipelineId.remove()
    pipelineStep.remove()
}
