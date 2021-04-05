import {fetchAndParseBodyToJson} from "./helpers";


export const getConfigurationRecords = async () => (await fetchAndParseBodyToJson('/configuration/configuration.json'))['configurationRecords'];
export const filterRecordsByType = (records, t) => records.filter(r => r.type === t);
export const getMappingRecords = (configurationRecords) =>  filterRecordsByType(configurationRecords, 'mapping');
export const getPipelineRecords = (configurationRecords) => filterRecordsByType(configurationRecords, 'pipeline');
export const getConfigurationRecordById = (configurationRecords, id) => configurationRecords.find(cr=>cr.id === id);

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

        if(stepRecord.type !== 'mappingConfiguration')
            throw Error(`The first step of the pipeline should be of type mappingConfiguration, got ${stepRecord.type}`)

        // Find the mapping record to which is referred
        const mappingRecord = mappingRecords.find(mr => mr.id === stepRecord['forId'])

        return {
            value: plr['id'],
            label: plr['description']
        }
    })
}

