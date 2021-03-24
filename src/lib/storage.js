import {STORAGE_KEYS} from "./helpers";

export const setSelectedPipeline = (value) => localStorage.setItem(STORAGE_KEYS.SELECTED_PIPELINE_ID, value)
export const getSelectedPipeline = () => localStorage.getItem(STORAGE_KEYS.SELECTED_PIPELINE_ID)

