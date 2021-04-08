import {fetchAndParseBodyToJson} from "./helpers";
import {configurationRecords, pipelineId} from "./storage";


export const getConfigurationRecords = async () => {
    const urlConfigurationRecords = '/configuration/configuration.json'; // TODO: make configurable
    let configurationRecords = [ ];
    try {
        const body = await fetchAndParseBodyToJson(urlConfigurationRecords);
        configurationRecords = body['configurationRecords'];
    } catch (err) {
        console.error(`Error while getting configuration records from ${urlConfigurationRecords}`
         + 'Message: ', err)
    } finally {
        return configurationRecords
    }
}
export const filterRecordsByType = (records, t) => records.filter(r => r.type === t);
export const getMappingRecords = (configurationRecords) =>  filterRecordsByType(configurationRecords, 'mapping');
export const getPipelineRecords = (configurationRecords) => filterRecordsByType(configurationRecords, 'pipeline');
export const getConfigurationRecordById = (configurationRecords, id) => configurationRecords.find(cr=>cr.id === id);
export const getQueryRecords = (configurationRecords) => filterRecordsByType(configurationRecords, 'query');
export const getStepAndReferentRecord = (configurationRecords, pipelineId, stepIndex) => {

    const pipelineRecord = getConfigurationRecordById(configurationRecords, pipelineId)

    const stepRecord = pipelineRecord['steps'][stepIndex];
    const referentRecord = getConfigurationRecordById(configurationRecords, stepRecord['forId']);
    return {
        stepRecord,
        referentRecord
    }
}
export const validatePipelineRecord = (record) => {
    if(!record['steps'])
        throw Error('"steps" property not present in pipeline record!' +
            'A pipeline record must contain the "steps"-property!')

    if(record['steps'].length<1)
        throw Error('Empty list of steps! ' +
            'A pipeline record should contain atleast 1 step record!')
}

export const validateStepRecord = (record) => {
    const requiredProperties = ['type', 'forId', 'output'];
    requiredProperties.forEach(rp => {
        if(!record[rp])
            throw new Error(`Required property "${rp}" not present in current step record: ${record}`)
    })
}



export function createOptionRecordsFromConfigurationRecords(configurationRecords) {
    const mappingRecords = getMappingRecords(configurationRecords);
    const pipelineRecords = getPipelineRecords(configurationRecords);

    return pipelineRecords.map(plr => {

        // Note:
        // Pipeline records contain 1 or more steps.
        // For now, we only use the first step (which is a mapping) of the pipeline,
        // because the user has to be able to inspect the mapping and the UI's first design only accounted for 1 mapping
        const stepRecord = plr['steps'][0];

        return {
            value: plr['id'],
            label: plr['description']
        }
    })
}

