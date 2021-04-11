import './App.css';
import React, {useEffect, useState} from 'react';
import 'bootstrap/dist/css/bootstrap.min.css'
import Transfer from "./components/transfer";
import {Alert, Button} from 'react-bootstrap';
import {
  getConnectionUrlForProvider,
  handleLogout,
  isProviderConnected,
  makeAlert,
  makeWarningAlert,
  readAndDecodeBody,
  tryParseJsonResponse
} from "./lib/helpers";
import CollapsibleCard from "./components/collapsible-card";
import {newEngine} from "@prov4itdata/actor-init-sparql";
import SyntaxHighlighter from "react-syntax-highlighter";
import {
  createOptionRecordsFromConfigurationRecords,
  filterRecordsByType,
  getConfigurationRecordById,
  getConfigurationRecords,
  getPipelineRecords,
  getQueryRecords,
  getStepAndReferentRecord,
  validatePipelineRecord,
  validateStepRecord
} from "./lib/configuration-helpers";

import * as storage from "./lib/storage";

import {
  fetchFromSolidPod,
  getOrEstablishSolidSession,
  handleSolidLogout,
  removeFromSolidPod,
  storeOnSolidPod
} from "./lib/solid-helpers";
import {executeQuery} from "./lib/query-helpers";
import urlJoin from "proper-url-join";
import {AUTHORIZATION_STATES, EXECUTION_STATES} from "./lib/storage";


function App() {

  let [mappingOptions, setMappingOptions] = useState()
  let [mapping, setMapping] = useState( {
    content : storage.mappingContent.get() || '',
  })

  let [selectedOptionId, setSelectedOptionId] = useState(storage.pipelineId.get())
  let [generatedOutput, setGeneratedOutput] = useState("")
  let [provenance, setProvenance] = useState("")
  let [solidData, setSolidData] = useState("")
  let [alert, _setAlert] = useState()


  /**
   * Creates an alert.
   * @param a
   * @param alertDuration (optional) time in milliseconds that the alert message will be shown
   */
  const setAlert = (a, alertDuration = undefined) => {
    _setAlert(a)
    if(alertDuration)
      setTimeout(()=>_setAlert(""), alertDuration)
  }


  // Default mapping. this is the first option that will be rendered in the mapping selector)
  const defaultMapping = {'value' : 'default', 'label' : 'Select a mapping'}
  const updateMappings = (data) => {
    // keep the default option first
    setMappingOptions([defaultMapping, ...data])
  }

  // Fetch configuration
  useEffect(()=>{
    let optionRecords = []
    const processConfiguration = async () => {
      try {
        const configurationRecords = await getConfigurationRecords();
        storage.configurationRecords.set(configurationRecords);

        optionRecords = createOptionRecordsFromConfigurationRecords(configurationRecords)
        console.log('option records: ', optionRecords)
      } catch (err) {
        console.log('Error while processing configuration! Message: ' , err);
      } finally {
        console.log('updating option records : ' , optionRecords)
        updateMappings(optionRecords)
      }

    }

    processConfiguration()

  },[])


  /**
   * Checks with the backend whether the user is connected with the given provider (i.e. whether the user has already
   * authorized the app).
   * @param provider: data provider (e.g. flickr, imgur, ...)
   * @returns {Promise<void>}
   */
  const handleProviderConnection = async (provider) => {
    console.log('@handleProviderConnection')
    const providerIsConnected = await isProviderConnected(provider)

    // If provider is not connected, notify the user about it and redirect to the provider's authorization page
    if(!providerIsConnected) {

      console.log('provider is not connected --> redirecting!')
      let connectionUrl = await getConnectionUrlForProvider(provider)
      // Notify user
      setAlert(makeAlert('info', (<p>Required to authorize with provider.
        You will automatically be redirected to the authorization page.
        Otherwise, if the redirection is being blocked by your browser,
        you can authorize manually via <a href={connectionUrl}>this link.</a></p>)))

      // Redirect automatically after timeout
      await setTimeout(()=>{
        window.location.href = connectionUrl
      }, 2500)
    }else {
      // storage.authorizationState.set(AUTHORIZATION_STATES.AUTHORIZED)
    }
  }


  /**
   * Fetches data from Solid Pod.
   * If the user is not yet logged in to the Solid Pod, the login-popup will appear.
   *
   * @param e
   * @returns {Promise<void>}
   */
  const handleSolidFetch = async () => {
    const configurationRecords = await getConfigurationRecords();
    const pipelineRecord = getConfigurationRecordById(configurationRecords, storage.pipelineId.get())
    const [solidConfiguration,] = filterRecordsByType(configurationRecords, 'solidConfiguration')
    const currentStepRecord = pipelineRecord['steps'][storage.pipelineStep.get()]
    const {output, forId} = currentStepRecord;
    const relativePath = [solidConfiguration.storageDirectory, output.result].join('/');
    await fetchFromSolidPod(relativePath,
        async (response)=>{
          const body = await readAndDecodeBody(response)
          setSolidData(body)
        },
        (err)=>{
          setAlert(makeWarningAlert('Error while fetching data from Solid pod. Message: ' + err))
        })
  }

  /**
   * Clears the current file on the Solid Pod.
   * @returns {Promise<void>}
   */
  const handleSolidClear = async () => {
    const configurationRecords = await getConfigurationRecords();
    const pipelineRecord = getConfigurationRecordById(configurationRecords, storage.pipelineId.get())
    const [solidConfiguration,] = filterRecordsByType(configurationRecords, 'solidConfiguration')
    const currentStepRecord = pipelineRecord['steps'][storage.pipelineStep.get()]
    const {output, forId} = currentStepRecord;
    const relativePath = [solidConfiguration.storageDirectory, output.result].join('/');
    await removeFromSolidPod(relativePath,
        ()=>{
          setAlert('info', 'Successfully removed file from Solid pod');
        },
        (err)=>{
          setAlert(makeWarningAlert('Error while removing file from Solid pod. Message: ' + err))
        }
    )
    setSolidData('')
  }

  const renderedAlert = alert ? <Alert variant={alert.variant} data-test="alert-box">{alert.body}</Alert> : null;

  const trackExecution = async () => {
    console.log('@trackSession')
    storage.executionStatus.set(EXECUTION_STATES.BUSY)

    const configurationRecords = storage.configurationRecords.get();
    const currentPipelineId = storage.pipelineId.get();
    const currentPipelineStep = storage.pipelineStep.get();

    console.log('conf recs: ', configurationRecords);
    console.log('current pipeline id', currentPipelineId);
    console.log('current pipeline step: ', currentPipelineStep);


  }

  // Settings card that will be added as a child to the Transfer component
  const settingsCard = (
      <CollapsibleCard header="Settings" headerId="card-header-settings">
        <Button data-test="button-logout"
            onClick={
              async ()=>{
                await handleLogout(
                  () => {
                    // Clear local storage
                    localStorage.clear();
                    // Clear cookies 🍪
                    document.cookie = ''
                    // Notify user about successful log out
                    setAlert(makeAlert('info', 'Successfully logged out'))
                  },
                  () => setAlert(makeWarningAlert('Error when logging out')))}
            }>
          Log out
        </Button>
      </CollapsibleCard>)


  // QUERY STUFF
  const engine = newEngine();
  const [query, setQuery] = useState('')
  const [queryResult, setQueryResult] = useState('')
  const [queryRecords, setQueryRecords] = useState({})
  const [queryProvenance, setQueryProvenance] = useState('')

  // Get queries from backend using side-effects.
  // This side-effect will be executed only once.
  useEffect(()=>{
    const parseQueryRecords = async () => {
      const configurationRecords = await getConfigurationRecords()
      const queryRecords = getQueryRecords(configurationRecords)
      return queryRecords
    }
    parseQueryRecords().then(setQueryRecords)
  },[])

  const queryCard = ( <CollapsibleCard id="card-query" header="Query" headerId="card-header-query">
    <>
      Query
      <SyntaxHighlighter data-test="query">{query}</SyntaxHighlighter>
      Query result
      <SyntaxHighlighter data-test="query-result">{queryResult}</SyntaxHighlighter>
      Query provenance
      <SyntaxHighlighter data-test="query-provenance">{queryProvenance}</SyntaxHighlighter>

    </>

  </CollapsibleCard>)

  // PIPELINE STUFF

  /**
   * When triggered, the content of the pipeline's first mapping will be fetched and the state variable
   * mappingContent will be updated accordingly.
   * Note: the default mapping option does not refer to a mapping and will clear the mapping content.
   * @param {*} e : event triggered when the user selected a mapping from the MappingSelector.
   */
  const handleOnPipelineSelectionChanged = async (currentPipelineId) => {
    // When changing selection, clear ui components
    setQuery('')
    setGeneratedOutput('')
    setProvenance('')
    setSelectedOptionId(currentPipelineId)
    setMapping({content:''})

    // Get & process configuration records for current selection
    const configurationRecords = await getConfigurationRecords()
    const pipelineRecordIds = getPipelineRecords(configurationRecords).map(pr=>pr.id)

    if(pipelineRecordIds.includes(currentPipelineId)) {
      storage.pipelineId.set(currentPipelineId)
      const pipelineRecord = getConfigurationRecordById(configurationRecords, currentPipelineId);
      validatePipelineRecord(pipelineRecord);

      // For now, we only consider the first step
      storage.pipelineStep.set(0);
      const currentPipelineStepindex = storage.pipelineStep.get();

      const stepRecord = pipelineRecord['steps'][currentPipelineStepindex]
      validateStepRecord(stepRecord)

      // Get the record to which forId refers
      const forId = stepRecord['forId'];
      const referentRecord = getConfigurationRecordById(configurationRecords, forId);

      // Fetch the file corresponding to the current step record
      const response = await fetch(referentRecord.file);
      const body = await readAndDecodeBody(response)

      switch (referentRecord['type']) {
        case 'mapping':
          // Update local storage
          storage.mappingContent.set(body);
          // Update ui
          setMapping({
            content:body,
            value:currentPipelineId,
            provider:referentRecord['provider']})
          break;
        case 'query':
          // Update ui
          setQuery(body)
          break;
        default:
          // TODO: default ?
      }
    }else{
      storage.removePipelineVariablesFromStorage()
    }
  }

  /**
   * Handler for executing the selected pipeline
   * TODO: support execution of multiple steps
   * @param e
   */
  const handleOnExecutePipeline =async () => {
    console.log('@handleOnExecutePipeline!!!')
    // storage.executionState.set(EXECUTION_STATES.BUSY)
    const configurationRecords = await getConfigurationRecords()

    // Get solid configuration
    const solidConfiguration = await getConfigurationRecordById(configurationRecords, 'solid-config');
    const storageDirectory = solidConfiguration['storageDirectory'];

    // Get pipeline configuration
    const currentPipelineId = storage.pipelineId.get()
    const pipelineRecord = getConfigurationRecordById(configurationRecords, currentPipelineId)

    // Step
    const currentPipelineStepIndex = storage.pipelineStep.get();
    const currentStepRecord = pipelineRecord['steps'][currentPipelineStepIndex];
    const referentRecord = getConfigurationRecordById(configurationRecords, currentStepRecord['forId'])

    const executeMappingStep = async ({provider, file}) => {
      // If provider isn't connected yet, handle that first
      const providerConnected = await isProviderConnected(provider)
      // if(!providerConnected)
      //   await handleProviderConnection(provider)

      // If Solid isn't connected yet, handle that first
      let solidSession = await getOrEstablishSolidSession();
      // if(!solidSession)
      //   await getOrEstablishSolidSession();

      // If provider connect & logged in to solid
      if(providerConnected && solidSession) {

        // Execute the mapping
        const params = {provider, file}
        const response =  await fetch('/rmlmapper', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(params)
        })

        // Parse & process result
        const parsedResponse = await tryParseJsonResponse(response)

        let alertMessages = []
        if(parsedResponse.success) {
          const {rdf, prov} = parsedResponse.body

          // Create URLs to generated result and corresponding provenance
          const outputConfiguration = currentStepRecord['output'];
          const podUrl = new URL(solidSession.webId).origin

          // Do we have RDF data?
          if(rdf) {
            setGeneratedOutput(rdf)

            // Create url to store generated result on solid pod
            const filenameResult = outputConfiguration.result;
            if(filenameResult) {
              const relativePathResult = [storageDirectory, outputConfiguration.result].join('/')
              const urlRDFData = new URL(relativePathResult, podUrl).toString()

              await storeOnSolidPod(urlRDFData,
                  rdf,
                  ()=>setAlert(makeAlert('info', 'Successfully stored generated result on Solid pod!!')),
                  (err)=>setAlert(makeWarningAlert('Error while storing result on Solid Pod'))
              )
            }else {
              setAlert(makeWarningAlert('No filepath specified for storing the generated RDF data on the Solid pod'))
            }

          }
          else alertMessages.push('Generated RDF data is empty')

          // Do we have prov data?
          if(prov) {
            setProvenance(prov)
            // Create url to store corresponding provenance data on solid pod
            const filenameProvenanceResult = outputConfiguration.provenanceResult
            if(filenameProvenanceResult) {
              const relativePathProv = [storageDirectory, filenameProvenanceResult].join('/')
              const urlProv = new URL(relativePathProv, podUrl).toString()

              await storeOnSolidPod(urlProv,
                  prov,
                  ()=>setAlert(makeAlert('info', 'Successfully stored provenance data on Solid Pod')),
                  (err)=>setAlert(makeWarningAlert('Error while storing provenance data on Solid Pod'))
              );
            }else {
              setAlert(makeWarningAlert('No filepath specified for storing the provenance data on the Solid pod'))
            }
          }
          else alertMessages.push('Provenance data is empty')

        }
        if(alertMessages.length === 0) {
          // storage.executionState.set(EXECUTION_STATES.DONE);
        }
        else {
          setAlert(makeAlert('warning', alertMessages.join('\n')))
        }
      }

      // Output
      console.log(`pipelineRecord: `, pipelineRecord);
      const pipelineOutput = pipelineRecord['output'];
      console.log('output: ', pipelineOutput)
    }

    const executeQueryStep = async(queryRecord, input, output, solidSession)=> {
      console.log('@executeQueryStep')

      const podUrl = new URL(solidSession.webId).origin

      // Fetch query
      const response = await fetch(queryRecord['file'])
      const query = await readAndDecodeBody(response)


      // Store result on Solid Pod
      // Create URLs for generated result & corresponding provenance data
      const outputConfiguration = currentStepRecord['output'];
      const relativePathResult = [storageDirectory, outputConfiguration['result']].join('/')
      const urlResult = new URL(relativePathResult, podUrl).toString()

      // Callback for the query result returned by the engine
      const onResult = async (result) => {
        setQueryResult(result)

        // Store result on the Solid Pod
        await storeOnSolidPod(urlResult,
            result,
            ()=> setAlert(makeAlert('info', 'Query result stored on Solid pod!')),
            (err)=>setAlert(makeWarningAlert(err.toString())))
      }

      // Callback for rendering the query result's metadata (if available)
      const onMetadataAvailable = async (metadata) => {
        const strQueryProvenance = JSON.stringify(metadata, null, 2)
        setQueryProvenance(strQueryProvenance)
        // TODO: Store provenance on the Solid Pod
      }



      const onError = (err) => {
        // storage.executionState.set(EXECUTION_STATES.FAILED)
        setAlert(makeWarningAlert(`Error while executing query (query id: ${queryRecord['id']})\nError: ${err}`))
      }


      // Run query
      const sources = input.map(inputFilename => urlJoin(podUrl, storageDirectory, inputFilename))
      await executeQuery(engine, query, sources, onResult,onMetadataAvailable,onError)
    }

    try {
      switch (referentRecord['type']) {
        case 'mapping':
          await executeMappingStep(referentRecord)
          break;
        case 'query':
          const {input, output} = currentStepRecord;
          await executeQueryStep(referentRecord, input, output)
          break;
        default:
          setAlert(makeWarningAlert('Unknown type of pipeline step record'))
      }
    }catch (err) {
      // storage.executionState.set(EXECUTION_STATES.FAILED)
      setAlert(makeWarningAlert('Error while executing...'))
    }

  }

  return (
    <div className="App container">
      <h1>PROV4ITDaTa-DAPSI</h1>
      {renderedAlert}
      <Transfer
          mappings={mappingOptions}
          mappingContent={mapping.content}
          selectedOptionValue={selectedOptionId}
          generatedOutput={generatedOutput}
          provenance={provenance}
          solidData={solidData}
          handleOnExecute={()=>{
            trackExecution()
          }}
          handleOnMappingChange={(e)=>{
            if(e.target.value === 'default' ) {
              // if default option selected, clear mapping & provenance
              setMapping({value:'default', content:'', provider:'' })
              setProvenance('')
            }else {
              handleOnPipelineSelectionChanged(e.target.value)
            }
          }}
          handleSolidFetch={handleSolidFetch}
          handleSolidClear={handleSolidClear}
          handleSolidLogout={handleSolidLogout}
          data-cy="transfercomp"
      >
        {queryCard}
        {settingsCard}


      </Transfer>
    </div>
  );
}

export default App;
