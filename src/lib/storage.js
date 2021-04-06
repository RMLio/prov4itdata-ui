import {STORAGE_KEYS} from "./helpers";

// Shorthands
const ls = localStorage;
const sk = STORAGE_KEYS;
class StorageObject {
    constructor(key) {
        this.key = key
    }
    set(value) {ls.setItem(this.key, value)}
    get() {return ls.getItem(this.key)}
    remove() {ls.removeItem(this.key)}
}

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
