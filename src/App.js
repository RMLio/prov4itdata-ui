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
import {EXECUTION_STATES} from "./lib/storage";

import {
  fetchFromSolidPod,
  getOrEstablishSolidSession,
  getSolidSession,
  handleSolidLogout,
  removeFromSolidPod, storeFileOnSolidPod,
  storeOnSolidPod
} from "./lib/solid-helpers";
import {executeQuery} from "./lib/query-helpers";
import urlJoin from "proper-url-join";


function App() {

  let [mappingOptions, setMappingOptions] = useState()
  let [mapping, _setMapping] = useState( {
    content : storage.mappingContent.get() || '',
    provider: storage.mappingProvider.get() || ''
  })

  const setMapping = ({content, value, provider}) => {
    console.log('setMapping: ', value)
    // Update local storage
    storage.mappingContent.set(content);
    storage.pipelineId.set(value)
    storage.mappingProvider.set(provider)

    // Update state
    _setMapping({content, value, provider})
  }

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
        const errMsg = 'Error while processing configuration! Message: '  + err;
        console.error(errMsg)
        setAlert(makeWarningAlert(errMsg))
      } finally {
        console.log('updating option records : ' , optionRecords)
        if(optionRecords.length === 0) {
          console.log('option records zero')
          setAlert(makeWarningAlert('Error: no options to select from.'))
        }
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

  // Settings card that will be added as a child to the Transfer component
  const settingsCard = (
      <CollapsibleCard header="Settings" headerId="card-header-settings">
        <Button data-test="button-logout"
            onClick={
              async ()=>{

                // Logout: Solid
                await handleSolidLogout()

                // Logout: backend
                await handleLogout(
                  () => {
                    // Clear local storage
                    localStorage.clear();
                    // Clear cookies ????
                    document.cookie = ''
                    // Notify user about successful log out
                    setAlert(makeAlert('info', 'Successfully logged out'))
                  },
                  () => setAlert(makeWarningAlert('Error when logging out')))

              }
            }>
          Log out
        </Button>
      </CollapsibleCard>)


  // QUERY STUFF
  const engine = newEngine();
  const [query, setQuery] = useState('')
  const [queryResult, setQueryResult] = useState('')
  const [queryProvenance, setQueryProvenance] = useState('')

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

  ///////////////////////////////////////////////////////////////////////////
  // ************ EXECUTION TRACKING  *******************

  //////////////////
  // State variables

  // Execution status
  const [executionStatus, _setExecutionStatus] = useState(storage.executionStatus.get());
  const setExecutionStatus = (status) => {
    storage.executionStatus.set(status);
    _setExecutionStatus(status);
  }

  // Execution iteration: contains the index and number of retries
  const [preconditionCheckIterations, _setPreconditionCheckIterations] = useState(storage.preconditionCheckIteration.get())
  const setPreconditionCheckIterations = (it) => {
    storage.preconditionCheckIteration.set(it);
    _setPreconditionCheckIterations(it)
  }

  // Iteration Items (functions)
  const [iterationPreconditionFunctions, setIterationItems] = useState();

  // Execution Status side-effect
  useEffect(() => {
    function preconditionChecks() {
      const configurationRecords = storage.configurationRecords.get();
      const currentPipelineId = storage.pipelineId.get();
      const currentPipelineStep = storage.pipelineStep.get();

      if(!configurationRecords) {
        console.error('Configuration records are undefined!')
        return;
      }

      if(!currentPipelineId) {
        console.error('Current pipeline id is undefined!')
        return;
      }

      if(!currentPipelineStep) {
        console.error('Current pipeline step id is undefined!')
        return;
      }


      const {referentRecord} = getStepAndReferentRecord(configurationRecords, currentPipelineId, currentPipelineStep)
      console.log('referent record: ' , referentRecord)
      // Precondition check functions
      // Solid
      const checkSolidConnection = async () => {
        console.log('@iterationPreconditionFunction: solid');
        const isSolidConnected = await getSolidSession();

        return !!isSolidConnected
      }
      const establishSolidConnection = async ()=> {
        await getOrEstablishSolidSession();
      }

      // Provider
      const checkProviderConnection = async () => {
        const provider = storage.mappingProvider.get()
        if(!provider)
          return false
        console.log('@iterationPreconditionFunction: provider: ', provider);
        const providerConnected = await isProviderConnected(provider);
        return providerConnected
      }
      const establishProviderConnection = async () => {
        const provider = storage.mappingProvider.get()
        if(!provider)
          throw Error('Provider is undefined!')
        console.log('establishing provider connection with: ' ,provider)
        await handleProviderConnection(provider)
      }

      switch (referentRecord['type']) {
        case 'mapping':
          if(!iterationPreconditionFunctions) {
            console.log('iterationItems undefined, ... initializing now');
            const items = [
              {
                checkPrecondition: checkSolidConnection,
                establishPrecondition: establishSolidConnection
              },
              {
                checkPrecondition: checkProviderConnection,
                establishPrecondition: establishProviderConnection
              }
            ]
            setIterationItems(items);
          }

          setPreconditionCheckIterations({index:0, retries: 0})
          break;

        case 'query':
          if(!iterationPreconditionFunctions) {
            console.log('iterationItems undefined, ... initializing now');
            const items = [
              {
                checkPrecondition: checkSolidConnection,
                establishPrecondition: establishSolidConnection
              }
            ]
            setIterationItems(items);
          }

          setPreconditionCheckIterations({index:0, retries: 0})
          break;
        default:
          throw Error('Unknown step record type: ' , referentRecord['type'])
      }

    }

    const executeMappingStep = async () => {
      const configurationRecords = storage.configurationRecords.get();
      const currentPipelineId = storage.pipelineId.get();
      const currentPipelineStep = storage.pipelineStep.get();

      const {stepRecord, referentRecord} = getStepAndReferentRecord(configurationRecords, currentPipelineId, currentPipelineStep)

      // Get solid configuration
      const solidConfiguration = await getConfigurationRecordById(configurationRecords, 'solid-config');
      const storageDirectory = solidConfiguration['storageDirectory'];
      const solidSession = await getSolidSession();
      const podUrl = new URL(solidSession.webId).origin

      console.log('going to execute mapping step');
      const {provider, file} = referentRecord;
      console.log('provider: ' , provider)
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
        const outputConfiguration = stepRecord['output'];

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
      // Do we need to notify the user about something that happened during the execution?
      if(alertMessages.length === 0) {
        setExecutionStatus(EXECUTION_STATES.DONE);
      }
      else {
        setAlert(makeAlert('warning', alertMessages.join('\n')))
      }
    }

    const executeQueryStep = async()=> {
      console.log('@executeQueryStep')
      const configurationRecords = storage.configurationRecords.get();
      const currentPipelineId = storage.pipelineId.get();
      const currentPipelineStep = storage.pipelineStep.get();

      const {stepRecord, referentRecord} = getStepAndReferentRecord(configurationRecords, currentPipelineId, currentPipelineStep)

      // Get solid configuration
      const solidConfiguration = await getConfigurationRecordById(configurationRecords, 'solid-config');
      const storageDirectory = solidConfiguration['storageDirectory'];
      const solidSession = await getSolidSession();
      const podUrl = new URL(solidSession.webId).origin

      // Fetch query
      const response = await fetch(referentRecord['file'])
      const query = await readAndDecodeBody(response)

      // Store result on Solid Pod
      // Create URLs for generated result & corresponding provenance data
      const outputConfiguration = stepRecord['output'];
      const relativePathResult = [storageDirectory, outputConfiguration['result']].join('/')
      const urlResult = new URL(relativePathResult, podUrl).toString()
      const relativePathProv = [storageDirectory, outputConfiguration['provenanceResult']].join('/')
      const urlProv = new URL(relativePathProv, podUrl).toString()
      // Callback for the query result returned by the engine
      const onResult = async (result) => {
        setQueryResult(result)
        setExecutionStatus(EXECUTION_STATES.DONE)
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

        const params = {
          url: urlProv,
          content: strQueryProvenance,
          contentType: 'application/json',
          onSuccess: () =>
              setAlert(makeAlert('info', 'Successfully stored query provenance on Solid pod')),
          onError: (err) =>
              setAlert(makeWarningAlert(`Error while storing query provenance on Solid pod.
              Message: ${err.toString()}`))
        }
        await storeFileOnSolidPod(params)
      }

      const onError = (err) => {
        setExecutionStatus(EXECUTION_STATES.FAILED)
        setAlert(makeWarningAlert(`Error while executing query (query id: ${referentRecord['id']})\nError: ${err}`))
      }

      // Determine input sources to query
      const input = stepRecord['input'];

      const sources = input.map(inputFilename => urlJoin(podUrl, storageDirectory, inputFilename))
      // Run query
      await executeQuery(engine, query, sources, onResult,onMetadataAvailable,onError)
    }

    async function executeStep() {
      const configurationRecords = storage.configurationRecords.get();
      if(configurationRecords) {
        const currentPipelineId = storage.pipelineId.get();
        const currentPipelineStep = storage.pipelineStep.get();

        // Decide what type of step to execute
        const {referentRecord} = getStepAndReferentRecord(configurationRecords, currentPipelineId, currentPipelineStep)

        switch (referentRecord['type']) {

          case 'mapping':
            await executeMappingStep();
            break;

          case 'query':

            await executeQueryStep()
            break;

          default:
            throw Error('Unknown step record type: ' , referentRecord['type'])
        }

      }else {
        console.error('THE CONFIGURATION RECORDS IN STORAGE ARE NULL/UNDEFINED!??')
      }
    }

    // The execution state of a pipeline step can adopt multiple states.
    // Such a step can either be the execution of a mapping or query.
    switch (executionStatus) {
      case EXECUTION_STATES.PRECONDITION_CHECKS:
        console.log('useEffect: executionStatus changed and it changed to PRECONDITION_CHECKS');
        // All preconditions of the current pipeline step are being checked prior to starting its execution.
        // When precondition checks fail, they will be re-checked for a limited number of times (retries)
        preconditionChecks();
        break;

      case EXECUTION_STATES.INIT_EXECUTION:
        console.log('useEffect: executionStatus changed and it changed to INIT_EXECUTION');
        // This state occurs when the execution of a pipeline step is initialized.
        // Note: using Promise chainables because function App must be sync
        executeStep()
            .then(()=>{
              setExecutionStatus(EXECUTION_STATES.DONE);
              setAlert(makeAlert('info',
                  `Successfully executed step: ${storage.pipelineStep.get()}`));
            })
            .catch(err=>{
              setExecutionStatus(EXECUTION_STATES.FAILED);
              setAlert(makeWarningAlert());
            })
        break;
      case EXECUTION_STATES.EXECUTING:
        console.log('useEffect: executionStatus changed and it changed to EXECUTING');
        // TODO: evaluate whether this executing state is useful. Perhaps retrying the execution?

        break;
      case EXECUTION_STATES.DONE:
        console.log('useEffect: executionStatus changed and it changed to DONE');
        // The execution of the current pipeline step is done.
        break;
      default:
        console.log('unknown executionStatus: ', executionStatus)
    }


  }, [executionStatus])

  // Execution Iterator Index side-effect
  useEffect(()=>{
    console.log('useEffect: preconditionCheckIterations changed to: ', preconditionCheckIterations)

    if(!iterationPreconditionFunctions)
      return;

    if(!preconditionCheckIterations)
      return;

    async function trackPreconditionCheckIterations() {
      const {index,retries} = preconditionCheckIterations;
      const configurationRecords = storage.configurationRecords.get()

      // Get the maximumAuthorizationAttempts from configuration. If not present, use default (10)
      const {maximumAuthorizationAttempts} = filterRecordsByType(configurationRecords,'authorizationFlowConfiguration')
      const MAX_RETRIES = maximumAuthorizationAttempts ? parseInt(maximumAuthorizationAttempts) : 10;

      if(index < iterationPreconditionFunctions.length) {
        if(retries < MAX_RETRIES) {

          try {
            const {checkPrecondition, establishPrecondition} = iterationPreconditionFunctions[index];
            console.log('current number of retries: ', retries);
            const preconditionOk = await checkPrecondition()
            console.log('preconditionOk: ', preconditionOk);

            if(preconditionOk) {
              // Precondition met, we can go to the next execution iteration
              setPreconditionCheckIterations({index: index+1,  retries:0})
            }else {
              // Precondition not met
              await establishPrecondition();
              setPreconditionCheckIterations({index,  retries:retries+1})
            }
          } catch (err) {
            console.log('Error during precondition check... Error: ', err)
            // TODO: show alert
          }

        }else {
          console.warn('EXCEEDED MAX NUMBER OF RETRIES FOR CURRENT PRECONDITION CHECK')
          // TODO: show alert
        }
      }else {
        // Precondition check iterations finished
        console.log('precondition iterations FINISHED!');
        setExecutionStatus(EXECUTION_STATES.INIT_EXECUTION)

      }

    }
    trackPreconditionCheckIterations()

  },[preconditionCheckIterations])

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
            setExecutionStatus(EXECUTION_STATES.PRECONDITION_CHECKS)
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
