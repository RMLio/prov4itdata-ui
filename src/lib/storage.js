import {STORAGE_KEYS} from "./helpers";

// Shorthands
const ls = localStorage;
const sk = STORAGE_KEYS;

// Pipeline
export const setSelectedPipeline = (value) => ls.setItem(sk.SELECTED_PIPELINE_ID, value)
export const getSelectedPipeline = () => ls.getItem(sk.SELECTED_PIPELINE_ID)
export const removeSelectedPipeline = () =>  ls.removeItem(sk.SELECTED_PIPELINE_ID);


// Pipeline step
export const setCurrentPipelineStep = (stepIndex) => ls.setItem(sk.CURRENT_PIPELINE_STEP_INDEX, stepIndex);
export const getCurrentPipelineStep = () => ls.getItem(sk.CURRENT_PIPELINE_STEP_INDEX);
export const removeCurrentPipelineStep = () => ls.removeItem(sk.CURRENT_PIPELINE_STEP_INDEX)

//
export const removePipelineVariablesFromStorage = () => {
    removeSelectedPipeline();
    removeCurrentPipelineStep();
}
