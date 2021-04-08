// export function createOptionRecordsFromMetaData(mappingMeta) {
//     // Get & flatten the values of the mappingMeta data (keys point to data providers, such as flickr, imgur, ...).
//     // Then, add a 'value'-key to every mapping and set its value to the filename
//     return Object.entries(mappingMeta).flatMap((entry) => {
//         let [k, records] = entry
//         return records.map((r) => { return { ...r, value: `rml/${k}/${r.filename}` } })
//     })
// }
//
//
