import './App.css';
import React, {useEffect, useState} from 'react';
import 'bootstrap/dist/css/bootstrap.min.css'
import Transfer from "./components/transfer";
import {Alert, Button} from 'react-bootstrap';
import {
  createOptionRecordsFromMetaData,
  executeMappingOnBackend,
  extractProviderFromMappingUrl,
  getConnectionUrlForProvider,
  handleLogout,
  handleQuery,
  handleSolidLogin,
  handleSolidLogout,
  handleSolidOperation,
  isProviderConnected,
  makeAlert,
  makeWarningAlert,
  readAndDecodeBody,
  STORAGE_KEYS
} from "./lib/helpers";
import CollapsibleCard from "./components/collapsible-card";
import {queryRecords} from "./lib/queries";
import {newEngine} from "prov4itdata-query-engine";

function App() {

  let [mappingOptions, setMappingOptions] = useState()
  let [mapping, setMapping] = useState( {
    content : localStorage.getItem(STORAGE_KEYS.MAPPING_CONTENT) || '',
    value : localStorage.getItem(STORAGE_KEYS.MAPPING_URL)
  })

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

  const updateMapping = (content, value) => {
    let provider = extractProviderFromMappingUrl(value);
    // Store in local storage
    localStorage.setItem(STORAGE_KEYS.MAPPING_URL, value);
    localStorage.setItem(STORAGE_KEYS.MAPPING_CONTENT, content)

    // Update mapping state
    setMapping({content, value, provider})
  }

  const clearMapping = () => updateMapping('',null)

  /**
   * Fetches mapping content & updates mapping state variable
   * @param url
   * @returns {Promise<void>}
   */
  const updateMappingFromUrl = async (url) => {
    fetch(url)
        .then(readAndDecodeBody)
        .then((data)=> updateMapping(data,url))
  }

  // Default mapping. this is the first option that will be rendered in the mapping selector)
  const defaultMapping = {'value' : 'default', 'label' : 'Select a mapping'}
  const updateMappings = (data) => {
    // keep the default option first
    setMappingOptions([defaultMapping, ...data])
  }

  // Fetch mappings-metadata using side-effects.
  // This side-effect will be executed only once.
  useEffect(() => {
    const fetchMappingsMetadata = async () => {
      const urlMetaData = "/rml/mappings-metadata.json";
      let mappingOptions = [];

      try {
        const response = await fetch(urlMetaData)

        if(response.status !== 200 )
          throw new Error('Error while getting the RML Mapping metadata...');

        const body = await readAndDecodeBody(response)
        const optionData = JSON.parse(body)
        mappingOptions = [...createOptionRecordsFromMetaData(optionData)]

      } catch (e) {
        console.log(e.message)
        const errMessage = e.message
        setAlert(makeWarningAlert(errMessage))

      } finally {
        updateMappings(mappingOptions)
      }
    }

    fetchMappingsMetadata();
  },[])


  /**
   * When triggered, the content of the selected mapping will be fetched and the state variable
   * mappingContent will be updated accordingly.
   * Note: the default mapping option does not refer to a mapping and will clear the mapping content.
   * @param {*} e : event triggered when the user selected a mapping from the MappingSelector.
   */
  const handleOnMappingChange = (e) => {

    if(e.target.value !== 'default') {
      // fetch contents and set the state variable mappingContent
      updateMappingFromUrl(e.target.value)
    } else
      // When selecting the default option (no mapping), clear the mapping.
      clearMapping()
  }

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
    }
  }


  /**
   * Handler that calls the backend to execute the selected mapping.
   * Upon success, this will result in the generated output and provenance being set.
   * @param {*} e
   */
  const handleOnExecute = async (e)=> {
    console.log("@handleOnExecute")

    if(localStorage.getItem(STORAGE_KEYS.EXECUTION_ATTEMPTS)) {
      let count = parseInt(localStorage.getItem(STORAGE_KEYS.EXECUTION_ATTEMPTS));
      count++;
      localStorage.setItem(STORAGE_KEYS.EXECUTION_ATTEMPTS, count.toString());
    }else {
      localStorage.setItem(STORAGE_KEYS.EXECUTION_ATTEMPTS, '1');
    }

    if(mapping.value !== null) {
      // Extract provider & filename from e.target.value
      const [, provider, filename] = String(mapping.value).split('/')

      // Provider connection
      const providerIsConnected = await isProviderConnected(provider)
      if(!providerIsConnected)
        await handleProviderConnection(provider);
      else {
        // Solid connected?
        let session = await handleSolidLogin();

        if(session) {
          // onSuccess callback for execute mapping call
          const onSuccess = async (response) => {
            if(response.status === 200){

              let jsonData = null;

              try {
                const body = await readAndDecodeBody(response)
                jsonData = JSON.parse(body)
              } catch (e) {
                const errMsg = `Error while processing result from RMLMapper. \n Error message: ${e}`
                console.error(errMsg)
                setAlert(makeWarningAlert(errMsg))
              }

              if(jsonData) {
                let alertMessages = []

                // Do we have RDF data?
                if (jsonData.rdf && Object.keys(jsonData.rdf).length)
                  setGeneratedOutput(jsonData.rdf)
                else
                  alertMessages.push('Generated RDF data is empty')

                // Do we have prov data?
                if(jsonData.prov && Object.keys(jsonData.prov).length)
                  setProvenance(jsonData.prov)
                else
                  alertMessages.push('Provenance data is empty')

                // If there are any messages, notify the user about them
                if(alertMessages.length)
                  setAlert(makeWarningAlert(alertMessages.join('\n')))
                else {
                  // No alert messages? That means we have both RDF & Provenance data, and we can push to Solid
                  // TODO: refactor solid stuff to separate lib
                  // Store the generated RDF onto the user's Solid POD
                  const solidRequestParams = {
                    method : 'PATCH',
                    body : `INSERT DATA {${jsonData.rdf}}`,
                    headers : {
                      'Content-Type': 'application/sparql-update'
                    }
                  }

                  await handleSolidOperation(solidRequestParams, (data)=>{
                    setAlert(makeAlert('info', 'Mapping executed successfully!'), 5000)
                    // Execution was successful so we can clean up the flags in the local storage
                    localStorage.removeItem(STORAGE_KEYS.EXECUTION_ATTEMPTS)
                  }, (err)=>{
                    // Notify the user about any errors
                    setAlert(makeWarningAlert('Error while executing request to Solid pod. Message: ' + e))
                  })

                }
              }

            } else {
              console.error(response)
              const errMessage = 'Something went wrong while executing the RML Mapping... ' +
                  '\n Response status code: ' + response.status;

              setAlert(makeWarningAlert(errMessage))
            }
          }

          // onError callback for execute mapping call
          const onError = (response) => {
            // TODO: handle onError
            console.error("request was unsuccessful: ", response)
          }

          // Call backend to execute the selected mapping
          await executeMappingOnBackend(provider, filename, onSuccess, onError)
        }
      }
    }else {
      setAlert(makeAlert('warning', (<p>You need to select a mapping first!</p>)))
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
    await handleSolidOperation({method:'GET'},async (response)=>{
      const body = await readAndDecodeBody(response)
      setSolidData(body)
    }, (err)=>{
      // Notify the user about any errors
      setAlert(makeWarningAlert('Error while fetching data from Solid pod. Message: ' + err))
    })
  }

  /**
   * Clears the current file on the Solid Pod.
   * @returns {Promise<void>}
   */
  const handleSolidClear = async () => {
    await handleSolidOperation({
      solidFetchParams: {method:'DELETE'},
      onError: (err)=>{
        // Notify the user about any errors
        setAlert(makeWarningAlert('Error while clearing data on Solid pod. Message: ' + err))
      }})
    setSolidData('')
  }

  const handleDownload = (data) => {
    console.log("@handleDownload -- data: " , data)
  }

  const trackSession = async () => {
    console.log('@trackSession')
    const ls = localStorage;
    const sk = STORAGE_KEYS;

    if(ls.getItem(sk.EXECUTION_ATTEMPTS)) {
      // if execution was initiated, handle the execution
      const executionAttemptCount = parseInt(ls.getItem(sk.EXECUTION_ATTEMPTS))
      console.log('execution attempts: '  ,executionAttemptCount)
      const MAX_EXECUTION_ATTEMPTS = 3
      if(executionAttemptCount < MAX_EXECUTION_ATTEMPTS)
        await handleOnExecute()
      else {
        setAlert(makeWarningAlert('Maximum execution attempts exceeded...'))
        ls.removeItem(sk.EXECUTION_ATTEMPTS)
      }
    }
  }

  const renderedAlert = alert ? <Alert variant={alert.variant} data-test="alert-box">{alert.body}</Alert> : null;

  useEffect(()=>{
    trackSession()
  }, [mapping])


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

  const queryCard = ( <CollapsibleCard header="Query" headerId="card-header-query">
    <>
      {
        Object.entries(queryRecords).map(([qId,qRecord])=>{

          return ( <Button
              onClick={
                async ()=>{

                  // getSources extracts the origin from the logged in user's webId and
                  // adds extra sources based on the origin
                  const getSources = (s) => {

                    // Source 0
                    const s0 = new URL(s.webId).origin
                    // Additional sources
                    const extraSources = [
                        `${s0}/private`,
                      `${s0}/private/imgur.ttl`,
                      `${s0}/private/flickr.ttl`,
                      `${s0}/private/google.ttl`,
                    ]

                    return [s0,...extraSources]
                  }
                  const queryResult = await handleQuery(engine, qRecord.query, getSources)


                  /////////////////////////////////////////////////////////////////////
                  // Handle the results

                  const option01 =async () => {
                    console.log('option01 result')
                    const completeResult = await engine.resultToString(queryResult,'text/turtle')
                    console.log('complete result awaited')
                  }


                  const option02 = async () => {
                    const onResult = (x) => {
                      console.log('onResult callback receives: ' )

                    }
                    // Are we dealing with a quadStream? (CONSTRUCT)
                    if(queryResult.quadStream) {
                      console.log('we have a quadStream')
                      queryResult.quadStream.addListener('data', onResult)
                    }

                    // Are we dealing with a bindingsStream (SELECT)
                    if(queryResult.bindingsStream) {
                      console.log('we have a bindingsStream')
                      queryResult.bindingsStream.addListener('data', onResult)
                    }
                  }

                  // option 1: await entire result (can induce performance issues)
                  // option01();
                  /**
                   * Error:
                   * Actor https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-init-sparql/^1.0.0/config/sets/sparql-serializers.json#myRdfSparqlSerializer can only handle quad streams
                   */


                  // option 2: individual results
                  // option02()


                }
              }>
            {qRecord.description}
          </Button>    )  })
      }
      <Button
          onClick={
            async ()=>{

              await handleSolidLogin()
            }
          }>
        SOLID LOGIN
      </Button>
    </>

  </CollapsibleCard>)



  return (
    <div className="App container">
      <h1>PROV4ITDaTa-DAPSI</h1>
      {renderedAlert}
      <Transfer
          mappings={mappingOptions}
          mappingContent={mapping.content}
          selectedOptionValue={mapping.value}
          generatedOutput={generatedOutput}
          provenance={provenance}
          solidData={solidData}
          handleOnExecute={handleOnExecute}
          handleOnMappingChange={handleOnMappingChange}
          handleSolidFetch={handleSolidFetch}
          handleSolidClear={handleSolidClear}
          handleSolidLogout={handleSolidLogout}
          handleDownload={handleDownload}
          data-cy="transfercomp"
      >
        {settingsCard}
        {queryCard}
      </Transfer>
    </div>
  );
}

export default App;
