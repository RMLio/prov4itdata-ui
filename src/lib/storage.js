// Shorthands
const ls = localStorage;
export const STORAGE_KEYS = {
    MAPPING_CONTENT: 'MAPPING_CONTENT',
    MAPPING_URL: 'MAPPING_URL',
    MAPPING_PROVIDER: 'MAPPING_PROVIDER',
    EXECUTION_ATTEMPTS: 'EXECUTE_ATTEMPTS',
    EXECUTION_STATUS: 'EXECUTION_STATUS',
    AUTHORIZATION_ATTEMPTS: 'AUTHORIZATION_ATTEMPTS',
    AUTHORIZATION_STATE: 'AUTHORIZATION_STATE',
    QUERY_RESULT: 'QUERY_RESULT',
    SELECTED_PIPELINE_ID: 'SELECTED_PIPELINE_ID',
    CURRENT_PIPELINE_STEP_INDEX: 'CURRENT_PIPELINE_STEP_INDEX',
    CONFIGURATION_RECORDS: 'CONFIGURATION_RECORDS',
    EXECUTION_ITERATOR_INDEX: 'EXECUTION_ITERATOR_INDEX',
    EXECUTION_ITERATION : 'EXECUTION_ITERATION',
    PRECONDITION_CHECK_ITERATION: 'PRECONDITION_CHECK_ITERATION',
    PIPELINE_STEP_RECORD: 'PIPELINE_STEP_RECORD'
}
export const AUTHORIZATION_STATES = {
    AUTHORIZING: 'AUTHORIZING',
    AUTHORIZED: 'AUTHORIZED',
}
export const EXECUTION_STATES = {
    INIT_EXECUTION: 'INIT_EXECUTION',
    AUTHORIZING: 'AUTHORIZING',
    AUTHORIZED: 'AUTHORIZED',
    PRECONDITION_CHECKS: 'PRECONDITION_CHECKS',
    EXECUTING: 'EXECUTING',
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
export const executionIteratorIndex = new StorageObject(sk.EXECUTION_ITERATOR_INDEX,
    (x)=>x.toString(), (x)=>parseInt(x))
export const preconditionCheckIteration = new StorageObject(sk.PRECONDITION_CHECK_ITERATION, JSON.stringify, JSON.parse)
// Mapping content
export const mappingContent = new StorageObject(sk.MAPPING_CONTENT)
// Mapping provider
export const mappingProvider = new StorageObject(sk.MAPPING_PROVIDER)

// Pipeline
export const pipelineId = new StorageObject(sk.SELECTED_PIPELINE_ID)

// Pipeline step
export const pipelineStep = new StorageObject(sk.CURRENT_PIPELINE_STEP_INDEX)

//
export const removePipelineVariablesFromStorage = () => {
    pipelineId.remove()
    pipelineStep.remove()
}
